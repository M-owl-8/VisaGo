import { PrismaClient } from '@prisma/client';
import { logError } from '../middleware/logger';

const prisma = new PrismaClient();

export interface VerificationMetrics {
  total: number;
  verified: number;
  rejected: number;
  pending: number;
  needsReview: number;
}

/**
 * Basic verification metrics aggregated from UserDocument.
 */
export async function getVerificationMetrics(): Promise<VerificationMetrics> {
  try {
    const [total, verified, rejected, pending, needsReview] = await Promise.all([
      prisma.userDocument.count(),
      prisma.userDocument.count({ where: { status: 'verified' } }),
      prisma.userDocument.count({ where: { status: 'rejected' } }),
      prisma.userDocument.count({ where: { status: 'pending' } }),
      prisma.userDocument.count({ where: { needsReview: true } }),
    ]);

    return { total, verified, rejected, pending, needsReview };
  } catch (error) {
    logError('[VerificationMetrics] Failed to compute metrics', error as Error);
    throw error;
  }
}
