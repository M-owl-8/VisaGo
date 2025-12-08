/**
 * Visa Rules Service
 * Manages structured visa rule sets extracted from embassy sources
 *
 * IMPORTANT:
 * For supported countries & visa types, VisaRuleSet (with isApproved = true)
 * is the SINGLE source of truth for document requirements.
 *
 * Other sources like VisaType.documentTypes and static fallback checklists
 * are considered legacy or emergency fallbacks and MUST NOT be used
 * as primary rules in new code.
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { normalizeVisaTypeForRules, wasAliasApplied } from '../utils/visa-type-aliases';
import { normalizeCountryCode } from '../config/country-registry';

const prisma = new PrismaClient();

/**
 * Internal helper: Rule set selection result
 */
interface RuleSetSelectionResult {
  ruleSet: any | null; // Prisma VisaRuleSet type
  normalizedCountryCode: string;
  normalizedVisaType: string;
}

/**
 * Internal helper: Find approved rule set with normalization
 * Centralizes the logic for normalizing country/visa codes and querying for approved rule sets.
 *
 * @param countryCodeRaw - Raw country code (may be non-canonical)
 * @param visaTypeRaw - Raw visa type (may be alias)
 * @returns Rule set (or null) with normalized codes
 */
async function findApprovedRuleSet(
  countryCodeRaw: string,
  visaTypeRaw: string
): Promise<RuleSetSelectionResult> {
  // 1) Normalize country code using CountryRegistry
  const normalizedCountryCode =
    normalizeCountryCode(countryCodeRaw) || countryCodeRaw.toUpperCase();

  // 2) Normalize visa type using alias mapping (e.g., "b1/b2 visitor" -> "tourist" for US)
  const normalizedVisaType = normalizeVisaTypeForRules(normalizedCountryCode, visaTypeRaw);

  // Log if alias mapping was applied
  if (wasAliasApplied(normalizedCountryCode, visaTypeRaw, normalizedVisaType)) {
    logInfo(
      `[VisaRules] Using alias mapping: ${visaTypeRaw} → ${normalizedVisaType} for ${normalizedCountryCode}`,
      {
        countryCode: normalizedCountryCode,
        originalVisaType: visaTypeRaw,
        normalizedVisaType,
      }
    );
  }

  // 3) Query Prisma for VisaRuleSet with isApproved = true, ordered by version desc
  const ruleSet = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: normalizedCountryCode,
      visaType: normalizedVisaType,
      isApproved: true,
    },
    orderBy: {
      version: 'desc',
    },
  });

  return {
    ruleSet,
    normalizedCountryCode,
    normalizedVisaType,
  };
}

/**
 * Visa Rule Set Data Structure
 * This matches the JSON schema expected from GPT-4 extraction
 */
export interface VisaRuleSetData {
  // Version/Feature flag for conditional logic
  // If not present, assume version 1 (no conditions)
  // Version 2+ supports condition field
  version?: number; // Default: 1

  // Required Documents
  requiredDocuments: Array<{
    documentType: string; // e.g., "passport", "bank_statement", "i20_form"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string; // e.g., "6 months validity remaining"
    formatRequirements?: string; // e.g., "Original + 2 copies"
    // Condition for conditional inclusion (version 2+)
    // Examples:
    // - "sponsorType !== 'self'" (include only if sponsored)
    // - "currentStatus === 'employed'" (include only if employed)
    // - "previousVisaRejections === true" (include only if previous refusals)
    // - "(sponsorType !== 'self') && (currentStatus === 'employed')" (AND logic)
    // - "(isStudent === true) || (hasUniversityInvitation === true)" (OR logic)
    condition?: string;
  }>;

  // Financial Requirements
  financialRequirements?: {
    minimumBalance?: number;
    currency?: string;
    bankStatementMonths?: number;
    sponsorRequirements?: {
      allowed: boolean;
      requiredDocuments?: string[];
    };
  };

  // Processing Information
  processingInfo?: {
    processingDays?: number;
    appointmentRequired?: boolean;
    interviewRequired?: boolean;
    biometricsRequired?: boolean;
  };

  // Fees
  fees?: {
    visaFee?: number;
    serviceFee?: number;
    currency?: string;
    paymentMethods?: string[];
  };

  // Additional Requirements
  additionalRequirements?: {
    travelInsurance?: {
      required: boolean;
      minimumCoverage?: number;
      currency?: string;
    };
    accommodationProof?: {
      required: boolean;
      types?: string[]; // e.g., ["hotel_booking", "invitation_letter"]
    };
    returnTicket?: {
      required: boolean;
      refundable?: boolean;
    };
  };

  // Source Information
  sourceInfo?: {
    extractedFrom?: string; // URL
    extractedAt?: string; // ISO date
    confidence?: number; // 0-1
  };
}

/**
 * Visa Rules Service
 */
export class VisaRulesService {
  /**
   * Get the latest approved rule set for a country/visa type
   * Applies visa type alias mapping to reuse existing rulesets for equivalent visa types
   *
   * Uses centralized findApprovedRuleSet() helper for normalization and query logic.
   */
  static async getActiveRuleSet(
    countryCode: string,
    visaType: string
  ): Promise<VisaRuleSetData | null> {
    try {
      const { ruleSet, normalizedCountryCode, normalizedVisaType } = await findApprovedRuleSet(
        countryCode,
        visaType
      );

      if (!ruleSet) {
        logWarn('[VisaRules] No approved rule set found', {
          countryCode: normalizedCountryCode,
          visaType,
          normalizedVisaType,
        });
        return null;
      }

      // Handle both Json (PostgreSQL) and String (SQLite) types
      const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;
      return data as VisaRuleSetData;
    } catch (error) {
      logError('[VisaRules] Error getting active rule set', error as Error, {
        countryCode,
        visaType,
      });
      throw error;
    }
  }

  /**
   * Get the full approved rule set with document references (for catalog mode)
   *
   * Uses centralized findApprovedRuleSet() helper for normalization and query logic.
   */
  static async getActiveRuleSetWithReferences(
    countryCode: string,
    visaType: string
  ): Promise<{
    id: string;
    countryCode: string;
    visaType: string;
    data: VisaRuleSetData;
    documentReferences: any[];
  } | null> {
    try {
      const { normalizedCountryCode, normalizedVisaType } = await findApprovedRuleSet(
        countryCode,
        visaType
      );

      // Query with document references included
      const ruleSet = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: normalizedCountryCode,
          visaType: normalizedVisaType,
          isApproved: true,
        },
        orderBy: {
          version: 'desc',
        },
        include: {
          documentReferences: {
            include: {
              document: true,
            },
          },
        },
      });

      if (!ruleSet) {
        return null;
      }

      const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;
      return {
        id: ruleSet.id,
        countryCode: ruleSet.countryCode,
        visaType: ruleSet.visaType,
        data: data as VisaRuleSetData,
        documentReferences: ruleSet.documentReferences,
      };
    } catch (error) {
      logError('[VisaRules] Error getting active rule set with references', error as Error, {
        countryCode,
        visaType,
      });
      return null;
    }
  }

  /**
   * Get the latest rule set (approved or pending) for a country/visa type
   */
  static async getLatestRuleSet(
    countryCode: string,
    visaType: string,
    includePending: boolean = true
  ): Promise<{ data: VisaRuleSetData; isApproved: boolean; version: number } | null> {
    try {
      const ruleSet = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
          ...(includePending ? {} : { isApproved: true }),
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!ruleSet) {
        return null;
      }

      // Handle both Json (PostgreSQL) and String (SQLite) types
      const data = typeof ruleSet.data === 'string' ? JSON.parse(ruleSet.data) : ruleSet.data;
      return {
        data: data as VisaRuleSetData,
        isApproved: ruleSet.isApproved,
        version: ruleSet.version,
      };
    } catch (error) {
      logError('[VisaRules] Error getting latest rule set', error as Error, {
        countryCode,
        visaType,
      });
      throw error;
    }
  }

  /**
   * Create or update a rule set from AI extraction
   */
  static async createOrUpdateRuleSetFromAI(params: {
    countryCode: string;
    visaType: string;
    data: VisaRuleSetData;
    sourceId?: string;
    sourceSummary?: string;
    extractionMetadata?: {
      tokensUsed?: number;
      confidence?: number;
      extractionTime?: number;
      model?: string;
    };
  }): Promise<{ id: string; version: number }> {
    try {
      const { countryCode, visaType, data, sourceId, sourceSummary, extractionMetadata } = params;

      // Normalize document types in requiredDocuments before saving
      const {
        toCanonicalDocumentType,
        logUnknownDocumentType,
      } = require('../config/document-types-map');
      const normalizedData: VisaRuleSetData = {
        ...data,
        requiredDocuments:
          data.requiredDocuments?.map((doc) => {
            const norm = toCanonicalDocumentType(doc.documentType);
            if (!norm.canonicalType) {
              logUnknownDocumentType(doc.documentType, {
                source: 'rules-extraction',
                countryCode,
                visaType,
              });
            }
            return {
              ...doc,
              documentType: norm.canonicalType ?? doc.documentType,
            };
          }) || [],
      };

      // Get the latest version number
      const latest = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
        },
        orderBy: {
          version: 'desc',
        },
      });

      const nextVersion = latest ? latest.version + 1 : 1;

      // Serialize normalized data for database (handle both Json and String types)
      const dataSerialized = JSON.stringify(normalizedData);
      const metadataSerialized = extractionMetadata ? JSON.stringify(extractionMetadata) : null;

      // Create new rule set (unapproved by default)
      const ruleSet = await prisma.visaRuleSet.create({
        data: {
          countryCode: countryCode.toUpperCase(),
          visaType: visaType.toLowerCase(),
          data: dataSerialized as any, // Will be Json in PostgreSQL, String in SQLite
          version: nextVersion,
          createdBy: 'system',
          sourceSummary:
            sourceSummary || `Extracted from ${sourceId ? 'embassy source' : 'manual input'}`,
          sourceId: sourceId || null,
          extractionMetadata: metadataSerialized as any,
          isApproved: false, // Requires admin approval
        },
      });

      // Create version history entry (use normalized data)
      const versionDataSerialized = JSON.stringify(normalizedData);
      await prisma.visaRuleVersion.create({
        data: {
          ruleSetId: ruleSet.id,
          version: nextVersion,
          data: versionDataSerialized as any,
          changeLog: `AI extraction - version ${nextVersion}`,
        },
      });

      logInfo('[VisaRules] Rule set created', {
        id: ruleSet.id,
        countryCode,
        visaType,
        version: nextVersion,
      });

      return { id: ruleSet.id, version: nextVersion };
    } catch (error) {
      logError('[VisaRules] Error creating rule set', error as Error, params);
      throw error;
    }
  }

  /**
   * Approve a rule set (admin action)
   */
  static async approveRuleSet(
    ruleSetId: string,
    approvedBy: string
  ): Promise<{ success: boolean }> {
    try {
      const ruleSet = await prisma.visaRuleSet.findUnique({
        where: { id: ruleSetId },
      });

      if (!ruleSet) {
        throw new Error('Rule set not found');
      }

      // Unapprove all other versions for this country/visa type
      await prisma.visaRuleSet.updateMany({
        where: {
          countryCode: ruleSet.countryCode,
          visaType: ruleSet.visaType,
          id: { not: ruleSetId },
        },
        data: {
          isApproved: false,
        },
      });

      // Approve this version
      await prisma.visaRuleSet.update({
        where: { id: ruleSetId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy,
        },
      });

      logInfo('[VisaRules] Rule set approved', {
        ruleSetId,
        approvedBy,
        countryCode: ruleSet.countryCode,
        visaType: ruleSet.visaType,
      });

      return { success: true };
    } catch (error) {
      logError('[VisaRules] Error approving rule set', error as Error, {
        ruleSetId,
        approvedBy,
      });
      throw error;
    }
  }

  /**
   * Reject a rule set (admin action)
   */
  static async rejectRuleSet(
    ruleSetId: string,
    rejectedBy: string,
    reason: string
  ): Promise<{ success: boolean }> {
    try {
      await prisma.visaRuleSet.update({
        where: { id: ruleSetId },
        data: {
          isApproved: false,
          rejectionReason: reason,
        },
      });

      logInfo('[VisaRules] Rule set rejected', {
        ruleSetId,
        rejectedBy,
        reason,
      });

      return { success: true };
    } catch (error) {
      logError('[VisaRules] Error rejecting rule set', error as Error, {
        ruleSetId,
        rejectedBy,
      });
      throw error;
    }
  }

  /**
   * Update rule set data (admin action)
   * Used for editing conditions and other fields
   */
  static async updateRuleSetData(
    ruleSetId: string,
    data: VisaRuleSetData,
    updatedBy: string
  ): Promise<{ success: boolean; id: string }> {
    try {
      const ruleSet = await prisma.visaRuleSet.findUnique({
        where: { id: ruleSetId },
      });

      if (!ruleSet) {
        throw new Error('Rule set not found');
      }

      // Serialize data for database
      const dataSerialized = JSON.stringify(data);

      // Update rule set
      await prisma.visaRuleSet.update({
        where: { id: ruleSetId },
        data: {
          data: dataSerialized as any,
          updatedAt: new Date(),
          createdBy: updatedBy,
        },
      });

      logInfo('[VisaRules] Rule set data updated', {
        ruleSetId,
        updatedBy,
        countryCode: ruleSet.countryCode,
        visaType: ruleSet.visaType,
      });

      return { success: true, id: ruleSetId };
    } catch (error) {
      logError('[VisaRules] Error updating rule set data', error as Error, {
        ruleSetId,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * List rule sets with filtering
   */
  static async listRuleSets(filters?: {
    countryCode?: string;
    visaType?: string;
    isApproved?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};

      if (filters?.countryCode) {
        where.countryCode = filters.countryCode.toUpperCase();
      }
      if (filters?.visaType) {
        where.visaType = filters.visaType.toLowerCase();
      }
      if (filters?.isApproved !== undefined) {
        where.isApproved = filters.isApproved;
      }

      const [ruleSets, total] = await Promise.all([
        prisma.visaRuleSet.findMany({
          where,
          orderBy: [{ countryCode: 'asc' }, { visaType: 'asc' }, { version: 'desc' }],
          take: filters?.limit || 50,
          skip: filters?.offset || 0,
          include: {
            source: {
              select: {
                id: true,
                url: true,
                name: true,
              },
            },
          },
        }),
        prisma.visaRuleSet.count({ where }),
      ]);

      return {
        ruleSets,
        total,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      };
    } catch (error) {
      logError('[VisaRules] Error listing rule sets', error as Error, filters);
      throw error;
    }
  }

  /**
   * Get rule set by ID
   */
  static async getRuleSetById(ruleSetId: string) {
    try {
      const ruleSet = await prisma.visaRuleSet.findUnique({
        where: { id: ruleSetId },
        include: {
          source: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 10, // Last 10 versions
          },
        },
      });

      return ruleSet;
    } catch (error) {
      logError('[VisaRules] Error getting rule set by ID', error as Error, {
        ruleSetId,
      });
      throw error;
    }
  }

  /**
   * Compare two rule sets and return differences
   */
  static async compareRuleSets(
    ruleSetId1: string,
    ruleSetId2: string
  ): Promise<{
    differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }> {
    try {
      const [ruleSet1, ruleSet2] = await Promise.all([
        prisma.visaRuleSet.findUnique({ where: { id: ruleSetId1 } }),
        prisma.visaRuleSet.findUnique({ where: { id: ruleSetId2 } }),
      ]);

      if (!ruleSet1 || !ruleSet2) {
        throw new Error('One or both rule sets not found');
      }

      // Handle both Json (PostgreSQL) and String (SQLite) types
      const data1 = typeof ruleSet1.data === 'string' ? JSON.parse(ruleSet1.data) : ruleSet1.data;
      const data2 = typeof ruleSet2.data === 'string' ? JSON.parse(ruleSet2.data) : ruleSet2.data;

      const differences: Array<{ field: string; oldValue: any; newValue: any }> = [];

      // Compare required documents
      const docs1 = JSON.stringify(data1.requiredDocuments || []);
      const docs2 = JSON.stringify(data2.requiredDocuments || []);
      if (docs1 !== docs2) {
        differences.push({
          field: 'requiredDocuments',
          oldValue: data1.requiredDocuments,
          newValue: data2.requiredDocuments,
        });
      }

      // Compare financial requirements
      const financial1 = JSON.stringify(data1.financialRequirements || {});
      const financial2 = JSON.stringify(data2.financialRequirements || {});
      if (financial1 !== financial2) {
        differences.push({
          field: 'financialRequirements',
          oldValue: data1.financialRequirements,
          newValue: data2.financialRequirements,
        });
      }

      // Compare processing info
      const processing1 = JSON.stringify(data1.processingInfo || {});
      const processing2 = JSON.stringify(data2.processingInfo || {});
      if (processing1 !== processing2) {
        differences.push({
          field: 'processingInfo',
          oldValue: data1.processingInfo,
          newValue: data2.processingInfo,
        });
      }

      return { differences };
    } catch (error) {
      logError('[VisaRules] Error comparing rule sets', error as Error, {
        ruleSetId1,
        ruleSetId2,
      });
      throw error;
    }
  }
}
