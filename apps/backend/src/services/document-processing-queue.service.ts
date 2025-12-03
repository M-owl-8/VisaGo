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
    this.queue = new Queue<DocumentProcessingJobData>('document-processing', redisUrl);

    // Set up processor
    this.queue.process(async (job) => {
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

        // Step 2: AI Validation (if not already done)
        if (document.status === 'pending' && !document.verifiedByAI) {
          try {
            const { validateDocumentWithAI, saveValidationResultToDocument } = await import(
              './document-validation.service'
            );

            // Try to find matching checklist item
            let checklistItem: any = undefined;
            try {
              const { DocumentChecklistService } = await import('./document-checklist.service');
              const checklist = await DocumentChecklistService.generateChecklist(
                applicationId,
                userId
              );
              if (checklist && 'items' in checklist && Array.isArray(checklist.items)) {
                checklistItem = checklist.items.find(
                  (item: any) =>
                    item.documentType === document.documentType ||
                    item.documentType?.toLowerCase() === document.documentType?.toLowerCase()
                );
              }
            } catch (checklistError) {
              // Checklist lookup is optional
              logWarn('[DocumentProcessingQueue] Checklist lookup failed (non-blocking)', {
                documentId,
                error:
                  checklistError instanceof Error ? checklistError.message : String(checklistError),
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

            logInfo('[DocumentProcessingQueue] AI validation completed', {
              documentId,
              status: aiResult.status,
              verifiedByAI: aiResult.verifiedByAI,
              confidence: aiResult.confidence,
            });
          } catch (validationError: any) {
            // Log but continue - validation failure shouldn't block other processing
            logError('[DocumentProcessingQueue] AI validation failed', validationError as Error, {
              documentId,
            });

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
        logInfo('[DocumentProcessingQueue] Job completed successfully', {
          documentId,
          applicationId,
          jobId: job.id,
          duration: `${jobDuration}ms`,
        });

        return { success: true, documentId, applicationId };
      } catch (error: any) {
        const jobDuration = Date.now() - jobStartTime;
        logError('[DocumentProcessingQueue] Job failed', error as Error, {
          documentId,
          applicationId,
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          duration: `${jobDuration}ms`,
        });

        // Re-throw to trigger retry mechanism
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
