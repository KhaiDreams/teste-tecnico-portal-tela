import axios from 'axios';
import config from '../config/env';
import { logger } from '../utils/logger';
import { WordPressPostPayload } from '../types/index';

export class WordPressService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1000; // Start with 1 second

  /**
   * Exponential backoff retry helper
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < retries - 1) {
          const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt); // exponential backoff
          logger.warn(`Retry attempt ${attempt + 1}/${retries} after ${delayMs}ms`, {
            error: lastError.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Max retries reached');
  }

  /**
   * Validate webhook response structure
   */
  private static validateWebhookResponse(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields
    if (typeof data.success !== 'boolean') {
      return false;
    }

    if (data.success !== true) {
      return false;
    }

    if (typeof data.post_id !== 'number' || data.post_id < 1) {
      return false;
    }

    return true;
  }

  async publishPost(payload: WordPressPostPayload): Promise<number> {
    const webhookUrl = `${config.WORDPRESS_URL}${config.WORDPRESS_PLUGIN_ENDPOINT}`;

    return this.retryWithBackoff(async () => {
      try {
        logger.info(`Sending webhook to WordPress: ${webhookUrl}`);

        const response = await axios.post(webhookUrl, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': config.WORDPRESS_WEBHOOK_SECRET,
          },
          maxRedirects: 2,
        });

        // Validate response structure and content
        if (!this.validateWebhookResponse(response.data)) {
          logger.error('Invalid webhook response format', {
            status: response.status,
            data: response.data,
          });
          throw new Error(
            `WordPress webhook returned invalid response: ${JSON.stringify(response.data)}`
          );
        }

        // Additional validation
        if (response.status !== 201 && response.status !== 200) {
          throw new Error(`Unexpected HTTP status: ${response.status}`);
        }

        logger.debug('WordPress webhook response', response.data);
        logger.info(`Post published successfully in WordPress with ID: ${response.data.post_id}`);

        return response.data.post_id;
      } catch (error) {
        if (error instanceof axios.AxiosError) {
          logger.error(`WordPress webhook failed: ${error.message}`, {
            status: error.response?.status,
            data: error.response?.data,
            url: webhookUrl,
          });
          throw new Error(`Failed to publish to WordPress: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async updatePostStatus(
    postId: number,
    status: 'publish' | 'draft' | 'pending'
  ): Promise<void> {
    const webhookUrl = `${config.WORDPRESS_URL}${config.WORDPRESS_PLUGIN_ENDPOINT}`;

    return this.retryWithBackoff(async () => {
      try {
        const payload = {
          action: 'update_status',
          post_id: postId,
          status,
        };

        const response = await axios.post(webhookUrl, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': config.WORDPRESS_WEBHOOK_SECRET,
          },
          maxRedirects: 2,
        });

        // Validate response
        if (!response.data || response.data.success !== true) {
          throw new Error(`Failed to update post status: ${JSON.stringify(response.data)}`);
        }

        logger.info(`Post ${postId} status updated to ${status}`);
      } catch (error) {
        logger.error(`Failed to update post status for post ${postId}`, error);
        throw error;
      }
    });
  }

  /**
   * Verify WordPress is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${config.WORDPRESS_URL}/wp-json/content-generator/v1/health`,
        {
          timeout: 5000,
        }
      );
      return response.status === 200 && response.data?.success === true;
    } catch (error) {
      logger.error('WordPress health check failed', error);
      return false;
    }
  }
}

export const wordPressService = new WordPressService();
