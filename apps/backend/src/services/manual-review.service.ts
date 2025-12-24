import { PrismaClient } from '@prisma/client';
import { logError, logInfo } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * Queue a document for manual review (sets needsReview flag and stores reason).
 */
export async function queueForManualReview(documentId: string, reason?: string): Promise<void> {
  try {
    await prisma.userDocument.update({
      where: { id: documentId },
      data: {
        needsReview: true,
        verificationNotes: reason ?? null,
      },
    });
    await prisma.documentStatusHistory.create({
      data: {
        documentId,
        status: 'needs_review',
        notes: reason,
      },
    });
    logInfo('[ManualReview] Document queued for manual review', { documentId, reason });
  } catch (error) {
    logError('[ManualReview] Failed to queue document for manual review', error as Error, {
      documentId,
    });
    throw error;
  }
}

/**
 * Fetch documents that need manual review.
 */
export async function getManualReviewQueue(limit = 50, offset = 0) {
  try {
    return await prisma.userDocument.findMany({
      where: { needsReview: true },
      orderBy: { uploadedAt: 'desc' },
      skip: offset,
      take: limit,
    });
  } catch (error) {
    logError('[ManualReview] Failed to fetch manual review queue', error as Error, {
      limit,
      offset,
    });
    throw error;
  }
}
