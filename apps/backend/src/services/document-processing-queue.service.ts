/**
 * Document Processing Queue Service
 * Bull queue for processing documents after upload (AI validation, classification, progress update)
 * This allows the upload endpoint to return quickly while heavy processing happens in background
 */

import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * Job data interface
 */
interface DocumentProcessingJobData {
  documentId: string;
  applicationId: string;
  userId: string;
}

/**
 * Document Processing Queue Service
 */
export class DocumentProcessingQueueService {
  private static queue: Queue.Queue<DocumentProcessingJobData> | null = null;

  /**
   * Initialize the queue
   */
  static initialize(): Queue.Queue<DocumentProcessingJobData> {
    if (this.queue) {
      return this.queue;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.queue = new Queue<DocumentProcessingJobData>('document-processing', {
      connection: redisUrl,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
        timeout: 5 * 60 * 1000, // 5 minutes max per job (prevents infinite hangs)
      },
    });

    // Set up processor with configurable concurrency
    const concurrency = parseInt(process.env.DOC_QUEUE_CONCURRENCY || '3', 10);
    this.queue.process(concurrency, async (job) => {
      const { documentId, applicationId, userId } = job.data;
      const jobStartTime = Date.now();

      logInfo('[DocumentProcessingQueue] Processing job', {
        documentId,
        applicationId,
        userId,
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      });

      try {
        // Step 1: Load document from DB
        const document = await prisma.userDocument.findUnique({
          where: { id: documentId },
          include: {
            application: {
              include: {
                country: true,
                visaType: true,
              },
            },
          },
        });

        if (!document) {
          throw new Error(`Document not found: ${documentId}`);
        }

        // Step 2: Kick off heavy tasks in parallel (Image Analysis + OCR warm-up)
        const imageAnalysisPromise = (async () => {
          try {
            const { ImageAnalysisService } = await import('./image-analysis.service');

            // Only analyze if not already analyzed
            if (!document.imageAnalysisResult) {
              const imageAnalysisResult = await ImageAnalysisService.analyzeImageFromUrl(
                document.fileUrl,
                document.fileName,
                undefined, // MIME type will be detected from fileName
                {
                  detectSignatures: true,
                  detectStamps: true,
                  checkQuality: true,
                }
              );

              // Save image analysis results to database
              await prisma.userDocument.update({
                where: { id: documentId },
                data: {
                  imageAnalysisResult: imageAnalysisResult as any,
                  hasSignature: imageAnalysisResult.hasSignature,
                  hasStamp: imageAnalysisResult.hasStamp,
                  imageQualityScore: imageAnalysisResult.imageQualityScore,
                },
              });

              logInfo('[DocumentProcessingQueue] Image analysis completed', {
                documentId,
                hasSignature: imageAnalysisResult.hasSignature,
                hasStamp: imageAnalysisResult.hasStamp,
                qualityScore: imageAnalysisResult.imageQualityScore,
                issuesCount: imageAnalysisResult.issues.length,
              });
            }
          } catch (imageAnalysisError) {
            // Non-blocking: log but continue with validation
            logWarn('[DocumentProcessingQueue] Image analysis failed (non-blocking)', {
              documentId,
              error:
                imageAnalysisError instanceof Error
                  ? imageAnalysisError.message
                  : String(imageAnalysisError),
            });
          }
        })();

        const ocrWarmupPromise = (async () => {
          try {
            const { DocumentClassifierService } = await import('./document-classifier.service');
            await DocumentClassifierService.extractTextForDocument({
              id: document.id,
              fileName: document.fileName,
              fileUrl: document.fileUrl,
              mimeType: undefined,
            });
          } catch (ocrError) {
            logWarn('[DocumentProcessingQueue] OCR warm-up failed (non-blocking)', {
              documentId,
              error: ocrError instanceof Error ? ocrError.message : String(ocrError),
            });
          }
        })();

        await Promise.allSettled([imageAnalysisPromise, ocrWarmupPromise]);
        // Emit progress update after preprocessing steps
        try {
          const { websocketService } = await import('./websocket.service');
          websocketService.emitDocumentStatusUpdate(applicationId, documentId, 'pending', {
            stage: 'pre_validation',
            progress: 50,
          } as any);
        } catch (wsPreError) {
          logWarn('[DocumentProcessingQueue] Failed to emit preprocessing progress', {
            documentId,
            error: wsPreError instanceof Error ? wsPreError.message : String(wsPreError),
          });
        }

        // Step 3: AI Validation (if not already done)
        if (document.status === 'pending' && !document.verifiedByAI) {
          try {
            const { validateDocumentWithAI, saveValidationResultToDocument } = await import(
              './document-validation.service'
            );

            // Try to find matching checklist item (use cached checklist only; avoid regeneration here)
            let checklistItem: any = undefined;
            try {
              const cachedChecklist = await prisma.documentChecklist.findUnique({
                where: { applicationId },
                select: { status: true, checklistData: true },
              });

              if (cachedChecklist?.status === 'ready' && cachedChecklist.checklistData) {
                const parsed = JSON.parse(cachedChecklist.checklistData);
                const items = Array.isArray(parsed) ? parsed : parsed.items || [];
                checklistItem = items.find(
                  (item: any) =>
                    item.documentType === document.documentType ||
                    item.documentType?.toLowerCase() === document.documentType?.toLowerCase()
                );
              } else {
                logInfo('[DocumentProcessingQueue] Checklist not ready, skipping cached lookup', {
                  applicationId,
                  checklistStatus: cachedChecklist?.status || 'missing',
                });
              }
            } catch (checklistError) {
              // Checklist lookup is optional
              logWarn('[DocumentProcessingQueue] Checklist lookup failed (non-blocking)', {
                documentId,
                error:
                  checklistError instanceof Error ? checklistError.message : String(checklistError),
              });
            }

            // Increment rate limit counter for document validation
            try {
              const { incrementDocumentValidationCount } = await import(
                '../middleware/checklist-rate-limit'
              );
              await incrementDocumentValidationCount(userId);
            } catch (rateLimitError) {
              // Non-blocking: log but continue
              logWarn('[DocumentProcessingQueue] Rate limit increment failed (non-blocking)', {
                documentId,
                error:
                  rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
              });
            }

            // Run AI validation
            const aiResult = await validateDocumentWithAI({
              document: {
                id: document.id,
                documentType: document.documentType,
                documentName: document.documentName,
                fileName: document.fileName,
                fileUrl: document.fileUrl,
                uploadedAt: document.uploadedAt,
                expiryDate: document.expiryDate,
              },
              checklistItem: checklistItem
                ? {
                    documentType: checklistItem.documentType || document.documentType,
                    name: checklistItem.name,
                    description: checklistItem.description,
                    whereToObtain: checklistItem.whereToObtain,
                  }
                : undefined,
              application: {
                id: document.application.id,
                country: {
                  name: document.application.country.name,
                  code: document.application.country.code || '',
                },
                visaType: {
                  name: document.application.visaType.name,
                },
              },
              countryName: document.application.country.name,
              visaTypeName: document.application.visaType.name,
            });

            // Save validation result
            await saveValidationResultToDocument(document.id, aiResult);

            // Get mapped DB status for logging clarity
            const { mapAIStatusToDbStatus } = await import('./document-validation.service');
            const dbStatus = mapAIStatusToDbStatus(aiResult.status);

            logInfo('[DocumentProcessingQueue] AI validation completed', {
              documentId,
              aiStatus: aiResult.status, // AI-level status (verified/rejected/needs_review/uncertain)
              dbStatus, // Mapped database status (pending/verified/rejected)
              verifiedByAI: aiResult.verifiedByAI,
              confidence: aiResult.confidence,
              hasProblems: (aiResult.problems ?? []).length > 0,
            });
          } catch (validationError: any) {
            // Log but continue - validation failure shouldn't block other processing
            logError('[DocumentProcessingQueue] AI validation failed', validationError as Error, {
              documentId,
            });

            // Alert on GPT API errors
            try {
              const { alertGPTAPIError } = await import('./verification-alerts.service');
              alertGPTAPIError(documentId, validationError as Error, 0);
            } catch (alertError) {
              // Non-blocking
            }

            // Set fallback status
            await prisma.userDocument.update({
              where: { id: documentId },
              data: {
                status: 'pending',
                verifiedByAI: false,
                aiConfidence: 0.0,
                aiNotesUz: "Hujjatni tekshirishning imkoni bo'lmadi. Iltimos yana yuklang.",
                aiNotesRu: 'Не удалось проверить документ. Пожалуйста, загрузите снова.',
                aiNotesEn: 'Could not validate document. Please upload again.',
              },
            });
          }
        }

        // Step 3: Document Classification (respects explicit types)
        try {
          const { DocumentClassifierService } = await import('./document-classifier.service');
          await DocumentClassifierService.analyzeAndUpdateDocument(documentId);
        } catch (classificationError: any) {
          // Log but continue - classification failure shouldn't block progress update
          logWarn('[DocumentProcessingQueue] Classification failed (non-blocking)', {
            documentId,
            error:
              classificationError instanceof Error
                ? classificationError.message
                : String(classificationError),
          });
        }

        // Step 4: Update application progress (reuses existing checklist, no AI generation)
        try {
          const { ApplicationsService } = await import('./applications.service');
          await ApplicationsService.updateProgressFromDocuments(applicationId);
          logInfo('[DocumentProcessingQueue] Progress updated', {
            applicationId,
            documentId,
          });
        } catch (progressError: any) {
          // Log but don't fail - progress update failure shouldn't block the job
          logWarn('[DocumentProcessingQueue] Progress update failed (non-blocking)', {
            applicationId,
            documentId,
            error: progressError instanceof Error ? progressError.message : String(progressError),
          });
        }

        const jobDuration = Date.now() - jobStartTime;

        // Alert on slow processing
        try {
          const { alertSlowProcessing } = await import('./verification-alerts.service');
          alertSlowProcessing(documentId, jobDuration, 60000); // 60s threshold
        } catch (alertError) {
          // Non-blocking
        }
        logInfo('[DocumentProcessingQueue] Job completed successfully', {
          documentId,
          applicationId,
          jobId: job.id,
          duration: `${jobDuration}ms`,
        });

        return { success: true, documentId, applicationId };
      } catch (error: any) {
        const jobDuration = Date.now() - jobStartTime;

        // Alert on slow processing
        try {
          const { alertSlowProcessing } = await import('./verification-alerts.service');
          alertSlowProcessing(documentId, jobDuration, 60000); // 60s threshold
        } catch (alertError) {
          // Non-blocking
        }

        // Check if this is a timeout error
        const isTimeout =
          error?.message?.toLowerCase().includes('timeout') ||
          error?.code === 'ETIMEDOUT' ||
          jobDuration > 4 * 60 * 1000; // Job ran for more than 4 minutes

        logError('[DocumentProcessingQueue] Job failed', error as Error, {
          documentId,
          applicationId,
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          duration: `${jobDuration}ms`,
          isTimeout,
        });

        // If timeout or last attempt, set fallback status
        if (isTimeout || job.attemptsMade + 1 >= 3) {
          try {
            await prisma.userDocument.update({
              where: { id: documentId },
              data: {
                status: 'pending',
                verifiedByAI: false,
                aiConfidence: 0.0,
                aiNotesUz: isTimeout
                  ? "Hujjatni tekshirish vaqti tugadi. Iltimos yana yuklang yoki qo'lda tekshiring."
                  : "Hujjatni tekshirishning imkoni bo'lmadi. Iltimos yana yuklang.",
                aiNotesRu: isTimeout
                  ? 'Время проверки документа истекло. Пожалуйста, загрузите снова или проверьте вручную.'
                  : 'Не удалось проверить документ. Пожалуйста, загрузите снова.',
                aiNotesEn: isTimeout
                  ? 'Document verification timed out. Please upload again or verify manually.'
                  : 'Could not validate document. Please upload again.',
                verificationNotes: isTimeout
                  ? 'Verification timed out after multiple attempts. Please try uploading again.'
                  : 'Verification failed after multiple attempts. Please try uploading again.',
              },
            });
            logInfo('[DocumentProcessingQueue] Set fallback status for failed document', {
              documentId,
              isTimeout,
              attempts: job.attemptsMade + 1,
            });
          } catch (updateError) {
            logError(
              '[DocumentProcessingQueue] Failed to set fallback status',
              updateError as Error,
              {
                documentId,
              }
            );
          }
        }

        // Re-throw to trigger retry mechanism (unless it's the last attempt)
        throw error;
      }
    });

    // Set up error handling
    this.queue.on('error', (error) => {
      logError('[DocumentProcessingQueue] Queue error', error as Error);
    });

    this.queue.on('failed', (job, err) => {
      logError('[DocumentProcessingQueue] Job failed permanently', err as Error, {
        jobId: job.id,
        documentId: job.data.documentId,
        attempts: job.attemptsMade,
      });
    });

    return this.queue;
  }

  /**
   * Enqueue a document processing job
   */
  static async enqueueDocumentProcessing(
    documentId: string,
    applicationId: string,
    userId: string
  ): Promise<void> {
    const queue = this.initialize();

    await queue.add(
      {
        documentId,
        applicationId,
        userId,
      },
      {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 seconds
        },
        removeOnComplete: true, // Remove completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );

    logInfo('[DocumentProcessingQueue] Job enqueued', {
      documentId,
      applicationId,
      userId,
    });
  }
}
