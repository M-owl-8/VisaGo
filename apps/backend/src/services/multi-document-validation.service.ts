/**
 * Multi-Document Validation Service
 * Phase 4: Validates documents together for consistency and cross-referencing
 * - Cross-reference amounts (bank statement vs employment letter)
 * - Validate sponsor documents match applicant's sponsor type
 * - Check date consistency across documents
 * - Validate document completeness as a set
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { DocumentValidationResultAI } from '../types/ai-responses';

const prisma = new PrismaClient();

export interface MultiDocumentValidationResult {
  overallStatus: 'verified' | 'needs_review' | 'rejected';
  consistencyIssues: Array<{
    type: 'amount_mismatch' | 'date_inconsistency' | 'sponsor_mismatch' | 'missing_related_doc';
    severity: 'error' | 'warning';
    message: string;
    affectedDocuments: string[];
  }>;
  crossReferences: Array<{
    sourceDocument: string;
    targetDocument: string;
    checkType: string;
    status: 'consistent' | 'inconsistent' | 'unknown';
    details?: string;
  }>;
}

export class MultiDocumentValidationService {
  /**
   * Validate all documents for an application together
   */
  static async validateApplicationDocuments(
    applicationId: string
  ): Promise<MultiDocumentValidationResult> {
    try {
      // Load all documents for the application
      const documents = await prisma.userDocument.findMany({
        where: { applicationId },
        orderBy: { createdAt: 'desc' },
      });

      if (documents.length === 0) {
        return {
          overallStatus: 'needs_review',
          consistencyIssues: [],
          crossReferences: [],
        };
      }

      // Load application context
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          user: true,
        },
      });

      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      const consistencyIssues: MultiDocumentValidationResult['consistencyIssues'] = [];
      const crossReferences: MultiDocumentValidationResult['crossReferences'] = [];

      // 1. Cross-reference financial documents
      const financialCheck = this.validateFinancialConsistency(documents);
      consistencyIssues.push(...financialCheck.issues);
      crossReferences.push(...financialCheck.crossReferences);

      // 2. Validate sponsor documents match sponsor type
      const sponsorCheck = await this.validateSponsorDocuments(
        documents,
        application.userId,
        applicationId
      );
      consistencyIssues.push(...sponsorCheck.issues);
      crossReferences.push(...sponsorCheck.crossReferences);

      // 3. Check date consistency
      const dateCheck = this.validateDateConsistency(documents);
      consistencyIssues.push(...dateCheck.issues);
      crossReferences.push(...dateCheck.crossReferences);

      // 4. Check document completeness
      const completenessCheck = await this.validateDocumentCompleteness(documents, applicationId);
      consistencyIssues.push(...completenessCheck.issues);

      // Determine overall status
      const hasErrors = consistencyIssues.some((issue) => issue.severity === 'error');
      const hasWarnings = consistencyIssues.some((issue) => issue.severity === 'warning');

      let overallStatus: 'verified' | 'needs_review' | 'rejected' = 'verified';
      if (hasErrors) {
        overallStatus = 'rejected';
      } else if (hasWarnings) {
        overallStatus = 'needs_review';
      }

      return {
        overallStatus,
        consistencyIssues,
        crossReferences,
      };
    } catch (error) {
      logError('[MultiDocumentValidation] Validation failed', error as Error, {
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Validate financial consistency across documents
   */
  private static validateFinancialConsistency(
    documents: Array<{
      documentType: string;
      extractedText?: string | null;
      aiNotesEn?: string | null;
    }>
  ): {
    issues: MultiDocumentValidationResult['consistencyIssues'];
    crossReferences: MultiDocumentValidationResult['crossReferences'];
  } {
    const issues: MultiDocumentValidationResult['consistencyIssues'] = [];
    const crossReferences: MultiDocumentValidationResult['crossReferences'] = [];

    // Find bank statement and employment letter
    const bankStatement = documents.find(
      (doc) =>
        doc.documentType === 'bank_statement' ||
        doc.documentType === 'bank_statements_applicant' ||
        doc.documentType === 'sponsor_bank_statement'
    );

    const employmentLetter = documents.find(
      (doc) =>
        doc.documentType === 'employment_letter' || doc.documentType === 'sponsor_employment_letter'
    );

    if (bankStatement && employmentLetter) {
      // Extract amounts from OCR text (simplified - would use NLP in production)
      const bankBalance = this.extractAmount(bankStatement.extractedText || '');
      const employmentIncome = this.extractAmount(employmentLetter.extractedText || '');

      if (bankBalance && employmentIncome) {
        // Check if bank balance is reasonable given employment income
        // Rule: Bank balance should be at least 3 months of income
        const expectedMinimumBalance = employmentIncome * 3;

        if (bankBalance < expectedMinimumBalance) {
          issues.push({
            type: 'amount_mismatch',
            severity: 'warning',
            message: `Bank balance ($${bankBalance.toLocaleString()}) is less than 3 months of income ($${employmentIncome.toLocaleString()}/month). Expected minimum: $${expectedMinimumBalance.toLocaleString()}`,
            affectedDocuments: [bankStatement.documentType, employmentLetter.documentType],
          });
        }

        crossReferences.push({
          sourceDocument: bankStatement.documentType,
          targetDocument: employmentLetter.documentType,
          checkType: 'financial_consistency',
          status: bankBalance >= expectedMinimumBalance ? 'consistent' : 'inconsistent',
          details: `Balance: $${bankBalance.toLocaleString()}, Income: $${employmentIncome.toLocaleString()}/month`,
        });
      }
    }

    return { issues, crossReferences };
  }

  /**
   * Validate sponsor documents match applicant's sponsor type
   */
  private static async validateSponsorDocuments(
    documents: Array<{ documentType: string; extractedText?: string | null }>,
    userId: string,
    applicationId: string
  ): Promise<{
    issues: MultiDocumentValidationResult['consistencyIssues'];
    crossReferences: MultiDocumentValidationResult['crossReferences'];
  }> {
    const issues: MultiDocumentValidationResult['consistencyIssues'] = [];
    const crossReferences: MultiDocumentValidationResult['crossReferences'] = [];

    try {
      // Get applicant's sponsor type from questionnaire
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          user: {
            select: {
              bio: true, // Questionnaire data
            },
          },
        },
      });

      if (!application || !application.user.bio) {
        return { issues, crossReferences };
      }

      const questionnaire = JSON.parse(application.user.bio);
      const sponsorType = questionnaire.sponsorType || 'self';

      // Check if sponsor documents are present when needed
      const hasSponsorDocs = documents.some(
        (doc) => doc.documentType.startsWith('sponsor_') || doc.documentType.includes('sponsor')
      );

      if (sponsorType !== 'self' && !hasSponsorDocs) {
        issues.push({
          type: 'missing_related_doc',
          severity: 'error',
          message: `Applicant has sponsor type "${sponsorType}" but no sponsor documents found`,
          affectedDocuments: [],
        });
      }

      if (sponsorType === 'self' && hasSponsorDocs) {
        issues.push({
          type: 'sponsor_mismatch',
          severity: 'warning',
          message: `Applicant is self-funded but sponsor documents are present`,
          affectedDocuments: documents
            .filter((doc) => doc.documentType.startsWith('sponsor_'))
            .map((doc) => doc.documentType),
        });
      }

      // Validate sponsor document names match sponsor type
      if (sponsorType === 'parent' && hasSponsorDocs) {
        const sponsorDocs = documents.filter((doc) => doc.documentType.startsWith('sponsor_'));

        for (const doc of sponsorDocs) {
          const text = doc.extractedText || '';
          // Check if document mentions "parent" or parent-related terms
          const hasParentMention =
            text.toLowerCase().includes('parent') ||
            text.toLowerCase().includes('father') ||
            text.toLowerCase().includes('mother');

          if (!hasParentMention && text.length > 0) {
            crossReferences.push({
              sourceDocument: doc.documentType,
              targetDocument: 'questionnaire',
              checkType: 'sponsor_type_match',
              status: 'inconsistent',
              details: `Document does not clearly indicate parent sponsorship`,
            });
          }
        }
      }
    } catch (error) {
      logWarn('[MultiDocumentValidation] Sponsor validation failed', {
        error: error instanceof Error ? error.message : String(error),
        applicationId,
      });
    }

    return { issues, crossReferences };
  }

  /**
   * Validate date consistency across documents
   */
  private static validateDateConsistency(
    documents: Array<{
      documentType: string;
      expiryDate?: Date | null;
      uploadedAt: Date;
      extractedText?: string | null;
    }>
  ): {
    issues: MultiDocumentValidationResult['consistencyIssues'];
    crossReferences: MultiDocumentValidationResult['crossReferences'];
  } {
    const issues: MultiDocumentValidationResult['consistencyIssues'] = [];
    const crossReferences: MultiDocumentValidationResult['crossReferences'] = [];

    // Check passport expiry
    const passport = documents.find((doc) => doc.documentType === 'passport');
    if (passport && passport.expiryDate) {
      const expiryDate = new Date(passport.expiryDate);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      if (expiryDate < sixMonthsFromNow) {
        issues.push({
          type: 'date_inconsistency',
          severity: 'error',
          message: `Passport expires ${expiryDate.toLocaleDateString()}, less than 6 months from now`,
          affectedDocuments: ['passport'],
        });
      }
    }

    // Check bank statement dates are recent (within 3 months)
    const bankStatements = documents.filter(
      (doc) =>
        doc.documentType === 'bank_statement' || doc.documentType === 'bank_statements_applicant'
    );

    for (const statement of bankStatements) {
      const uploadDate = new Date(statement.uploadedAt);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      if (uploadDate < threeMonthsAgo) {
        issues.push({
          type: 'date_inconsistency',
          severity: 'warning',
          message: `Bank statement uploaded ${uploadDate.toLocaleDateString()} is older than 3 months`,
          affectedDocuments: [statement.documentType],
        });
      }
    }

    return { issues, crossReferences };
  }

  /**
   * Validate document completeness for the application
   */
  private static async validateDocumentCompleteness(
    documents: Array<{ documentType: string; status: string }>,
    applicationId: string
  ): Promise<{
    issues: MultiDocumentValidationResult['consistencyIssues'];
  }> {
    const issues: MultiDocumentValidationResult['consistencyIssues'] = [];

    try {
      // Get checklist to see what's required
      const { DocumentChecklistService } = await import('./document-checklist.service');
      const checklist = await DocumentChecklistService.generateChecklist(
        applicationId,
        'system' // System user ID for evaluation
      );

      if (checklist && 'items' in checklist && Array.isArray(checklist.items)) {
        const requiredDocs = checklist.items.filter(
          (item: any) => item.category === 'required' || item.required === true
        );

        for (const requiredDoc of requiredDocs) {
          const foundDoc = documents.find(
            (doc) =>
              doc.documentType === requiredDoc.documentType ||
              doc.documentType.toLowerCase() === requiredDoc.documentType.toLowerCase()
          );

          if (!foundDoc) {
            issues.push({
              type: 'missing_related_doc',
              severity: 'error',
              message: `Required document "${requiredDoc.documentType}" is missing`,
              affectedDocuments: [],
            });
          } else if (foundDoc.status === 'rejected') {
            issues.push({
              type: 'missing_related_doc',
              severity: 'error',
              message: `Required document "${requiredDoc.documentType}" is rejected and needs to be fixed`,
              affectedDocuments: [foundDoc.documentType],
            });
          }
        }
      }
    } catch (error) {
      logWarn('[MultiDocumentValidation] Completeness check failed', {
        error: error instanceof Error ? error.message : String(error),
        applicationId,
      });
    }

    return { issues };
  }

  /**
   * Extract amount from text (simplified - would use NLP in production)
   */
  private static extractAmount(text: string): number | null {
    // Look for dollar amounts: $X,XXX.XX or USD X,XXX.XX
    const amountPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const matches = text.match(amountPattern);

    if (!matches || matches.length === 0) {
      return null;
    }

    // Extract the largest amount (likely the balance)
    const amounts = matches.map((match) => {
      const cleaned = match.replace(/[$,]/g, '');
      return parseFloat(cleaned);
    });

    return Math.max(...amounts);
  }
}
