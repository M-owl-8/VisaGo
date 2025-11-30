/**
 * Visa Template Service
 * 
 * Fetches and maps VisaTemplate from database to canonical VisaTemplate type.
 * Part of Phase 2 - Visa Templates & Rule-Based Core.
 */

import { PrismaClient } from '@prisma/client';
import type {
  VisaTemplate as VisaTemplateType,
  VisaEligibilityRule,
  VisaFinancialRequirement,
  VisaOfficialLink,
  VisaProcessingTime,
  VisaSpecialNote,
  VisaRequiredDocumentTemplate,
} from '../types/visa-brain';

// Use singleton pattern to avoid multiple Prisma instances
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    // Lazy import to avoid circular dependencies
    const { default: db } = require('../db');
    prismaInstance = db;
  }
  return prismaInstance;
}

export class VisaTemplateService {
  /**
   * Get VisaTemplate by normalized countryCode and visaTypeCode.
   * Returns null if not found.
   * 
   * @param countryCode - ISO country code (e.g., "US", "CA", "DE")
   * @param visaTypeCode - Normalized visa type code (e.g., "student_long_stay", "tourist_short")
   * @returns VisaTemplateType or null if not found
   */
  static async getTemplate(
    countryCode: string,
    visaTypeCode: string
  ): Promise<VisaTemplateType | null> {
    const prisma = getPrisma();

    const tpl = await prisma.visaTemplate.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaTypeCode,
      },
      include: {
        documents: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!tpl) {
      return null;
    }

    // Parse JSON fields
    let eligibilityRules: VisaEligibilityRule[] = [];
    if (tpl.eligibilityJson) {
      try {
        eligibilityRules = JSON.parse(tpl.eligibilityJson) as VisaEligibilityRule[];
      } catch (e) {
        // Invalid JSON, use empty array
        eligibilityRules = [];
      }
    }

    let financialRequirements: VisaFinancialRequirement[] = [];
    if (tpl.financialRequirementsJson) {
      try {
        financialRequirements = JSON.parse(
          tpl.financialRequirementsJson
        ) as VisaFinancialRequirement[];
      } catch (e) {
        financialRequirements = [];
      }
    }

    let processingTime: VisaProcessingTime | undefined;
    if (tpl.processingTimeJson) {
      try {
        processingTime = JSON.parse(tpl.processingTimeJson) as VisaProcessingTime;
      } catch (e) {
        processingTime = undefined;
      }
    }

    let officialLinks: VisaOfficialLink[] = [];
    if (tpl.officialLinksJson) {
      try {
        officialLinks = JSON.parse(tpl.officialLinksJson) as VisaOfficialLink[];
      } catch (e) {
        officialLinks = [];
      }
    }

    let specialNotes: VisaSpecialNote[] = [];
    if (tpl.specialNotesJson) {
      try {
        specialNotes = JSON.parse(tpl.specialNotesJson) as VisaSpecialNote[];
      } catch (e) {
        specialNotes = [];
      }
    }

    // Map documents
    const requiredDocuments: VisaRequiredDocumentTemplate[] = tpl.documents.map((d) => ({
      id: d.docKey,
      name: d.name,
      whoNeedsIt: d.whoNeedsIt as
        | 'applicant'
        | 'sponsor'
        | 'family_member'
        | 'employer'
        | 'school'
        | 'other',
      description: d.description,
      isCoreRequired: d.isCoreRequired,
      isConditional: d.isConditional,
      conditionDescription: d.conditionDescription ?? undefined,
    }));

    // Build canonical VisaTemplate
    const template: VisaTemplateType = {
      id: tpl.id,
      countryCode: tpl.countryCode,
      countryName: tpl.countryName,
      visaTypeCode: tpl.visaTypeCode,
      visaTypeLabel: tpl.visaTypeLabel,
      version: tpl.version,
      coverageLevel: tpl.coverageLevel as 'CORE' | 'GOOD' | 'BETA',
      eligibilityRules,
      requiredDocuments,
      financialRequirements: financialRequirements.length > 0 ? financialRequirements : undefined,
      processingTime,
      officialLinks: officialLinks.length > 0 ? officialLinks : undefined,
      specialNotes: specialNotes.length > 0 ? specialNotes : undefined,
    };

    return template;
  }
}



