import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { databaseService } from '../database/connection';
import { webContentService } from '../services/webContentService';
import { contentGenerationService } from '../services/contentGenerationService';
import { wordPressService } from '../services/wordPressService';
import { logger } from '../utils/logger';

export class ContentController {
  /**
   * Generate content from a URL
   */
  async generatePost(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString(),
            details: errors.array(),
          },
        });
        return;
      }

      const { url } = req.body;
      logger.info(`Received content generation request for URL: ${url}`);

      // Step 1: Fetch original content
      const originalContent = await webContentService.fetchContent(url);

      // Step 2: Generate new content with OpenAI
      const { title, content, excerpt, openaiResponse } =
        await contentGenerationService.generateContent(originalContent, url);

      // Step 3: Save to database
      const post = await databaseService.createPost({
        source_url: url,
        original_content: originalContent,
        generated_content: content,
        title,
        excerpt,
        openai_response: openaiResponse,
      });

      logger.info(`Post created in database with ID: ${post.id}`);

      // Step 4: Send webhook to WordPress (async)
      this.publishToWordPressAsync(post.id, { title, content: content, excerpt, status: 'draft' });

      res.status(201).json({
        success: true,
        data: {
          id: post.id,
          status: 'pending',
          title,
          excerpt,
          content: content.substring(0, 500) + '...',
          source_url: url,
        },
      });
    } catch (error) {
      logger.error('Generate post error', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'GENERATION_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get post status
   */
  async getPostStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const postId = parseInt(id, 10);

      if (isNaN(postId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid post ID',
            code: 'INVALID_ID',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const post = await databaseService.getPost(postId);

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: post.id,
          status: post.status,
          title: post.title,
          wordpress_post_id: post.wordpress_post_id,
          created_at: post.created_at,
          updated_at: post.updated_at,
        },
      });
    } catch (error) {
      logger.error('Get post status error', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * List all generated posts
   */
  async listPosts(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const { posts, total } = await databaseService.getPosts(limit, offset);

      res.status(200).json({
        success: true,
        data: {
          posts: posts.map((post) => ({
            id: post.id,
            title: post.title,
            status: post.status,
            wordpress_post_id: post.wordpress_post_id,
            created_at: post.created_at,
          })),
          pagination: {
            limit,
            offset,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('List posts error', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const dbHealthy = await databaseService.healthCheck();
      const wpHealthy = await wordPressService.healthCheck();

      const allHealthy = dbHealthy && wpHealthy;

      res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        data: {
          status: allHealthy ? 'healthy' : 'degraded',
          database: dbHealthy ? 'ok' : 'error',
          wordpress: wpHealthy ? 'ok' : 'error',
        },
      });
    } catch (error) {
      logger.error('Health check error', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Health check failed',
          code: 'HEALTH_CHECK_ERROR',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Publish to WordPress asynchronously
   */
  private publishToWordPressAsync(
    postId: number,
    payload: { title: string; content: string; excerpt?: string; status?: string }
  ): void {
    setImmediate(async () => {
      try {
        const wordpressPostId = await wordPressService.publishPost({
          title: payload.title,
          content: payload.content,
          excerpt: payload.excerpt,
          status: (payload.status as any) || 'draft',
          content_generator_id: postId,
        });

        await databaseService.updatePostStatus(postId, 'published', wordpressPostId);
        logger.info(`Post ${postId} published to WordPress successfully`);
      } catch (error) {
        logger.error(`Failed to publish post ${postId} to WordPress`, error);
        await databaseService.updatePostStatus(postId, 'failed');
      }
    });
  }
}

export const contentController = new ContentController();
