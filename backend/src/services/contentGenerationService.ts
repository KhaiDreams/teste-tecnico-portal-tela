import { OpenAI } from 'openai';
import DOMPurify from 'dompurify';
import config from '../config/env';
import { logger } from '../utils/logger';
import { OpenAIResponse } from '../types/index';

const MIN_ARTICLE_WORDS = 380;
const TARGET_ARTICLE_WORDS = '450-650';
const MIN_PARAGRAPHS = 6;

// Simple DOMPurify initialization without jsdom
const purify = (content: string): string => {
  try {
    const whitelist = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
      ALLOWED_ATTR: ['href', 'title'],
    };

    return String(DOMPurify.sanitize(content, whitelist as any) || content);
  } catch {
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

  private stripHtml(content: string): string {
    return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private countWords(content: string): number {
    const plainText = this.stripHtml(content);
    if (!plainText) {
      return 0;
    }

    return plainText.split(/\s+/).filter(Boolean).length;
  }

  private hasArticleStructure(content: string): boolean {
    const paragraphCount = (content.match(/<p[\s>]/gi) || []).length;
    const h2Count = (content.match(/<h2[\s>]/gi) || []).length;
    const h3Count = (content.match(/<h3[\s>]/gi) || []).length;
    return paragraphCount >= MIN_PARAGRAPHS && h2Count >= 2 && h3Count >= 1;
  }

  private isQualityAcceptable(content: string): boolean {
    return this.countWords(content) >= MIN_ARTICLE_WORDS && this.hasArticleStructure(content);
  }

  private normalizeWhitespace(value: string): string {
    return value
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private plainTextToParagraphs(text: string): string[] {
    const normalized = this.normalizeWhitespace(text);
    const byBlankLine = normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);

    if (byBlankLine.length >= MIN_PARAGRAPHS) {
      return byBlankLine;
    }

    const sentences = normalized
      .replace(/\n/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length === 0) {
      return [];
    }

    const chunks: string[] = [];
    const chunkSize = 2;
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join(' '));
    }

    return chunks;
  }

  private forceEditorialHtml(rawContent: string): string {
    const normalized = this.normalizeWhitespace(rawContent)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/^###\s+(.+)$/gim, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gim, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gim, '')
      .trim();

    const hasAnyHtml = /<p[\s>]|<h2[\s>]|<h3[\s>]/i.test(normalized);
    if (hasAnyHtml) {
      return normalized;
    }

    const paragraphs = this.plainTextToParagraphs(normalized);
    if (paragraphs.length === 0) {
      return `<p>${normalized}</p>`;
    }

    const introOne = paragraphs[0] || '';
    const introTwo = paragraphs[1] || '';
    const middleOne = paragraphs.slice(2, 5);
    const middleTwo = paragraphs.slice(5, 8);
    const tail = paragraphs.slice(8);
    const conclusion = tail.length > 0 ? tail.join(' ') : paragraphs.slice(-2).join(' ');

    const htmlParts: string[] = [];
    htmlParts.push(`<p>${introOne}</p>`);
    if (introTwo) {
      htmlParts.push(`<p>${introTwo}</p>`);
    }

    htmlParts.push('<h2>Contexto e pontos principais</h2>');
    middleOne.forEach((paragraph) => htmlParts.push(`<p>${paragraph}</p>`));

    htmlParts.push('<h2>Aplicacoes praticas</h2>');
    htmlParts.push('<h3>Boas praticas recomendadas</h3>');
    middleTwo.forEach((paragraph) => htmlParts.push(`<p>${paragraph}</p>`));

    htmlParts.push('<h2>Conclusao</h2>');
    if (conclusion) {
      htmlParts.push(`<p>${conclusion}</p>`);
    }

    return htmlParts.join('\n');
  }

  private buildGenerationPrompt(originalContent: string): string {
    return `
Você é um redator profissional de conteúdo editorial e SEO.
Reescreva a fonte abaixo em formato de artigo para blog.

Fonte:
${originalContent}

Regras obrigatórias:
- Escreva TODO o resultado em português do Brasil (pt-BR).
- Produza conteúdo original, sem plágio e fiel aos fatos da fonte.
- Não mencione IA, modelo, prompt ou processo interno.
- O campo "content" deve estar em HTML válido para WordPress, com tags <p>, <h2>, <h3>, <ul>, <li> quando útil.
- O artigo deve parecer um texto de jornalista profissional, com linguagem natural, contextualizacao e conclusao clara.
- Estrutura mínima:
  1) introdução com 2 parágrafos curtos;
  2) ao menos 2 seções com <h2>;
  3) ao menos 1 subseção com <h3>;
  4) conclusão com chamada prática.
- Distribua o texto em 7 a 10 parágrafos no total, evitando bloco unico.
- Cada parágrafo deve ter no máximo 2-4 frases.
- Tamanho alvo do artigo: ${TARGET_ARTICLE_WORDS} palavras.
- O artigo precisa ter no mínimo ${MIN_ARTICLE_WORDS} palavras.
- Excerpt entre 140 e 180 caracteres.

Retorne APENAS JSON válido com as chaves:
{
  "title": "string",
  "content": "string em HTML",
  "excerpt": "string"
}
`;
  }

  private buildRevisionPrompt(draftTitle: string, draftContent: string, draftExcerpt: string): string {
    return `
Melhore o artigo abaixo para ficar mais completo e bem estruturado.

Título atual:
${draftTitle}

Conteúdo atual:
${draftContent}

Excerpt atual:
${draftExcerpt}

Objetivo obrigatório da revisão:
- manter português do Brasil (pt-BR);
- manter coerência factual;
- manter tema principal;
- transformar em artigo com qualidade editorial;
- no mínimo ${MIN_ARTICLE_WORDS} palavras;
- incluir pelo menos ${MIN_PARAGRAPHS} parágrafos <p>, 2 títulos <h2> e 1 subtítulo <h3>;
- evitar blocão único, criar leitura escaneável.
- escrever com tom jornalístico e profissional.

Retorne APENAS JSON válido com:
{
  "title": "string",
  "content": "string em HTML",
  "excerpt": "string"
}
`;
  }

  private async requestOpenAIJson(prompt: string): Promise<{
    parsed: { title: string; content: string; excerpt: string };
    raw: any;
  }> {
    const messageResponse = await (this.openai.chat.completions.create as any)({
      model: config.OPENAI_MODEL,
      max_tokens: 2400,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = messageResponse.choices[0]?.message?.content || '';
    const parsed = this.parseOpenAIResponse(responseText);
    return { parsed, raw: messageResponse };
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
      const cleanResponse = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }

      const parsedContent = JSON.parse(jsonMatch[0]);

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

      logger.debug('Sending initial content generation request to OpenAI API');
      const initialPrompt = this.buildGenerationPrompt(originalContent);
      const firstResponse = await this.requestOpenAIJson(initialPrompt);
      let parsedContent = firstResponse.parsed;
      let finalRawResponse = firstResponse.raw;

      if (!this.isQualityAcceptable(parsedContent.content)) {
        logger.info('Generated content below quality threshold; requesting structured revision');
        const revisionPrompt = this.buildRevisionPrompt(
          parsedContent.title,
          parsedContent.content,
          parsedContent.excerpt
        );
        const revisedResponse = await this.requestOpenAIJson(revisionPrompt);
        parsedContent = revisedResponse.parsed;
        finalRawResponse = revisedResponse.raw;
      }

      // Deterministic fallback to avoid single-block content
      parsedContent.content = this.forceEditorialHtml(parsedContent.content);

      // Sanitize content to prevent XSS
      const sanitizedContent = this.sanitizeContent(parsedContent.content);
      const sanitizedTitle = this.stripHtml(this.sanitizeContent(parsedContent.title));
      const sanitizedExcerpt = this.stripHtml(this.sanitizeContent(parsedContent.excerpt));

      if (!this.isQualityAcceptable(sanitizedContent)) {
        logger.warn(
          `Content generated below target quality: words=${this.countWords(sanitizedContent)}, sourceUrl=${sourceUrl}`
        );
      }

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
          id: finalRawResponse.id,
          object: 'chat.completion',
          created: finalRawResponse.created,
          model: finalRawResponse.model,
          choices: finalRawResponse.choices,
          usage: finalRawResponse.usage,
        } as any,
      };
    } catch (error) {
      logger.error('Content generation failed', error);
      throw error;
    }
  }
}

export const contentGenerationService = new ContentGenerationService();
