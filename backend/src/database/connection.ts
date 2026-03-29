import { Pool, QueryResult } from 'pg';
import config from '../config/env';
import { logger } from '../utils/logger';
import { GeneratedPost } from '../types/index';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Initialize database tables
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing database tables');

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS generated_posts (
          id SERIAL PRIMARY KEY,
          source_url VARCHAR(2048),
          original_content TEXT,
          generated_content TEXT,
          title VARCHAR(255),
          excerpt TEXT,
          openai_response JSONB,
          wordpress_post_id INT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS api_tokens (
          id SERIAL PRIMARY KEY,
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP
        );
      `);

      // Create indices
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_generated_posts_status
        ON generated_posts(status);
      `);

      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_generated_posts_created_at
        ON generated_posts(created_at DESC);
      `);

      logger.info('Database initialization completed');
    } catch (error) {
      logger.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Create a new generated post record
   */
  async createPost(data: {
    source_url: string;
    original_content: string;
    generated_content: string;
    title: string;
    excerpt?: string;
    openai_response?: object;
  }): Promise<GeneratedPost> {
    const query = `
      INSERT INTO generated_posts
        (source_url, original_content, generated_content, title, excerpt, openai_response)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    try {
      const result = await this.pool.query(query, [
        data.source_url,
        data.original_content,
        data.generated_content,
        data.title,
        data.excerpt || null,
        data.openai_response ? JSON.stringify(data.openai_response) : null,
      ]);

      logger.info(`Created post record with ID: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create post', error);
      throw error;
    }
  }

  /**
   * Get post by ID
   */
  async getPost(id: number): Promise<GeneratedPost | null> {
    const query = 'SELECT * FROM generated_posts WHERE id = $1;';

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get post', error);
      throw error;
    }
  }

  /**
   * Update post status
   */
  async updatePostStatus(
    id: number,
    status: 'pending' | 'published' | 'failed',
    wordpressPostId?: number
  ): Promise<void> {
    const query = `
      UPDATE generated_posts
      SET status = $1, wordpress_post_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `;

    try {
      await this.pool.query(query, [status, wordpressPostId || null, id]);
      logger.info(`Updated post ${id} status to ${status}`);
    } catch (error) {
      logger.error('Failed to update post status', error);
      throw error;
    }
  }

  /**
   * Get all posts with pagination
   */
  async getPosts(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: GeneratedPost[]; total: number }> {
    try {
      const countResult = await this.pool.query('SELECT COUNT(*) as count FROM generated_posts;');
      const total = parseInt(countResult.rows[0].count, 10);

      const query = `
        SELECT * FROM generated_posts
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
      `;

      const result = await this.pool.query(query, [limit, offset]);
      return { posts: result.rows, total };
    } catch (error) {
      logger.error('Failed to get posts', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1;');
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();
