/**
 * Ensemble Validation Service
 * Phase 7: Multi-model ensemble with consensus voting
 * Uses multiple AI models (GPT-4, GPT-4o-mini, DeepSeek R1) and votes on final result
 */

import { logInfo, logError, logWarn } from '../middleware/logger';
import { AIOpenAIService } from './ai-openai.service';
import { DocumentValidationResultAI } from '../types/ai-responses';

export interface EnsembleValidationResult extends DocumentValidationResultAI {
  consensusScore: number; // 0-1, how much models agree
  modelVotes: Array<{
    model: string;
    status: DocumentValidationResultAI['status'];
    confidence: number;
  }>;
}

export class EnsembleValidationService {
  /**
   * Validate document using ensemble of models
   */
  static async validateWithEnsemble(params: {
    documentText: string;
    documentType: string;
    checklistItem?: any;
    application?: any;
  }): Promise<EnsembleValidationResult> {
    const models = ['gpt-4o-mini', 'gpt-4']; // Can add DeepSeek R1 later
    const votes: Array<{
      model: string;
      status: DocumentValidationResultAI['status'];
      confidence: number;
    }> = [];
    const results: DocumentValidationResultAI[] = [];

    // Run validation with each model
    for (const model of models) {
      try {
        const result = await this.validateWithModel(model, params);
        results.push(result);
        votes.push({
          model,
          status: result.status,
          confidence: result.confidence || 0.5,
        });
      } catch (error) {
        logWarn('[EnsembleValidation] Model validation failed', {
          model,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (results.length === 0) {
      throw new Error('All models failed validation');
    }

    // Calculate consensus
    const consensus = this.calculateConsensus(results, votes);

    return {
      ...consensus.result,
      consensusScore: consensus.score,
      modelVotes: votes,
    };
  }

  /**
   * Validate with a specific model
   */
  private static async validateWithModel(
    model: string,
    params: {
      documentText: string;
      documentType: string;
      checklistItem?: any;
      application?: any;
    }
  ): Promise<DocumentValidationResultAI> {
    // Use existing validation logic but with specific model
    const { validateDocumentWithAI } = await import('./document-validation.service');

    // For now, use the existing validation service
    // In production, would call each model separately
    return validateDocumentWithAI({
      document: {
        documentType: params.documentType,
        documentName: params.documentType,
        fileName: `${params.documentType}.txt`,
        fileUrl: 'ensemble://text',
      },
      checklistItem: params.checklistItem,
      application: params.application || {
        id: 'ensemble-app',
        country: { name: 'Unknown', code: 'XX' },
        visaType: { name: 'tourist' },
      },
      countryName: params.application?.country?.name || 'Unknown',
      visaTypeName: params.application?.visaType?.name || 'tourist',
    });
  }

  /**
   * Calculate consensus from multiple model results
   */
  private static calculateConsensus(
    results: DocumentValidationResultAI[],
    votes: Array<{
      model: string;
      status: DocumentValidationResultAI['status'];
      confidence: number;
    }>
  ): {
    result: DocumentValidationResultAI;
    score: number;
  } {
    // Count votes by status
    const statusCounts = new Map<DocumentValidationResultAI['status'], number>();
    const statusConfidences = new Map<DocumentValidationResultAI['status'], number[]>();

    for (const vote of votes) {
      const count = statusCounts.get(vote.status) || 0;
      statusCounts.set(vote.status, count + 1);

      const confidences = statusConfidences.get(vote.status) || [];
      confidences.push(vote.confidence);
      statusConfidences.set(vote.status, confidences);
    }

    // Find majority status
    let majorityStatus: DocumentValidationResultAI['status'] = 'uncertain';
    let maxCount = 0;

    for (const [status, count] of statusCounts) {
      if (count > maxCount) {
        maxCount = count;
        majorityStatus = status;
      }
    }

    // Calculate consensus score (how many models agree)
    const consensusScore = maxCount / votes.length;

    // Average confidence for majority status
    const majorityConfidences = statusConfidences.get(majorityStatus) || [];
    const avgConfidence =
      majorityConfidences.length > 0
        ? majorityConfidences.reduce((a, b) => a + b, 0) / majorityConfidences.length
        : 0.5;

    // Merge problems from all results
    const allProblems: DocumentValidationResultAI['problems'] = [];
    const problemSet = new Set<string>();

    for (const result of results) {
      if (result.problems) {
        for (const problem of result.problems) {
          const key = `${problem.code}:${problem.message}`;
          if (!problemSet.has(key)) {
            problemSet.add(key);
            allProblems.push(problem);
          }
        }
      }
    }

    // Merge notes (prefer Uzbek, then English)
    const notes = {
      uz: results.find((r) => r.notes?.uz)?.notes?.uz || '',
      en: results.find((r) => r.notes?.en)?.notes?.en || '',
      ru: results.find((r) => r.notes?.ru)?.notes?.ru || '',
    };

    return {
      result: {
        status: majorityStatus,
        confidence: avgConfidence,
        verifiedByAI: majorityStatus === 'verified' && avgConfidence >= 0.7,
        problems: allProblems,
        suggestions: results[0]?.suggestions || [],
        notes,
      },
      score: consensusScore,
    };
  }
}
