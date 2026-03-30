import axios from 'axios';
import ipaddr from 'ipaddr.js';
import { logger } from '../utils/logger';

export class WebContentService {
  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    '0.0.0.0',
    '127.0.0.1',
    '::1',
    '[::1]',
  ]);

  /**
   * Check if a hostname/IP is internal or blocked
   */
  private static isBlockedHost(hostname: string): boolean {
    const normalizedHost = hostname.trim().toLowerCase();

    if (WebContentService.BLOCKED_HOSTNAMES.has(normalizedHost)) {
      return true;
    }

    if (normalizedHost.endsWith('.local') || normalizedHost.endsWith('.internal')) {
      return true;
    }

    try {
      if (!ipaddr.isValid(normalizedHost)) {
        return false;
      }

      const addr = ipaddr.parse(normalizedHost);
      const range = addr.range();

      // Any non-public range is blocked for SSRF protection
      const blockedRanges = new Set([
        'unspecified',
        'broadcast',
        'multicast',
        'linkLocal',
        'loopback',
        'private',
        'uniqueLocal',
        'reserved',
        'carrierGradeNat',
        'ipv4Mapped',
      ]);

      return blockedRanges.has(range);
    } catch {
      return true;
    }
  }

  async fetchContent(url: string): Promise<string> {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.toLowerCase();

      if (protocol !== 'http:' && protocol !== 'https:') {
        throw new Error('Only http/https URLs are allowed');
      }

      if (urlObj.username || urlObj.password) {
        throw new Error('URLs with embedded credentials are not allowed');
      }

      if (WebContentService.isBlockedHost(urlObj.hostname)) {
        throw new Error(`URL host is not accessible: ${urlObj.hostname}. Internal URLs are blocked.`);
      }

      logger.info(`Fetching content from URL: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000, // 10 seconds
        headers: {
          'User-Agent': WebContentService.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        maxContentLength: 5 * 1024 * 1024, // 5 MB max
      });

      const html = response.data;

      // Basic HTML to text conversion (remove script, style, and HTML tags)
      let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();

      if (!text || text.length < 100) {
        throw new Error('Fetched content is too short or empty');
      }

      logger.info(`Successfully fetched ${text.length} characters from URL`);
      return text;
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        logger.error(`Failed to fetch URL: ${error.message}`, {
          status: error.response?.status,
          url,
        });
        throw new Error(`Failed to fetch URL: ${error.message}`);
      }
      if (error instanceof Error) {
        logger.error(`URL validation error: ${error.message}`, { url });
        throw error;
      }
      throw error;
    }
  }

  /**
   * Extract main content (paragraph text) from fetched content
   */
  extractMainContent(html: string): string {
    try {
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s\s+/g, ' ')
        .trim();

      const lines = text.split('\n').filter((line) => line.trim().length > 10);
      return lines.slice(0, 50).join('\n'); // Get first 50 substantial lines
    } catch (error) {
      logger.error('Error extracting main content', error);
      throw error;
    }
  }
}

export const webContentService = new WebContentService();
