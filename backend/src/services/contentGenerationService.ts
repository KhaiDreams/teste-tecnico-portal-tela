import { OpenAI } from 'openai';
import DOMPurify from 'dompurify';
import config from '../config/env';
import { logger } from '../utils/logger';
import { OpenAIResponse } from '../types/index';

// Simple DOMPurify initialization without jsdom
const purify = (content: string): string => {
  // Use DOMPurify library directly (works in Node without jsdom)
  try {
    const window = { document: {} } as any;
    const whitelist = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
      ALLOWED_ATTR: ['href', 'title'],
    };

    // Use dompurify with node-safe configuration
    return DOMPurify.sanitize(content, whitelist as any) || content;
  } catch {
    // If DOMPurify fails, perform basic sanitization
    return basicSanitize(content);
  }
};

// Fallback basic sanitization
const basicSanitize = (content: string): string => {
  return content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '') // Remove iframes
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: protocol
};

export class ContentGenerationService {
  private openai: OpenAI;

  constructor() {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  /**
   * Sanitize content from potential XSS attacks
   */
  private sanitizeContent(content: string): string {
    try {
      return purify(content);
    } catch (error) {
      logger.warn('Error sanitizing content, using basic sanitization', error);
      return basicSanitize(content);
    }
  }

  /**
   * Validate and extract JSON from OpenAI response
   */
  private parseOpenAIResponse(responseText: string): {
    title: string;
    content: string;
    excerpt: string;
  } {
    try {
      // Extract JSON from response - more robust parsing
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }

      let jsonString = jsonMatch[0];

      // Clean up problematic characters in JSON strings
      jsonString = jsonString.replace(/\n/g, ' ').replace(/\r/g, ' ');

      const parsedContent = JSON.parse(jsonString);

      // Validate required fields
      if (!parsedContent.title || typeof parsedContent.title !== 'string') {
        throw new Error('Missing or invalid title in OpenAI response');
      }
      if (!parsedContent.content || typeof parsedContent.content !== 'string') {
        throw new Error('Missing or invalid content in OpenAI response');
      }
      if (!parsedContent.excerpt || typeof parsedContent.excerpt !== 'string') {
        throw new Error('Missing or invalid excerpt in OpenAI response');
      }

      return {
        title: parsedContent.title.trim(),
        content: parsedContent.content.trim(),
        excerpt: parsedContent.excerpt.trim(),
      };
    } catch (error) {
      logger.error('Error parsing OpenAI response', error);
      throw error;
    }
  }

  async generateContent(
    originalContent: string,
    sourceUrl: string
  ): Promise<{
    title: string;
    content: string;
    excerpt: string;
    openaiResponse: OpenAIResponse;
  }> {
    try {
      logger.info('Starting content generation with OpenAI');

      // First API call: Generate new content based on original
      const generationPrompt = `
You are a professional content writer and SEO specialist.
Your task is to rewrite and improve the following content to make it more engaging, SEO-friendly, and valuable for readers.

Original Content:
${originalContent}

Please provide:
1. A compelling and SEO-optimized title (50-60 characters)
2. An improved, well-structured content that expands on the original (at least 500 words)
3. A brief meta-description/excerpt (150-160 characters)

Format your response as JSON with keys: title, content, excerpt

Make sure the content is original, non-plagiarized, and provides genuine value.`;

      logger.debug('Sending request to OpenAI API for content generation');

      const messageResponse = await (this.openai.chat.completions.create as any)({
        model: config.OPENAI_MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: generationPrompt,
          },
        ],
      });

      // Parse the response
      const responseText = messageResponse.choices[0].message.content || '';

      logger.debug('Parsing and validating OpenAI response');

      // Parse and validate response
      const parsedContent = this.parseOpenAIResponse(responseText);

      // Sanitize content to prevent XSS
      const sanitizedContent = this.sanitizeContent(parsedContent.content);
      const sanitizedTitle = this.sanitizeContent(parsedContent.title);
      const sanitizedExcerpt = this.sanitizeContent(parsedContent.excerpt);

      // Additional validation: max content size
      if (sanitizedContent.length > 100000) {
        throw new Error('Generated content exceeds maximum allowed size (100KB)');
      }

      logger.info('Content generation completed successfully');

      return {
        title: sanitizedTitle,
        content: sanitizedContent,
        excerpt: sanitizedExcerpt,
        openaiResponse: {
          id: messageResponse.id,
          object: 'chat.completion',
          created: messageResponse.created,
          model: messageResponse.model,
          choices: messageResponse.choices,
          usage: messageResponse.usage,
        } as any,
      };
    } catch (error) {
      logger.error('Content generation failed', error);
      throw error;
    }
  }
}

export const contentGenerationService = new ContentGenerationService();
