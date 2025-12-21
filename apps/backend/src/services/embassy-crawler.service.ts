/**
 * Embassy Crawler Service
 * Fetches and cleans HTML from embassy sources
 * Stores cleaned text in EmbassyPageContent
 */

import axios, { AxiosError } from 'axios';
import { load } from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';

const prisma = new PrismaClient();

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

        // Phase 4: Enhanced logging
        logInfo('[EmbassyCrawler] Successfully fetched and cleaned', {
          url,
          htmlLength: html.length,
          cleanedLength: cleaned.text.length,
          title: cleaned.title,
          httpStatus: response.status,
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length']
            ? parseInt(response.headers['content-length'])
            : undefined,
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
   * Clean HTML and extract main text content (Phase 4: Enhanced)
   *
   * Phase 4 improvements:
   * - Better removal of navigation, headers, footers, cookie banners
   * - Preserves sections with visa-related headings
   * - Better content extraction focusing on visa requirements
   */
  private static cleanHtml(html: string, metadata?: any): { text: string; title: string } {
    try {
      const $ = load(html);

      // Remove script and style tags
      $('script, style, noscript, iframe, embed, object').remove();

      // Phase 4: Enhanced removal of boilerplate
      // Remove navigation, headers, footers, ads, cookie banners
      $(
        'nav, header, footer, .nav, .navigation, .header, .footer, .sidebar, .ad, .advertisement, ' +
          '.cookie-banner, .cookie-consent, .cookie-notice, .popup, .modal, .overlay, ' +
          '.social-share, .share-buttons, .breadcrumb, .menu, .menu-item, ' +
          '.skip-link, .accessibility-menu, .language-selector'
      ).remove();

      // Phase 4: Remove repeated "contact us" and footer sections
      $('*').each((_, element) => {
        const $el = $(element);
        const text = $el.text().toLowerCase();
        // Remove elements that are clearly footer/contact sections
        if (
          text.includes('contact us') &&
          text.length < 500 && // Short contact sections
          ($el.is('div, section, aside') || $el.hasClass('contact') || $el.hasClass('footer'))
        ) {
          $el.remove();
        }
      });

      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // Phase 4: Try to find main content area, prioritizing visa-related sections
      let mainContent = '';
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '#content',
        '#main',
        '.page-content',
        '.visa-content', // Phase 4: Specific visa content selector
        '.application-content',
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

      // Phase 4: Preserve sections with visa-related headings
      // Look for headings that indicate important content
      const visaKeywords = [
        'required documents',
        'visa application requirements',
        'financial requirements',
        'documents to submit',
        'supporting documents',
        'application process',
        'visa fees',
        'processing time',
        'interview',
        'biometrics',
      ];

      // Extract text from sections with relevant headings
      let relevantSections = '';
      $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
        const headingText = $(heading).text().toLowerCase();
        for (const keyword of visaKeywords) {
          if (headingText.includes(keyword)) {
            // Get content following this heading
            let sectionContent = '';
            let next = $(heading).next();
            let depth = 0;
            while (next.length > 0 && depth < 10) {
              // Stop at next heading of same or higher level
              if (next.is('h1, h2, h3, h4, h5, h6')) {
                const nextTagName = next.prop('tagName');
                const headingTagName = $(heading).prop('tagName');
                if (!nextTagName || !headingTagName) break;
                const nextLevel = parseInt(nextTagName.charAt(1) || '0');
                const headingLevel = parseInt(headingTagName.charAt(1) || '0');
                if (nextLevel <= headingLevel) {
                  break;
                }
              }
              sectionContent += ' ' + next.text();
              next = next.next();
              depth++;
            }
            if (sectionContent.trim().length > 100) {
              relevantSections += '\n\n' + $(heading).text() + '\n' + sectionContent.trim();
            }
            break;
          }
        }
      });

      // Combine main content with relevant sections
      if (relevantSections) {
        mainContent = relevantSections + '\n\n' + mainContent;
      }

      // Clean up whitespace
      let cleanedText = mainContent
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
        .trim();

      // Phase 4: Log content quality metrics
      const hasVisaKeywords = visaKeywords.some((keyword) =>
        cleanedText.toLowerCase().includes(keyword)
      );
      const hasDocumentSection =
        /required documents|documents to submit|supporting documents/i.test(cleanedText);
      const hasFinancialSection = /financial|funds|bank statement|minimum balance/i.test(
        cleanedText
      );

      logInfo('[EmbassyCrawler] Content quality metrics', {
        textLength: cleanedText.length,
        hasVisaKeywords,
        hasDocumentSection,
        hasFinancialSection,
      });

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

  /**
   * Crawl source and store cleaned text in EmbassyPageContent
   * Updates EmbassySource status
   */
  static async crawlAndStore(
    sourceId: string,
    url: string,
    metadata?: any
  ): Promise<{ success: boolean; pageContentId?: string; error?: string }> {
    try {
      // Update source status to pending
      await prisma.embassySource.update({
        where: { id: sourceId },
        data: {
          lastStatus: 'pending',
          updatedAt: new Date(),
        },
      });

      // Crawl the source
      const crawled = await this.crawlSource(url, metadata);

      // Store in EmbassyPageContent
      const pageContent = await prisma.embassyPageContent.create({
        data: {
          sourceId,
          url: crawled.url,
          cleanedText: crawled.cleanedText,
          html: crawled.html, // Store HTML for debugging
          title: crawled.title,
          status: 'success',
          httpStatus: crawled.metadata.statusCode,
          metadata: JSON.stringify({
            fetchedAt: crawled.metadata.fetchedAt,
            contentType: crawled.metadata.contentType,
            contentLength: crawled.metadata.contentLength,
          }),
        },
      });

      // Update source status to success
      await prisma.embassySource.update({
        where: { id: sourceId },
        data: {
          lastStatus: 'success',
          lastError: null,
          lastFetchedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logInfo('[EmbassyCrawler] Successfully crawled and stored', {
        sourceId,
        pageContentId: pageContent.id,
        url,
        textLength: crawled.cleanedText.length,
      });

      return {
        success: true,
        pageContentId: pageContent.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Determine HTTP status if available
      let httpStatus: number | null = null;
      if (error instanceof AxiosError && error.response) {
        httpStatus = error.response.status;
      }

      // Store failed attempt in EmbassyPageContent
      try {
        await prisma.embassyPageContent.create({
          data: {
            sourceId,
            url,
            cleanedText: '',
            status: 'failed',
            httpStatus,
            errorMessage,
            metadata: JSON.stringify({
              fetchedAt: new Date().toISOString(),
            }),
          },
        });
      } catch (storeError) {
        logError(
          '[EmbassyCrawler] Failed to store error in EmbassyPageContent',
          storeError as Error,
          { sourceId, url }
        );
      }

      // Update source status to failed
      await prisma.embassySource.update({
        where: { id: sourceId },
        data: {
          lastStatus: 'failed',
          lastError: errorMessage,
          lastFetchedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Phase 4: Enhanced error logging
      logError('[EmbassyCrawler] Failed to crawl and store', error as Error, {
        sourceId,
        url,
        httpStatus,
        errorType: error instanceof AxiosError ? 'axios_error' : 'unknown_error',
        errorCode: error instanceof AxiosError ? error.code : undefined,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
