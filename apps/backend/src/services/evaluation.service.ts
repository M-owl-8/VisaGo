/**
 * Evaluation Service
 * Comprehensive evaluation framework for document verification accuracy
 * Tracks precision, recall, F1-score, false positives/negatives, and performance metrics
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { VisaDocCheckerService } from './visa-doc-checker.service';
import { VisaChecklistEngineService } from './visa-checklist-engine.service';
import { buildCanonicalAIUserContext, buildAIUserContext } from './ai-context.service';
import { CanonicalAIUserContext } from '../types/ai-context';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

export interface EvaluationCase {
  id: string;
  name: string;
  description: string;
  input: {
    applicantProfile: {
      sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other';
      currentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed';
      bankBalanceUSD: number;
      monthlyIncomeUSD: number;
      hasPreviousRefusals: boolean;
      hasProperty: boolean;
      hasFamilyTies: boolean;
    };
    application: {
      countryCode: string;
      visaType: string;
    };
    riskScore: {
      level: 'low' | 'medium' | 'high';
      score: number;
    };
  };
  expected: {
    checklist: Array<{
      documentType: string;
      category: 'required' | 'highly_recommended' | 'optional';
    }>;
  };
  sampleDocs?: Array<{
    documentType: string;
    text: string;
    expectedVerification: {
      status: 'APPROVED' | 'NEED_FIX' | 'REJECTED';
      embassy_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  }>;
}

export interface EvaluationMetrics {
  // Checklist metrics
  checklistAccuracy: number; // Percentage of correct document types and categories
  checklistPrecision: number; // True positives / (True positives + False positives)
  checklistRecall: number; // True positives / (True positives + False negatives)
  checklistF1Score: number; // Harmonic mean of precision and recall

  // Document verification metrics
  docVerificationAccuracy: number; // Percentage of correct verification results
  docVerificationPrecision: number;
  docVerificationRecall: number;
  docVerificationF1Score: number;

  // Performance metrics
  averageLatencyMs: number;
  averageTokenUsage: number;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;

  // Error breakdown
  falsePositives: number; // Valid docs marked as rejected
  falseNegatives: number; // Invalid docs marked as verified
  truePositives: number;
  trueNegatives: number;
}

export interface EvaluationResult {
  caseId: string;
  caseName: string;
  checklistScore: {
    matches: number;
    missing: number;
    extra: number;
    wrongCategory: number;
    totalExpected: number;
    totalActual: number;
    accuracy: number;
  };
  docVerificationScore?: {
    passed: number;
    failed: number;
    total: number;
    accuracy: number;
  };
  errors?: string[];
  latencyMs?: number;
  tokenUsage?: number;
}

export class EvaluationService {
  /**
   * Load evaluation cases from JSON file
   */
  static loadEvaluationCases(): EvaluationCase[] {
    try {
      const casesPath = join(__dirname, '../../evaluation/cases.json');
      const casesData = JSON.parse(readFileSync(casesPath, 'utf-8'));
      return casesData.cases || [];
    } catch (error) {
      logError('[Evaluation] Failed to load evaluation cases', error as Error);
      return [];
    }
  }

  /**
   * Evaluate a single test case
   */
  static async evaluateCase(caseData: EvaluationCase): Promise<EvaluationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Build CanonicalAIUserContext from case input
      const canonicalContext = await this.buildContextFromCase(caseData);

      // Evaluate checklist generation
      const checklistScore = await this.evaluateChecklist(caseData, canonicalContext);

      // Evaluate document verification (if sample docs provided)
      let docVerificationScore;
      if (caseData.sampleDocs && caseData.sampleDocs.length > 0) {
        docVerificationScore = await this.evaluateDocumentVerification(caseData, canonicalContext);
      }

      const latencyMs = Date.now() - startTime;

      return {
        caseId: caseData.id,
        caseName: caseData.name,
        checklistScore,
        docVerificationScore,
        errors: errors.length > 0 ? errors : undefined,
        latencyMs,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        caseId: caseData.id,
        caseName: caseData.name,
        checklistScore: {
          matches: 0,
          missing: caseData.expected.checklist.length,
          extra: 0,
          wrongCategory: 0,
          totalExpected: caseData.expected.checklist.length,
          totalActual: 0,
          accuracy: 0,
        },
        errors,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate checklist generation accuracy
   */
  private static async evaluateChecklist(
    caseData: EvaluationCase,
    canonicalContext: CanonicalAIUserContext
  ): Promise<EvaluationResult['checklistScore']> {
    try {
      // Generate checklist using VisaChecklistEngineService
      const engineResponse = await VisaChecklistEngineService.generateChecklistForApplication(
        {
          id: 'eval-application-id',
          country: {
            code: caseData.input.application.countryCode,
            name: caseData.input.application.countryCode,
          },
          visaType: {
            name: caseData.input.application.visaType,
          },
        } as any,
        canonicalContext as any
      );

      const actualChecklist = engineResponse?.checklist || [];
      const expectedChecklist = caseData.expected.checklist;

      // Compare actual vs expected
      const comparison = this.compareChecklists(actualChecklist, expectedChecklist);

      return {
        matches: comparison.matches,
        missing: comparison.missing,
        extra: comparison.extra,
        wrongCategory: comparison.wrongCategory,
        totalExpected: expectedChecklist.length,
        totalActual: actualChecklist.length,
        accuracy: comparison.accuracy,
      };
    } catch (error) {
      logError('[Evaluation] Checklist evaluation failed', error as Error, {
        caseId: caseData.id,
      });
      throw error;
    }
  }

  /**
   * Evaluate document verification accuracy
   */
  private static async evaluateDocumentVerification(
    caseData: EvaluationCase,
    canonicalContext: CanonicalAIUserContext
  ): Promise<EvaluationResult['docVerificationScore']> {
    if (!caseData.sampleDocs || caseData.sampleDocs.length === 0) {
      return undefined;
    }

    let passed = 0;
    let failed = 0;

    for (const sampleDoc of caseData.sampleDocs) {
      try {
        // Create a minimal required document rule
        const requiredRule: any = {
          documentType: sampleDoc.documentType,
          category: 'required',
          name: sampleDoc.documentType,
          description: `Required ${sampleDoc.documentType}`,
        };

        // Call document verification
        const result = await VisaDocCheckerService.checkDocument(
          requiredRule,
          sampleDoc.text,
          canonicalContext as any,
          { fileType: 'txt' },
          caseData.input.application.countryCode,
          caseData.input.application.visaType as 'tourist' | 'student'
        );

        // Compare with expected
        const statusMatch = result.status === sampleDoc.expectedVerification.status;
        const riskMatch =
          result.embassy_risk_level === sampleDoc.expectedVerification.embassy_risk_level;

        if (statusMatch && riskMatch) {
          passed++;
        } else {
          failed++;
          logWarn('[Evaluation] Document verification mismatch', {
            caseId: caseData.id,
            documentType: sampleDoc.documentType,
            expected: sampleDoc.expectedVerification,
            actual: {
              status: result.status,
              embassy_risk_level: result.embassy_risk_level,
            },
          });
        }
      } catch (error) {
        failed++;
        logError('[Evaluation] Document verification error', error as Error, {
          caseId: caseData.id,
          documentType: sampleDoc.documentType,
        });
      }
    }

    const total = caseData.sampleDocs.length;
    const accuracy = total > 0 ? (passed / total) * 100 : 0;

    return {
      passed,
      failed,
      total,
      accuracy,
    };
  }

  /**
   * Compare actual checklist vs expected checklist
   */
  private static compareChecklists(
    actual: Array<{ documentType: string; category?: string }>,
    expected: Array<{ documentType: string; category: string }>
  ): {
    matches: number;
    missing: number;
    extra: number;
    wrongCategory: number;
    accuracy: number;
  } {
    let matches = 0;
    let wrongCategory = 0;
    const matchedExpected = new Set<number>();
    const matchedActual = new Set<number>();

    // Find matches
    for (let i = 0; i < expected.length; i++) {
      const expectedItem = expected[i];
      for (let j = 0; j < actual.length; j++) {
        if (matchedActual.has(j)) continue;

        const actualItem = actual[j];
        if (actualItem.documentType.toLowerCase() === expectedItem.documentType.toLowerCase()) {
          matchedExpected.add(i);
          matchedActual.add(j);

          if (actualItem.category === expectedItem.category) {
            matches++;
          } else {
            wrongCategory++;
          }
          break;
        }
      }
    }

    const missing = expected.length - matchedExpected.size;
    const extra = actual.length - matchedActual.size;

    // Calculate accuracy: (matches / totalExpected) * 100
    const accuracy = expected.length > 0 ? (matches / expected.length) * 100 : 0;

    return {
      matches,
      missing,
      extra,
      wrongCategory,
      accuracy,
    };
  }

  /**
   * Build CanonicalAIUserContext from evaluation case input
   */
  private static async buildContextFromCase(
    caseData: EvaluationCase
  ): Promise<CanonicalAIUserContext> {
    // This is a simplified version - in production, would build full context
    const profile = caseData.input.applicantProfile;

    return {
      userProfile: {
        userId: 'eval-user-id',
        citizenship: 'UZ',
        age: 25,
        appLanguage: 'uz',
      },
      application: {
        applicationId: 'eval-application-id',
        visaType: caseData.input.application.visaType as 'student' | 'tourist',
        country: caseData.input.application.countryCode, // ISO country code as string
        status: 'draft',
      },
      applicantProfile: {
        // Core identity (required)
        citizenship: 'UZ',
        age: 25,
        // Visa details (required)
        visaType: caseData.input.application.visaType as 'student' | 'tourist',
        targetCountry: caseData.input.application.countryCode,
        duration: '3_6_months', // Default for evaluation
        // Financial (required)
        sponsorType: profile.sponsorType,
        bankBalanceUSD: profile.bankBalanceUSD,
        monthlyIncomeUSD: profile.monthlyIncomeUSD,
        // Financial (expert fields - optional but included)
        financial: {
          requiredFundsUSD: 10000,
          availableFundsUSD: profile.bankBalanceUSD,
          financialSufficiencyRatio: profile.bankBalanceUSD / 10000,
          financialSufficiencyLabel: profile.bankBalanceUSD >= 10000 ? 'sufficient' : 'low',
        },
        // Employment/Education (required)
        currentStatus: profile.currentStatus,
        isStudent: profile.currentStatus === 'student',
        isEmployed: profile.currentStatus === 'employed' || profile.currentStatus === 'self_employed',
        // Travel history (required)
        hasInternationalTravel: false, // Default for evaluation
        previousVisaRejections: profile.hasPreviousRefusals,
        previousOverstay: false, // Default for evaluation
        // Travel history (expert fields - optional)
        travelHistory: {
          travelHistoryScore: profile.hasPreviousRefusals ? 0.3 : 0.7,
          travelHistoryLabel: profile.hasPreviousRefusals ? 'limited' : 'good',
          previousVisaRejections: profile.hasPreviousRefusals ? 1 : 0,
          hasOverstayHistory: false,
        },
        // Ties to home country (required)
        hasPropertyInUzbekistan: profile.hasProperty,
        hasFamilyInUzbekistan: profile.hasFamilyTies,
        maritalStatus: 'unknown', // Default for evaluation
        hasChildren: false, // Default for evaluation
        // Ties (expert fields - optional)
        ties: {
          tiesStrengthScore: profile.hasProperty && profile.hasFamilyTies ? 0.8 : 0.5,
          tiesStrengthLabel: profile.hasProperty && profile.hasFamilyTies ? 'strong' : 'medium',
        },
        // Documents (required)
        documents: {
          hasPassport: true,
          hasBankStatement: true,
          hasEmploymentOrStudyProof: profile.currentStatus !== 'unemployed',
          hasTravelInsurance: false,
          hasInsurance: false,
          hasFlightBooking: false,
          hasHotelBookingOrAccommodation: false,
        },
      },
      countryContext: {
        countryCode: caseData.input.application.countryCode,
        countryName: caseData.input.application.countryCode,
        schengen: false, // Default to false, would be determined from country registry
      },
      riskScore: {
        level: caseData.input.riskScore.level,
        score: caseData.input.riskScore.score,
      },
      riskDrivers: this.calculateRiskDrivers(profile, caseData.input.riskScore),
      uploadedDocuments: [],
      appActions: [],
    } as CanonicalAIUserContext;
  }

  /**
   * Calculate risk drivers from profile
   */
  private static calculateRiskDrivers(
    profile: EvaluationCase['input']['applicantProfile'],
    riskScore: EvaluationCase['input']['riskScore']
  ): string[] {
    const drivers: string[] = [];

    if (profile.bankBalanceUSD < 5000) {
      drivers.push('low_funds');
    }

    if (!profile.hasProperty && !profile.hasFamilyTies) {
      drivers.push('weak_ties');
    }

    if (profile.hasPreviousRefusals) {
      drivers.push('previous_refusal');
    }

    if (riskScore.level === 'high') {
      drivers.push('high_risk_profile');
    }

    return drivers;
  }

  /**
   * Run full evaluation suite
   */
  static async runEvaluationSuite(): Promise<{
    results: EvaluationResult[];
    metrics: EvaluationMetrics;
  }> {
    const cases = this.loadEvaluationCases();
    const results: EvaluationResult[] = [];
    let totalLatency = 0;
    let totalTokens = 0;

    logInfo('[Evaluation] Starting evaluation suite', {
      totalCases: cases.length,
    });

    for (const caseData of cases) {
      try {
        const result = await this.evaluateCase(caseData);
        results.push(result);
        totalLatency += result.latencyMs || 0;
      } catch (error) {
        logError('[Evaluation] Case evaluation failed', error as Error, {
          caseId: caseData.id,
        });
        results.push({
          caseId: caseData.id,
          caseName: caseData.name,
          checklistScore: {
            matches: 0,
            missing: caseData.expected.checklist.length,
            extra: 0,
            wrongCategory: 0,
            totalExpected: caseData.expected.checklist.length,
            totalActual: 0,
            accuracy: 0,
          },
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    // Calculate overall metrics
    const metrics = this.calculateMetrics(results);

    logInfo('[Evaluation] Evaluation suite completed', {
      totalCases: cases.length,
      passedCases: metrics.passedTestCases,
      failedCases: metrics.failedTestCases,
      checklistAccuracy: metrics.checklistAccuracy,
      docVerificationAccuracy: metrics.docVerificationAccuracy,
    });

    return {
      results,
      metrics,
    };
  }

  /**
   * Calculate overall evaluation metrics
   */
  private static calculateMetrics(results: EvaluationResult[]): EvaluationMetrics {
    const totalCases = results.length;
    let passedCases = 0;
    let failedCases = 0;
    let totalChecklistAccuracy = 0;
    let totalDocVerificationAccuracy = 0;
    let totalLatency = 0;
    let checklistTests = 0;
    let docVerificationTests = 0;

    // True/False positive/negative tracking
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    for (const result of results) {
      // Checklist metrics
      if (result.checklistScore) {
        totalChecklistAccuracy += result.checklistScore.accuracy;
        checklistTests++;

        // Count matches as true positives
        truePositives += result.checklistScore.matches;
        falseNegatives += result.checklistScore.missing;
        falsePositives += result.checklistScore.extra;
      }

      // Document verification metrics
      if (result.docVerificationScore) {
        totalDocVerificationAccuracy += result.docVerificationScore.accuracy;
        docVerificationTests++;
        truePositives += result.docVerificationScore.passed;
        falseNegatives += result.docVerificationScore.failed;
      }

      // Performance metrics
      if (result.latencyMs) {
        totalLatency += result.latencyMs;
      }

      // Pass/fail determination
      const checklistPass = result.checklistScore.accuracy >= 80;
      const docVerificationPass =
        !result.docVerificationScore || result.docVerificationScore.accuracy >= 80;

      if (checklistPass && docVerificationPass && !result.errors) {
        passedCases++;
      } else {
        failedCases++;
      }
    }

    const checklistAccuracy = checklistTests > 0 ? totalChecklistAccuracy / checklistTests : 0;
    const docVerificationAccuracy =
      docVerificationTests > 0 ? totalDocVerificationAccuracy / docVerificationTests : 0;

    // Calculate precision and recall
    const checklistPrecision =
      truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const checklistRecall =
      truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const checklistF1Score =
      checklistPrecision + checklistRecall > 0
        ? (2 * checklistPrecision * checklistRecall) / (checklistPrecision + checklistRecall)
        : 0;

    return {
      checklistAccuracy,
      checklistPrecision,
      checklistRecall,
      checklistF1Score,
      docVerificationAccuracy,
      docVerificationPrecision: checklistPrecision, // Simplified
      docVerificationRecall: checklistRecall, // Simplified
      docVerificationF1Score: checklistF1Score, // Simplified
      averageLatencyMs: totalCases > 0 ? totalLatency / totalCases : 0,
      averageTokenUsage: 0, // Token usage tracking not implemented yet
      totalTestCases: totalCases,
      passedTestCases: passedCases,
      failedTestCases: failedCases,
      falsePositives,
      falseNegatives,
      truePositives,
      trueNegatives,
    };
  }

  /**
   * Save evaluation results to database (for tracking over time)
   */
  static async saveEvaluationResults(
    results: EvaluationResult[],
    metrics: EvaluationMetrics
  ): Promise<void> {
    // In the future, could create an EvaluationRun model to track results over time
    // For now, just log the results
    logInfo('[Evaluation] Evaluation results', {
      metrics,
      resultsCount: results.length,
    });
  }
}
