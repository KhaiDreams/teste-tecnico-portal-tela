import axios from 'axios';
import ipaddr from 'ipaddr.js';
import { logger } from '../utils/logger';

export class WebContentService {
  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Check if a hostname/IP is internal or blocked
   */
  private static isBlockedHost(hostname: string): boolean {
    // Blocked hostnames
    const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
    if (blockedHostnames.includes(hostname)) {
      return true;
    }

    // Try to parse as IP address
    try {
      const addr = ipaddr.process(hostname);

      // Check for private/reserved ranges
      if (addr.kind() === 'ipv4') {
        const ipv4 = addr as ipaddr.IPv4;
        return (
          ipv4.isLoopback() || // 127.0.0.0/8
          ipv4.isPrivate() || // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
          ipv4.isLinkLocal() || // 169.254.0.0/16
          ipv4.isMulticast() || // 224.0.0.0/4
          ipv4.isReserved() || // Reserved range
          ipv4.isZero() // 0.0.0.0
        );
      }

      if (addr.kind() === 'ipv6') {
        const ipv6 = addr as ipaddr.IPv6;
        return (
          ipv6.isLoopback() ||
          ipv6.isPrivate() ||
          ipv6.isLinkLocal() ||
          ipv6.isMulticast() ||
          ipv6.isReserved()
        );
      }
    } catch (error) {
      // If not a valid IP, continue
    }

    return false;
  }

  async fetchContent(url: string): Promise<string> {
    try {
      // Validate URL format
      const urlObj = new URL(url);

      // Check for blocked hostnames/IPs (SSRF protection)
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
