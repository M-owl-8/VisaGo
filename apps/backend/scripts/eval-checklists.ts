/**
 * Evaluation Script for Checklist Generation Quality
 * 
 * Runs checklist generation for test cases and compares output vs expected results.
 * Computes scores and prints summary table.
 * 
 * Usage: pnpm eval:checklists
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { VisaChecklistEngineService } from '../src/services/visa-checklist-engine.service';
import { buildCanonicalAIUserContext, buildAIUserContext } from '../src/services/ai-context.service';
import { CanonicalAIUserContext, AIUserContext } from '../src/types/ai-context';
import { VisaDocCheckerService } from '../src/services/visa-doc-checker.service';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { logInfo, logError } from '../src/middleware/logger';

interface EvaluationCase {
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

interface EvaluationResult {
  caseId: string;
  caseName: string;
  checklistScore: {
    matches: number;
    missing: number;
    extra: number;
    wrongCategory: number;
    totalExpected: number;
    totalActual: number;
    accuracy: number; // percentage
  };
  docVerificationScore?: {
    passed: number;
    failed: number;
    total: number;
    accuracy: number;
  };
  errors?: string[];
}

/**
 * Convert CanonicalAIUserContext to minimal AIUserContext for service call
 */
function canonicalToAIUserContext(
  canonical: CanonicalAIUserContext,
  countryCode: string,
  visaType: string
): AIUserContext {
  return {
    userProfile: {
      userId: canonical.userProfile.userId,
      citizenship: canonical.userProfile.citizenship,
      age: canonical.userProfile.age || undefined,
      appLanguage: canonical.userProfile.appLanguage,
    },
    application: {
      applicationId: canonical.application.applicationId,
      visaType: canonical.application.visaType,
      country: canonical.application.country,
      status: canonical.application.status,
    },
    questionnaireSummary: {
      version: '2.0',
      visaType: visaType as 'student' | 'tourist',
      targetCountry: countryCode,
      appLanguage: 'en',
      sponsorType: canonical.applicantProfile.sponsorType,
      employment: {
        currentStatus: canonical.applicantProfile.currentStatus,
        isEmployed: canonical.applicantProfile.isEmployed,
      },
      financialInfo: {
        selfFundsUSD: canonical.applicantProfile.bankBalanceUSD || 0,
        monthlyIncomeUSD: canonical.applicantProfile.monthlyIncomeUSD || 0,
      },
      previousVisaRejections: canonical.applicantProfile.previousVisaRejections,
      hasPropertyInUzbekistan: canonical.applicantProfile.hasPropertyInUzbekistan,
      hasFamilyInUzbekistan: canonical.applicantProfile.hasFamilyInUzbekistan,
    },
    riskScore: canonical.riskScore,
    uploadedDocuments: canonical.uploadedDocuments,
  };
}

/**
 * Compare checklist output vs expected
 */
function compareChecklists(
  actual: Array<{ documentType: string; category: string }>,
  expected: Array<{ documentType: string; category: string }>
): {
  matches: number;
  missing: number;
  extra: number;
  wrongCategory: number;
} {
  const expectedMap = new Map<string, string>();
  expected.forEach((item) => {
    expectedMap.set(item.documentType, item.category);
  });

  const actualMap = new Map<string, string>();
  actual.forEach((item) => {
    actualMap.set(item.documentType, item.category);
  });

  let matches = 0;
  let missing = 0;
  let extra = 0;
  let wrongCategory = 0;

  // Check expected items
  expected.forEach((expectedItem) => {
    const actualCategory = actualMap.get(expectedItem.documentType);
    if (!actualCategory) {
      missing++;
    } else if (actualCategory === expectedItem.category) {
      matches++;
    } else {
      wrongCategory++;
    }
  });

  // Check for extra items
  actual.forEach((actualItem) => {
    if (!expectedMap.has(actualItem.documentType)) {
      extra++;
    }
  });

  return { matches, missing, extra, wrongCategory };
}

/**
 * Evaluate document verification
 */
async function evaluateDocVerification(
  sampleDocs: EvaluationCase['sampleDocs'],
  countryCode: string,
  visaType: string
): Promise<{ passed: number; failed: number; total: number; accuracy: number }> {
  if (!sampleDocs || sampleDocs.length === 0) {
    return { passed: 0, failed: 0, total: 0, accuracy: 0 };
  }

  let passed = 0;
  let failed = 0;

  for (const doc of sampleDocs) {
    try {
      // Create a minimal required document rule
      const requiredRule: VisaRuleSetData['requiredDocuments'][0] = {
        documentType: doc.documentType,
        category: 'required',
        name: doc.documentType,
        description: `Required ${doc.documentType}`,
      };

      // Call document verification
      const result = await VisaDocCheckerService.checkDocument(
        requiredRule,
        doc.text,
        undefined, // No user context for simple test
        { fileType: 'txt' }
      );

      // Compare with expected
      const statusMatch = result.status === doc.expectedVerification.status;
      const riskMatch = result.embassy_risk_level === doc.expectedVerification.embassy_risk_level;

      if (statusMatch && riskMatch) {
        passed++;
      } else {
        failed++;
        logInfo('[Eval] Doc verification mismatch', {
          documentType: doc.documentType,
          expected: doc.expectedVerification,
          actual: {
            status: result.status,
            embassy_risk_level: result.embassy_risk_level,
          },
        });
      }
    } catch (error) {
      failed++;
      logError('[Eval] Doc verification error', error as Error, {
        documentType: doc.documentType,
      });
    }
  }

  const total = sampleDocs.length;
  const accuracy = total > 0 ? (passed / total) * 100 : 0;

  return { passed, failed, total, accuracy };
}

/**
 * Evaluate a single case
 */
async function evaluateCase(caseData: EvaluationCase): Promise<EvaluationResult> {
  const { id, name, input, expected, sampleDocs } = caseData;
  const errors: string[] = [];

  try {
    // Build CanonicalAIUserContext from input
    const canonicalContext: CanonicalAIUserContext = {
      userProfile: {
        userId: 'eval-user',
        appLanguage: 'en',
        citizenship: 'UZ',
        age: 25,
      },
      application: {
        applicationId: 'eval-app',
        visaType: input.application.visaType as 'student' | 'tourist',
        country: input.application.countryCode,
        status: 'draft',
      },
      applicantProfile: {
        citizenship: 'UZ',
        age: 25,
        visaType: input.application.visaType as 'student' | 'tourist',
        targetCountry: input.application.countryCode,
        duration: '1_3_months',
        sponsorType: input.applicantProfile.sponsorType,
        bankBalanceUSD: input.applicantProfile.bankBalanceUSD,
        monthlyIncomeUSD: input.applicantProfile.monthlyIncomeUSD,
        currentStatus: input.applicantProfile.currentStatus,
        isStudent: input.applicantProfile.currentStatus === 'student',
        isEmployed: input.applicantProfile.currentStatus === 'employed',
        hasInternationalTravel: false,
        previousVisaRejections: input.applicantProfile.hasPreviousRefusals,
        previousOverstay: false,
        hasPropertyInUzbekistan: input.applicantProfile.hasProperty,
        hasFamilyInUzbekistan: input.applicantProfile.hasFamilyTies,
        maritalStatus: 'unknown',
        hasChildren: false,
        hasUniversityInvitation: false,
        hasOtherInvitation: false,
        documents: {
          hasPassport: false,
          hasBankStatement: false,
          hasEmploymentOrStudyProof: false,
          hasInsurance: false,
          hasFlightBooking: false,
          hasHotelBookingOrAccommodation: false,
        },
      },
      riskScore: {
        probabilityPercent: input.riskScore.score,
        level: input.riskScore.level,
        riskFactors: [],
        positiveFactors: [],
      },
      uploadedDocuments: [],
      appActions: [],
    };

    // Convert to AIUserContext for service call
    const aiUserContext = canonicalToAIUserContext(
      canonicalContext,
      input.application.countryCode,
      input.application.visaType
    );

    // Generate checklist
    const checklistResult = await VisaChecklistEngineService.generateChecklist(
      input.application.countryCode,
      input.application.visaType,
      aiUserContext
    );

    if (!checklistResult || !checklistResult.checklist) {
      errors.push('Checklist generation returned null or empty');
      return {
        caseId: id,
        caseName: name,
        checklistScore: {
          matches: 0,
          missing: expected.checklist.length,
          extra: 0,
          wrongCategory: 0,
          totalExpected: expected.checklist.length,
          totalActual: 0,
          accuracy: 0,
        },
        errors,
      };
    }

    // Compare checklists
    const actualChecklist = checklistResult.checklist.map((item) => ({
      documentType: item.documentType,
      category: item.category,
    }));

    const comparison = compareChecklists(actualChecklist, expected.checklist);
    const accuracy =
      expected.checklist.length > 0
        ? (comparison.matches / expected.checklist.length) * 100
        : 0;

    // Evaluate document verification if sample docs provided
    let docVerificationScore;
    if (sampleDocs && sampleDocs.length > 0) {
      docVerificationScore = await evaluateDocVerification(
        sampleDocs,
        input.application.countryCode,
        input.application.visaType
      );
    }

    return {
      caseId: id,
      caseName: name,
      checklistScore: {
        matches: comparison.matches,
        missing: comparison.missing,
        extra: comparison.extra,
        wrongCategory: comparison.wrongCategory,
        totalExpected: expected.checklist.length,
        totalActual: actualChecklist.length,
        accuracy,
      },
      docVerificationScore,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    logError('[Eval] Case evaluation failed', error as Error, { caseId: id, caseName: name });
    return {
      caseId: id,
      caseName: name,
      checklistScore: {
        matches: 0,
        missing: expected.checklist.length,
        extra: 0,
        wrongCategory: 0,
        totalExpected: expected.checklist.length,
        totalActual: 0,
        accuracy: 0,
      },
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Print summary table
 */
function printSummary(results: EvaluationResult[]): void {
  console.log('\n' + '='.repeat(100));
  console.log('CHECKLIST EVALUATION SUMMARY');
  console.log('='.repeat(100) + '\n');

  // Per-case results
  console.log('Per-Case Results:');
  console.log('-'.repeat(100));
  console.log(
    'Case ID'.padEnd(12) +
      'Case Name'.padEnd(40) +
      'Matches'.padEnd(10) +
      'Missing'.padEnd(10) +
      'Extra'.padEnd(10) +
      'Wrong Cat'.padEnd(12) +
      'Accuracy %'.padEnd(12) +
      'Doc Verif %'
  );
  console.log('-'.repeat(100));

  results.forEach((result) => {
    const checklist = result.checklistScore;
    const docVerif = result.docVerificationScore
      ? `${result.docVerificationScore.accuracy.toFixed(1)}%`
      : 'N/A';

    console.log(
      result.caseId.padEnd(12) +
        result.caseName.substring(0, 38).padEnd(40) +
        checklist.matches.toString().padEnd(10) +
        checklist.missing.toString().padEnd(10) +
        checklist.extra.toString().padEnd(10) +
        checklist.wrongCategory.toString().padEnd(12) +
        checklist.accuracy.toFixed(1) + '%'.padEnd(8) +
        docVerif
    );

    if (result.errors && result.errors.length > 0) {
      console.log('  Errors: ' + result.errors.join('; '));
    }
  });

  console.log('-'.repeat(100));

  // Overall statistics
  const totalCases = results.length;
  const totalExpected = results.reduce((sum, r) => sum + r.checklistScore.totalExpected, 0);
  const totalMatches = results.reduce((sum, r) => sum + r.checklistScore.matches, 0);
  const totalMissing = results.reduce((sum, r) => sum + r.checklistScore.missing, 0);
  const totalExtra = results.reduce((sum, r) => sum + r.checklistScore.extra, 0);
  const totalWrongCategory = results.reduce((sum, r) => sum + r.checklistScore.wrongCategory, 0);
  const overallAccuracy = totalExpected > 0 ? (totalMatches / totalExpected) * 100 : 0;

  const docVerifResults = results.filter((r) => r.docVerificationScore);
  const docVerifTotal = docVerifResults.reduce(
    (sum, r) => sum + (r.docVerificationScore?.total || 0),
    0
  );
  const docVerifPassed = docVerifResults.reduce(
    (sum, r) => sum + (r.docVerificationScore?.passed || 0),
    0
  );
  const docVerifAccuracy = docVerifTotal > 0 ? (docVerifPassed / docVerifTotal) * 100 : 0;

  console.log('\nOverall Statistics:');
  console.log('-'.repeat(100));
  console.log(`Total Cases: ${totalCases}`);
  console.log(`Total Expected Documents: ${totalExpected}`);
  console.log(`Total Matches: ${totalMatches}`);
  console.log(`Total Missing: ${totalMissing}`);
  console.log(`Total Extra: ${totalExtra}`);
  console.log(`Total Wrong Category: ${totalWrongCategory}`);
  console.log(`Overall Checklist Accuracy: ${overallAccuracy.toFixed(1)}%`);
  if (docVerifTotal > 0) {
    console.log(`Document Verification Tests: ${docVerifTotal}`);
    console.log(`Document Verification Passed: ${docVerifPassed}`);
    console.log(`Document Verification Accuracy: ${docVerifAccuracy.toFixed(1)}%`);
  }
  console.log('='.repeat(100) + '\n');
}

/**
 * Main evaluation function
 */
async function main() {
  try {
    console.log('Loading evaluation cases...');
    const casesPath = join(__dirname, '../evaluation/cases.json');
    const casesData = JSON.parse(readFileSync(casesPath, 'utf-8'));
    const cases: EvaluationCase[] = casesData.cases;

    console.log(`Found ${cases.length} test cases\n`);

    const results: EvaluationResult[] = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      console.log(`[${i + 1}/${cases.length}] Evaluating: ${caseData.name} (${caseData.id})`);
      const result = await evaluateCase(caseData);
      results.push(result);
    }

    // Print summary
    printSummary(results);

    // Exit with error code if overall accuracy is too low
    const overallAccuracy = results.reduce((sum, r) => sum + r.checklistScore.accuracy, 0) / results.length;
    if (overallAccuracy < 70) {
      console.log(`⚠️  Warning: Overall accuracy (${overallAccuracy.toFixed(1)}%) is below 70%`);
      process.exit(1);
    } else {
      console.log(`✅ Overall accuracy (${overallAccuracy.toFixed(1)}%) meets threshold`);
      process.exit(0);
    }
  } catch (error) {
    logError('[Eval] Evaluation script failed', error as Error);
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { evaluateCase, compareChecklists, printSummary };

