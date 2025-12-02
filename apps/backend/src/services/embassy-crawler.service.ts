/**
 * Embassy Crawler Service
 * Fetches and cleans HTML from embassy sources
 */

import axios, { AxiosError } from 'axios';
import { load } from 'cheerio';
import { logInfo, logError, logWarn } from '../middleware/logger';

/**
 * Crawled page data
 */
export interface CrawledPageData {
  url: string;
  html: string;
  cleanedText: string;
  title: string;
  metadata: {
    fetchedAt: string;
    statusCode: number;
    contentType?: string;
    contentLength?: number;
  };
}

/**
 * Embassy Crawler Service
 */
export class EmbassyCrawlerService {
  private static readonly REQUEST_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 2000; // 2 seconds

  /**
   * Fetch and clean HTML from a URL
   */
  static async crawlSource(url: string, metadata?: any): Promise<CrawledPageData> {
    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        logInfo('[EmbassyCrawler] Fetching URL', {
          url,
          attempt,
          maxRetries: this.MAX_RETRIES,
        });

        const response = await axios.get(url, {
          timeout: this.REQUEST_TIMEOUT_MS,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
        });

        const html = response.data;
        const cleaned = this.cleanHtml(html, metadata);

        logInfo('[EmbassyCrawler] Successfully fetched and cleaned', {
          url,
          htmlLength: html.length,
          cleanedLength: cleaned.text.length,
          title: cleaned.title,
        });

        return {
          url,
          html,
          cleanedText: cleaned.text,
          title: cleaned.title,
          metadata: {
            fetchedAt: new Date().toISOString(),
            statusCode: response.status,
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length']
              ? parseInt(response.headers['content-length'])
              : undefined,
          },
        };
      } catch (error) {
        lastError = error as Error;

        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // HTTP error (4xx, 5xx)
          logWarn('[EmbassyCrawler] HTTP error', {
            url,
            attempt,
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
          });

          // Don't retry on 4xx errors (client errors)
          if (axiosError.response.status >= 400 && axiosError.response.status < 500) {
            throw new Error(
              `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`
            );
          }
        } else if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
          // Timeout
          logWarn('[EmbassyCrawler] Timeout', { url, attempt });

          if (attempt < this.MAX_RETRIES) {
            await this.delay(this.RETRY_DELAY_MS * attempt); // Exponential backoff
            continue;
          }
        } else {
          // Network error
          logWarn('[EmbassyCrawler] Network error', {
            url,
            attempt,
            error: axiosError.message,
          });

          if (attempt < this.MAX_RETRIES) {
            await this.delay(this.RETRY_DELAY_MS * attempt);
            continue;
          }
        }

        // If we get here, we've exhausted retries or hit a non-retryable error
        throw lastError;
      }
    }

    throw lastError || new Error('Failed to fetch URL after retries');
  }

  /**
   * Clean HTML and extract main text content
   */
  private static cleanHtml(html: string, metadata?: any): { text: string; title: string } {
    try {
      const $ = load(html);

      // Remove script and style tags
      $('script, style, noscript, iframe, embed, object').remove();

      // Remove navigation, headers, footers, ads
      $(
        'nav, header, footer, .nav, .navigation, .header, .footer, .sidebar, .ad, .advertisement, .cookie-banner, .cookie-consent, .popup, .modal'
      ).remove();

      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // Try to find main content area
      let mainContent = '';
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '#content',
        '#main',
        '.page-content',
        'body',
      ];

      for (const selector of contentSelectors) {
        const content = $(selector).first();
        if (content.length > 0 && content.text().trim().length > 500) {
          mainContent = content.text();
          break;
        }
      }

      // Fallback: use body if no main content found
      if (!mainContent) {
        mainContent = $('body').text();
      }

      // Clean up whitespace
      let cleanedText = mainContent
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
        .trim();

      // Limit length (keep first 50000 characters to avoid token limits)
      if (cleanedText.length > 50000) {
        cleanedText = cleanedText.substring(0, 50000) + '... [truncated]';
        logWarn('[EmbassyCrawler] Text truncated', {
          originalLength: mainContent.length,
          truncatedLength: cleanedText.length,
        });
      }

      return { text: cleanedText, title };
    } catch (error) {
      logError('[EmbassyCrawler] Error cleaning HTML', error as Error);
      // Fallback: return raw text
      return {
        text: html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 50000),
        title: 'Untitled',
      };
    }
  }

  /**
   * Delay helper for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
