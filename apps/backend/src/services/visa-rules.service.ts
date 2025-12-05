/**
 * Visa Rules Service
 * Manages structured visa rule sets extracted from embassy sources
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { normalizeVisaTypeForRules, wasAliasApplied } from '../utils/visa-type-aliases';

const prisma = new PrismaClient();

/**
 * Visa Rule Set Data Structure
 * This matches the JSON schema expected from GPT-4 extraction
 */
export interface VisaRuleSetData {
  // Required Documents
  requiredDocuments: Array<{
    documentType: string; // e.g., "passport", "bank_statement", "i20_form"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string; // e.g., "6 months validity remaining"
    formatRequirements?: string; // e.g., "Original + 2 copies"
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
   */
  static async getActiveRuleSet(
    countryCode: string,
    visaType: string
  ): Promise<VisaRuleSetData | null> {
    try {
      // Normalize visa type using alias mapping (e.g., "b1/b2 visitor" -> "tourist" for US)
      const normalizedVisaType = normalizeVisaTypeForRules(countryCode, visaType);

      // Log if alias mapping was applied
      if (wasAliasApplied(countryCode, visaType, normalizedVisaType)) {
        logInfo(
          `[VisaRules] Using alias mapping: ${visaType} → ${normalizedVisaType} for ${countryCode}`,
          {
            countryCode,
            originalVisaType: visaType,
            normalizedVisaType,
          }
        );
      }

      const ruleSet = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: countryCode.toUpperCase(),
          visaType: normalizedVisaType,
          isApproved: true,
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!ruleSet) {
        logWarn('[VisaRules] No approved rule set found', {
          countryCode,
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

      // Serialize data for database (handle both Json and String types)
      const dataSerialized = JSON.stringify(data);
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

      // Create version history entry
      await prisma.visaRuleVersion.create({
        data: {
          ruleSetId: ruleSet.id,
          version: nextVersion,
          data: dataSerialized as any,
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

  }
}

  }
}

  }
}
