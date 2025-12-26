/**
 * Visa Checklist Engine Service
 * Uses VisaRuleSet from database + AIUserContext to generate personalized checklists
 * This replaces the old GPT-4-based checklist generation with a rule-based + AI enrichment approach
 */

import { AIOpenAIService } from './ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import { getEnvConfig } from '../config/env';
import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { AIUserContext, CanonicalAIUserContext } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { logChecklistGeneration, extractApplicationId } from '../utils/gpt-logging';
import { z } from 'zod';
import { PROMPT_VERSIONS } from '../ai-training/config';
import { getDocumentTranslation } from '../data/document-translations';
import { BaseChecklistItem } from './checklist-rules.service';
import {
  getCountryVisaPlaybook,
  type VisaCategory,
  type CountryVisaPlaybook,
} from '../config/country-visa-playbooks';
import {
  normalizeCountryCode,
  getCountryNameFromCode,
  assertCountryConsistency,
} from '../config/country-registry';
import {
  VISA_CHECKLIST_SYSTEM_PROMPT_V2,
  buildVisaChecklistUserPromptV2,
} from '../config/ai-prompts';
import { evaluateCondition } from '../utils/condition-evaluator';
import type { ChecklistGenerationMode } from '../types/checklist';

/**
 * Checklist Item Schema (using Zod for validation)
 * Phase 3: Extended with expert fields and source tracking
 */
const ChecklistItemSchema = z.object({
  id: z.string(),
  documentType: z.string(), // Normalized document type (aligned with DocumentCatalog)
  category: z.enum(['required', 'highly_recommended', 'optional']),
  required: z.boolean(),
  name: z.string(),
  nameUz: z.string(),
  nameRu: z.string(),
  description: z.string(),
  appliesToThisApplicant: z.boolean(),
  reasonIfApplies: z.string().optional(),
  extraRecommended: z.boolean().optional(),
  group: z.enum(['identity', 'financial', 'travel', 'education', 'employment', 'ties', 'other']),
  priority: z.number().int().min(1),
  dependsOn: z.array(z.string()).optional(),
  // Phase 3: Source tracking (REQUIRED)
  source: z.enum(['rules', 'ai_extra', 'fallback']).default('rules'),
  ruleSetId: z.string().optional(),
  ruleSetVersion: z.number().optional(),
  embassySourceUrl: z.string().url().optional(),
  // Phase 3: Expert fields (strongly encouraged, but optional for backward compatibility)
  expertReasoning: z
    .object({
      financialRelevance: z.string().nullable().optional(), // Why this document matters for financial sufficiency
      tiesRelevance: z.string().nullable().optional(), // How this document strengthens ties
      riskMitigation: z.array(z.string()).optional(), // Risk factors this document addresses
      embassyOfficerPerspective: z.string().nullable().optional(), // What officers look for
    })
    .optional(),
  financialDetails: z
    .object({
      minRequired: z.number().nullable().optional(), // Minimum funds required
      applicantHas: z.number().nullable().optional(), // What applicant has available
      ratio: z.number().nullable().optional(), // applicantHas / minRequired
      meetsRequirement: z.boolean().optional(), // Whether requirement is met
    })
    .optional(),
  tiesDetails: z
    .object({
      strengthensTies: z.boolean().optional(), // Whether this document strengthens ties
      tiesStrengthContribution: z.number().optional(), // Contribution to ties strength (0.0-1.0)
    })
    .optional(),
  countrySpecificRequirements: z
    .object({
      format: z.string().optional(), // Required format
      apostille: z.boolean().optional(), // Whether apostille required
      translation: z.string().optional(), // Translation requirements
      validityPeriod: z.string().optional(), // Validity period requirements
      officerNotes: z.string().optional(), // Country-specific officer notes
    })
    .optional(),
});

const ChecklistResponseSchema = z.object({
  checklist: z.array(ChecklistItemSchema),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ChecklistResponse = z.infer<typeof ChecklistResponseSchema>;

/**
 * Embassy content cache (in-memory, 5 minute TTL)
 * Reduces database queries for frequently accessed embassy content
 */
interface EmbassyCacheEntry {
  content: string;
  expires: number;
}

const embassyCache = new Map<string, EmbassyCacheEntry>();
const EMBASSY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached embassy content or fetch from database
 */
async function getEmbassyContent(countryCode: string, visaType: string): Promise<string | null> {
  const cacheKey = `${countryCode.toUpperCase()}-${visaType.toLowerCase()}`;
  const cached = embassyCache.get(cacheKey);

  // Return cached content if still valid
  if (cached && cached.expires > Date.now()) {
    return cached.content;
  }

  // Fetch from database
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const source = await prisma.embassySource.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        visaType: visaType.toLowerCase(),
        isActive: true,
      },
      include: {
        pageContents: {
          where: { status: 'success' },
          orderBy: { fetchedAt: 'desc' },
          take: 3,
        },
      },
    });

    await prisma.$disconnect();

    if (source?.pageContents && source.pageContents.length > 0) {
      const combinedText = source.pageContents
        .map((page) => page.cleanedText || '')
        .join('\n\n')
        .substring(0, 2000);

      if (combinedText.length > 0) {
        // Cache the result
        embassyCache.set(cacheKey, {
          content: combinedText,
          expires: Date.now() + EMBASSY_CACHE_TTL_MS,
        });

        return combinedText;
      }
    }

    return null;
  } catch (error) {
    logWarn('[VisaChecklistEngine] Could not fetch embassy content', {
      error: error instanceof Error ? error.message : String(error),
      countryCode,
      visaType,
    });
    return null;
  }
}

/**
 * Visa Checklist Engine Service
 */
export class VisaChecklistEngineService {
  /**
   * Generate personalized checklist from VisaRuleSet + AIUserContext
   */
  static async generateChecklist(
    countryCode: string,
    visaType: string,
    aiUserContext: AIUserContext,
    previousChecklist?: ChecklistItem[],
    explicitRuleSetId?: string
  ): Promise<ChecklistResponse> {
    // Phase 7: Normalize country code using CountryRegistry
    const normalizedCountryCode = normalizeCountryCode(countryCode) || countryCode.toUpperCase();
    const canonicalCountryName = getCountryNameFromCode(normalizedCountryCode);

    // Assert consistency
    const consistency = assertCountryConsistency(
      normalizedCountryCode,
      countryCode,
      aiUserContext.application.country
    );
    if (!consistency.consistent) {
      logWarn('[VisaChecklistEngine] Country consistency check failed', {
        mismatches: consistency.mismatches,
        normalizedCountryCode,
        originalCountryCode: countryCode,
      });
    }

    // Variables for error handling (declared outside try block for catch access)
    let capturedBaseDocuments: any[] = [];
    let capturedRuleSetId: string | null = explicitRuleSetId || null;

    try {
      logInfo('[VisaChecklistEngine] Generating checklist', {
        countryCode: normalizedCountryCode,
        countryName: canonicalCountryName,
        visaType,
        hasPreviousChecklist: !!previousChecklist,
      });

      // Step 1: Get approved VisaRuleSet from database
      // Check if catalog mode is enabled and if we need references
      let useCatalog = false;
      try {
        const config = getEnvConfig();
        useCatalog = config.USE_GLOBAL_DOCUMENT_CATALOG === true;
      } catch (error) {
        // If config parsing fails, fall back to direct env read (for safety)
        useCatalog = process.env.USE_GLOBAL_DOCUMENT_CATALOG === 'true';
      }

      let ruleSet: VisaRuleSetData | null = null;
      let ruleSetId: string | undefined;
      let ruleSetVersion: number | undefined;
      let ruleSetCountryCode: string | undefined;
      let ruleSetVisaType: string | undefined;
      let documentReferences:
        | Array<{
            id: string;
            documentId: string;
            condition?: string | null;
            categoryOverride?: string | null;
          }>
        | undefined;

      if (useCatalog) {
        // Get full ruleSet with references for catalog mode (if available)
        const ruleSetWithRefs = await VisaRulesService.getActiveRuleSetWithReferences(
          normalizedCountryCode,
          visaType.toLowerCase()
        );

        if (ruleSetWithRefs) {
          ruleSet = ruleSetWithRefs.data;
          ruleSetId = ruleSetWithRefs.id;
          ruleSetVersion = ruleSetWithRefs.version;
          ruleSetCountryCode = ruleSetWithRefs.countryCode;
          ruleSetVisaType = ruleSetWithRefs.visaType;
          // Only use catalog if references exist
          if (ruleSetWithRefs.documentReferences && ruleSetWithRefs.documentReferences.length > 0) {
            documentReferences = ruleSetWithRefs.documentReferences.map((ref) => ({
              id: ref.id,
              documentId: ref.documentId,
              condition: ref.condition,
              categoryOverride: ref.categoryOverride,
            }));
          }
        } else {
          // No rule set found, will fall back to legacy mode
          useCatalog = false;
        }
      }

      // If catalog mode not enabled or no references, get just the data
      if (!useCatalog || !documentReferences || documentReferences.length === 0) {
        if (!ruleSet) {
          ruleSet = await VisaRulesService.getActiveRuleSet(
            normalizedCountryCode,
            visaType.toLowerCase()
          );
          ruleSetVersion = (ruleSet as any)?.version ?? ruleSetVersion;
        }
        // Clear references if we're not using catalog mode
        documentReferences = undefined;
      }

      if (!ruleSet) {
        logInfo('[VisaChecklistEngine] No approved rule set found, returning null for fallback', {
          countryCode,
          visaType,
        });
        // Return null so caller can fall back to legacy mode
        return null as any;
      }

      // Step 2: Build base checklist from rules (documents are determined here)
      const { buildBaseChecklistFromRules } = await import('./checklist-rules.service');
      const baseDocuments = await buildBaseChecklistFromRules(aiUserContext, ruleSet, {
        ruleSetId,
        countryCode: ruleSetCountryCode,
        visaType: ruleSetVisaType,
        documentReferences,
      });

      // Store for error handling
      capturedBaseDocuments = baseDocuments;
      capturedRuleSetId = ruleSetId || null;

      if (baseDocuments.length === 0) {
        const ruleSetDocumentCount = ruleSet?.requiredDocuments?.length || 0;
        logError(
          '[ChecklistRules] Rules misconfigured: produced 0 items with ruleSetDocumentCount > 0',
          new Error('Base checklist is empty despite available rules'),
          {
            countryCode,
            visaType,
            ruleSetDocumentCount,
            ruleSetId: ruleSetId || 'unknown',
            suggestion: 'Check rule set configuration and document catalog references',
          }
        );
        return null as any;
      }

      // Step 3: Get optional embassy summary (if available)
      // Phase 6: Also extract embassy rules confidence
      let embassySummary: string | undefined;
      let embassyRulesConfidence: number | null = ruleSet.sourceInfo?.confidence ?? null;

      // Phase 3: Get country visa playbook
      // Derive visaCategory from visaType (tourist vs student)
      const visaCategory: VisaCategory =
        visaType.toLowerCase().includes('student') ||
        visaType.toLowerCase().includes('study') ||
        visaType.toLowerCase() === 'f-1' ||
        visaType.toLowerCase() === 'j-1'
          ? 'student'
          : 'tourist';
      const playbook = getCountryVisaPlaybook(normalizedCountryCode, visaCategory);

      // Fetch embassy content with caching (reduces database queries)
      const embassyContent = await getEmbassyContent(normalizedCountryCode, visaType);
      if (embassyContent) {
        embassySummary = embassyContent;
        logInfo('[VisaChecklistEngine] Using embassy content (cached or fresh)', {
          countryCode: normalizedCountryCode,
          visaType,
          textLength: embassyContent.length,
        });
      }

      // Step 4: Build canonical context for V2 prompts
      const canonicalContext = await buildCanonicalAIUserContext(aiUserContext);

      // Step 5: Use Phase 3 V2 prompts (centralized, expert-level)
      const systemPrompt = VISA_CHECKLIST_SYSTEM_PROMPT_V2;
      const userPrompt = buildVisaChecklistUserPromptV2(
        canonicalContext,
        ruleSet,
        baseDocuments,
        playbook || undefined,
        embassySummary
      );

      // Step 4: Resolve model from registry (with fallback)
      // Use centralized config as base, then resolve via registry if available
      const aiConfig = getAIConfig('checklist');
      const defaultChecklistModel = aiConfig.model;
      const modelRouting = await AIOpenAIService['resolveModelForTask'](
        'checklist_enrichment',
        defaultChecklistModel
      );
      const checklistModel = modelRouting.modelName;
      const modelVersionId = modelRouting.modelVersionId;

      logInfo('[VisaChecklistEngine] Calling GPT-4 for checklist generation', {
        task: 'checklist_enrichment',
        model: checklistModel,
        modelVersionId,
        countryCode,
        visaType,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      const startTime = Date.now();
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: checklistModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[VisaChecklistEngine] GPT-4 response received', {
        task: 'checklist_enrichment',
        model: response?.model || checklistModel,
        countryCode,
        visaType,
        responseLength: rawContent.length,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      // Step 5: Parse and validate JSON (using robust extraction)
      let parsed: any;
      let jsonValidationRetries = 0;
      let jsonValidationPassed = false;

      // Use robust JSON extraction from json-validator
      const { extractJsonFromResponse } = await import('../utils/json-validator');
      const extractedJson = extractJsonFromResponse(rawContent);

      if (!extractedJson) {
        // Log response preview for debugging (non-PII)
        const responsePreview = rawContent.substring(0, 500);
        logError(
          '[VisaChecklistEngine] No valid JSON found in response',
          new Error('No valid JSON found in response'),
          {
            countryCode,
            visaType,
            responseLength: rawContent.length,
            responsePreview: responsePreview.replace(/\n/g, ' ').substring(0, 200), // First 200 chars, no newlines
          }
        );
        throw new Error('No valid JSON found in response');
      }

      try {
        parsed = JSON.parse(extractedJson);
        jsonValidationPassed = true;
      } catch (parseError) {
        jsonValidationRetries++;
        logError(
          '[VisaChecklistEngine] JSON parse failed after extraction',
          parseError instanceof Error ? parseError : new Error(String(parseError)),
          {
            countryCode,
            visaType,
            extractedJsonPreview: extractedJson.substring(0, 200),
          }
        );
        throw new Error(
          `Failed to parse extracted JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      // Step 6: Debug logging - inspect parsed JSON shape (DEV ONLY, no PII)
      const parsedKeys = Object.keys(parsed || {});
      const isArray = Array.isArray(parsed);
      const hasChecklist = !!(parsed as any)?.checklist;
      const hasItems = Array.isArray((parsed as any)?.items);
      const hasDocuments = Array.isArray((parsed as any)?.documents);

      logWarn('[VisaChecklistEngine][Debug] Raw GPT JSON shape', {
        countryCode,
        visaType,
        keys: parsedKeys,
        isArray,
        hasChecklist,
        hasItems,
        hasDocuments,
        topLevelType: typeof parsed,
        sampleKey: parsedKeys[0] || 'none',
      });

      // Step 6.5: Tolerant adapter - try to find checklist array under different keys
      let normalizedParsed = parsed;
      if (!hasChecklist) {
        // Try to find the checklist array under common alternative keys
        if (isArray) {
          // If parsed is directly an array, wrap it
          normalizedParsed = { checklist: parsed };
          logWarn('[VisaChecklistEngine][Adapter] Wrapped array response', {
            countryCode,
            visaType,
            arrayLength: parsed.length,
          });
        } else if (hasItems && Array.isArray((parsed as any).items)) {
          // If it's under "items" key
          normalizedParsed = { checklist: (parsed as any).items };
          logWarn('[VisaChecklistEngine][Adapter] Mapped items -> checklist', {
            countryCode,
            visaType,
            itemsLength: (parsed as any).items.length,
          });
        } else if (hasDocuments && Array.isArray((parsed as any).documents)) {
          // If it's under "documents" key
          normalizedParsed = { checklist: (parsed as any).documents };
          logWarn('[VisaChecklistEngine][Adapter] Mapped documents -> checklist', {
            countryCode,
            visaType,
            documentsLength: (parsed as any).documents.length,
          });
        } else {
          // Check if top-level is a single checklist item object (has documentType, category, etc.)
          const looksLikeChecklistItem =
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            ((parsed as any).documentType ||
              (parsed as any).document ||
              ((parsed as any).category && (parsed as any).name));

          if (looksLikeChecklistItem) {
            // Wrap single item as array
            normalizedParsed = { checklist: [parsed] };
            logWarn('[VisaChecklistEngine][Adapter] Wrapped single checklist item object', {
              countryCode,
              visaType,
              hasDocumentType: !!(parsed as any).documentType,
              hasCategory: !!(parsed as any).category,
            });
          } else {
            // Try to find any array-valued property
            for (const key of parsedKeys) {
              const value = (parsed as any)[key];
              if (Array.isArray(value) && value.length > 0) {
                // Check if first item looks like a checklist item (has documentType or similar)
                const firstItem = value[0];
                if (
                  firstItem &&
                  typeof firstItem === 'object' &&
                  (firstItem.documentType || firstItem.document || firstItem.id || firstItem.name)
                ) {
                  normalizedParsed = { checklist: value };
                  logWarn('[VisaChecklistEngine][Adapter] Mapped array property to checklist', {
                    countryCode,
                    visaType,
                    sourceKey: key,
                    arrayLength: value.length,
                  });
                  break;
                }
              }
            }
          }
        }
      }

      // Step 6: Validate against schema (with normalized response)
      let validationResult = ChecklistResponseSchema.safeParse(normalizedParsed);

      if (!validationResult.success) {
        jsonValidationRetries++;
        logError(
          '[VisaChecklistEngine] Schema validation failed',
          new Error('Invalid checklist structure'),
          {
            countryCode,
            visaType,
            errors: validationResult.error.errors,
            normalizedKeys: Object.keys(normalizedParsed || {}),
            normalizedHasChecklist: !!(normalizedParsed as any)?.checklist,
            normalizedChecklistIsArray: Array.isArray((normalizedParsed as any)?.checklist),
            normalizedChecklistLength: Array.isArray((normalizedParsed as any)?.checklist)
              ? (normalizedParsed as any).checklist.length
              : 'not-array',
          }
        );
      } else {
        // Additional validation: ensure all base documents are present and no extras
        const responseDocTypes = new Set(
          validationResult.data.checklist.map((item) => item.documentType)
        );
        const baseDocTypes = new Set(baseDocuments.map((doc) => doc.documentType));

        const missing = Array.from(baseDocTypes).filter((dt) => !responseDocTypes.has(dt));
        const extra = Array.from(responseDocTypes).filter((dt) => !baseDocTypes.has(dt));

        if (missing.length > 0 || extra.length > 0) {
          logWarn('[VisaChecklistEngine] Document type mismatch', {
            countryCode,
            visaType,
            missing,
            extra,
          });

          // Fix: remove extras, add missing using ruleset content
          const fixedChecklist = [...validationResult.data.checklist];

          // Remove extras (documents not in base ruleset)
          const filtered = fixedChecklist.filter((item) => baseDocTypes.has(item.documentType));

          // Build a Map of base documents for quick lookup
          const baseDocMap = new Map<string, BaseChecklistItem>();
          for (const doc of baseDocuments) {
            baseDocMap.set(doc.documentType, doc);
          }

          // Build a Map of ruleSet document definitions for metadata
          const ruleSetDocMap = new Map<string, any>();
          if (ruleSet?.requiredDocuments) {
            for (const doc of ruleSet.requiredDocuments) {
              ruleSetDocMap.set(doc.documentType, doc);
            }
          }

          // Add missing documents using ruleset content (not generic placeholders)
          for (const docType of missing) {
            const baseDoc = baseDocMap.get(docType);
            const ruleSetDoc = ruleSetDocMap.get(docType);

            if (baseDoc) {
              // Use ruleset description if available, otherwise use document type
              const description =
                ruleSetDoc?.description ||
                (ruleSetDoc?.validityRequirements && ruleSetDoc?.formatRequirements
                  ? `${ruleSetDoc.validityRequirements}. ${ruleSetDoc.formatRequirements}`
                  : ruleSetDoc?.validityRequirements ||
                    ruleSetDoc?.formatRequirements ||
                    `Required document: ${baseDoc.documentType}`);

              // Get document translation for names
              const { getDocumentTranslation } = await import('../data/document-translations');
              const translation = getDocumentTranslation(baseDoc.documentType);

              filtered.push({
                id: `DOC_${filtered.length + 1}`,
                documentType: baseDoc.documentType,
                category: baseDoc.category as 'required' | 'highly_recommended' | 'optional',
                required: baseDoc.required,
                name: translation?.nameEn || baseDoc.documentType,
                nameUz: translation?.nameUz || baseDoc.documentType,
                nameRu: translation?.nameRu || baseDoc.documentType,
                description: description,
                appliesToThisApplicant: true,
                reasonIfApplies:
                  ruleSetDoc?.description ||
                  (baseDoc.category === 'required'
                    ? 'Required by embassy rules'
                    : 'Recommended for this visa application'),
                extraRecommended: false,
                group: this.inferDocumentGroup(baseDoc.documentType),
                priority: filtered.length + 1, // Will be normalized later based on category
                source: 'rules' as const,
              });
            }
          }

          normalizedParsed = { checklist: filtered };
          // Re-validate after fix
          validationResult = ChecklistResponseSchema.safeParse(normalizedParsed);
        }
      }

      if (!validationResult.success) {
        jsonValidationRetries++;

        // Phase 1: Distinguish hard failures vs soft issues
        const hardFailures = validationResult.error.errors.filter((e) => {
          const path = e.path.join('.');
          // Hard failures: missing checklist array, invalid structure, empty checklist
          return (
            (path.includes('checklist') &&
              e.code === 'invalid_type' &&
              e.received === 'undefined') ||
            (path === '' && e.message.includes('Required')) ||
            (normalizedParsed &&
              (normalizedParsed as any).checklist &&
              Array.isArray((normalizedParsed as any).checklist) &&
              (normalizedParsed as any).checklist.length === 0)
          );
        });

        // If hard failure, throw immediately (will trigger base-rules fallback)
        if (hardFailures.length > 0) {
          logError(
            '[VisaChecklistEngine] Hard validation failure - checklist structure broken',
            new Error('Hard validation failure'),
            {
              countryCode,
              visaType,
              hardFailures: hardFailures.map((e) => e.message),
              allErrors: validationResult.error.errors.map((e) => e.message),
            }
          );
          throw new Error(
            `Hard validation failure: ${hardFailures.map((e) => e.message).join(', ')}`
          );
        }

        // Soft issues: missing optional fields, minor schema issues - try to fix
        logWarn('[VisaChecklistEngine] Soft validation issues detected, attempting auto-fix', {
          countryCode,
          visaType,
          errors: validationResult.error.errors.map((e) => e.message),
        });

        // Try to fix common issues
        const fixed = this.fixCommonIssues(normalizedParsed);
        const fixedValidation = ChecklistResponseSchema.safeParse(fixed);

        if (!fixedValidation.success) {
          // If auto-fix failed, check if it's still a hard failure
          const stillHardFailures = fixedValidation.error.errors.filter((e) => {
            const path = e.path.join('.');
            return (
              (path.includes('checklist') &&
                e.code === 'invalid_type' &&
                e.received === 'undefined') ||
              (path === '' && e.message.includes('Required'))
            );
          });

          if (stillHardFailures.length > 0) {
            throw new Error(
              `Hard validation failure after fix attempt: ${stillHardFailures.map((e) => e.message).join(', ')}`
            );
          }

          // If it's still soft issues after fix, log but don't fail - we'll use what we have
          logWarn('[VisaChecklistEngine] Auto-fix partially succeeded, using corrected checklist', {
            countryCode,
            visaType,
            remainingErrors: fixedValidation.error.errors.map((e) => e.message),
          });
        }

        normalizedParsed = fixedValidation.success ? fixedValidation.data : fixed;
        parsed = normalizedParsed;
        jsonValidationPassed = true;
      } else {
        parsed = normalizedParsed;
        jsonValidationPassed = true;
      }

      // Phase 3: Validate and enrich checklist items
      const conditionedChecklist = VisaChecklistEngineService.applyConditions(
        validationResult.success ? validationResult.data.checklist : parsed.checklist,
        aiUserContext,
        ruleSet
      );

      const validatedChecklist = this.validateAndEnrichChecklistItems(
        conditionedChecklist,
        baseDocuments,
        {
          ruleSetId: ruleSetId || capturedRuleSetId || null,
          ruleSetVersion: ruleSetVersion || null,
          embassySourceUrl: (ruleSet as any)?.sourceInfo?.extractedFrom || null,
          generationMode: 'rules',
        }
      );

      // Normalize priorities according to category (before risk-weighted prioritization)
      for (const item of validatedChecklist) {
        switch (item.category) {
          case 'required':
            item.priority = 1; // High priority for required documents
            break;
          case 'highly_recommended':
            if (!item.priority || item.priority > 5) {
              item.priority = 3; // Medium priority
            }
            break;
          case 'optional':
            if (!item.priority || item.priority <= 3) {
              item.priority = 5; // Low priority
            }
            break;
        }
      }

      // Phase 3: Apply risk-weighted prioritization (may adjust priorities further)
      const canonical = await buildCanonicalAIUserContext(aiUserContext);
      parsed.checklist = this.applyRiskWeightedPrioritization(validatedChecklist, canonical);

      // Get condition warnings from base documents (reuse already computed baseDocuments)
      const conditionWarnings: string[] = [];
      // Note: condition warnings are logged in buildBaseChecklistFromRules, but we'll capture them here if needed

      // Extract application ID for logging
      const applicationId = extractApplicationId(aiUserContext);

      // Get country name (try to get from context or use code)
      const contextCountryName =
        (aiUserContext as any)?.application?.country?.name || canonicalCountryName;

      // Phase 3: Get risk drivers and risk level for logging
      const riskDrivers = (canonical as any)?.riskDrivers || [];
      const riskLevel = canonical?.riskScore?.level || 'medium';

      // Phase 3: Compute logging metrics
      const rulesItemsCount = parsed.checklist.filter(
        (item: ChecklistItem) => item.source === 'rules'
      ).length;
      const aiExtraItemsCount = parsed.checklist.filter(
        (item: ChecklistItem) => item.source === 'ai_extra'
      ).length;
      const requiredCount = parsed.checklist.filter(
        (item: ChecklistItem) => item.category === 'required'
      ).length;
      const highlyRecommendedCount = parsed.checklist.filter(
        (item: ChecklistItem) => item.category === 'highly_recommended'
      ).length;
      const optionalCount = parsed.checklist.filter(
        (item: ChecklistItem) => item.category === 'optional'
      ).length;

      // Calculate expert fields coverage
      const itemsWithExpertReasoning = parsed.checklist.filter((item: ChecklistItem) => {
        const er = item.expertReasoning;
        return (
          er &&
          (er.financialRelevance ||
            er.tiesRelevance ||
            (er.riskMitigation && er.riskMitigation.length > 0) ||
            er.embassyOfficerPerspective)
        );
      }).length;
      const expertFieldsCoverage =
        parsed.checklist.length > 0
          ? (itemsWithExpertReasoning / parsed.checklist.length) * 100
          : 0;

      // Log structured checklist generation with Phase 3 metrics
      logChecklistGeneration({
        applicationId,
        country: contextCountryName,
        countryCode,
        visaType,
        mode: 'rules',
        jsonValidationPassed,
        jsonValidationRetries,
        itemCount: parsed.checklist.length,
        conditionWarnings: conditionWarnings.length > 0 ? conditionWarnings : undefined,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
        // Phase 2: Risk drivers and risk level
        riskDrivers: riskDrivers.length > 0 ? riskDrivers : undefined,
        riskLevel,
        // Phase 3: Embassy rules and playbook metadata
        hasVisaRuleSet: !!ruleSet,
        hasEmbassyContent: !!embassySummary,
        hasCountryPlaybook: !!playbook,
        rulesConfidence: ruleSet?.sourceInfo?.confidence ?? null,
        playbookCountryCode: playbook?.countryCode,
        playbookVisaCategory: playbook?.visaCategory,
        // Phase 3: Source tracking and expert fields metrics
        rulesItemsCount,
        aiExtraItemsCount,
        requiredCount,
        highlyRecommendedCount,
        optionalCount,
        expertFieldsCoverage: Math.round(expertFieldsCoverage * 100) / 100, // Round to 2 decimals
      });

      // Phase 3: Log warning if ai_extra count is high (already handled in validateAndEnrichChecklistItems, but log for visibility)
      if (aiExtraItemsCount > 3) {
        logWarn('[VisaChecklistEngine][Phase3] High ai_extra count detected', {
          aiExtraItemsCount,
          countryCode,
          visaType,
        });
      }

      logInfo('[VisaChecklistEngine] Checklist generated successfully', {
        countryCode,
        visaType,
        itemCount: parsed.checklist.length,
      });

      // Record AI interaction for training data pipeline
      const userId = (aiUserContext as any)?.userProfile?.userId;
      const promptVersion =
        process.env.USE_COMPACT_CHECKLIST_PROMPTS !== 'false'
          ? PROMPT_VERSIONS.CHECKLIST_PROMPT_V2_EXPERT
          : PROMPT_VERSIONS.CHECKLIST_PROMPT_V1;
      const source = process.env.AI_EVAL_MODE === 'true' ? ('eval' as const) : ('prod' as const);

      await AIOpenAIService['recordAIInteraction']({
        taskType: 'checklist_enrichment',
        model: checklistModel,
        promptVersion,
        source,
        modelVersionId,
        requestPayload: {
          systemPrompt,
          userPrompt,
          countryCode,
          visaType,
          baseDocuments,
          canonicalAIUserContext: canonical,
          embassySummary,
        },
        responsePayload: parsed,
        success: true,
        contextMeta: {
          countryCode,
          visaType,
          ruleSetId,
          applicationId,
          userId,
        },
      }).catch((err) => {
        // Don't fail the request if logging fails
        logWarn('[VisaChecklistEngine] Failed to record AI interaction', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      logInfo('[VisaChecklistEngine] Checklist generated successfully', {
        task: 'checklist_enrichment',
        model: checklistModel,
        countryCode,
        visaType,
        itemCount: parsed.checklist.length,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      return parsed as ChecklistResponse;
    } catch (error) {
      const applicationId = extractApplicationId(aiUserContext);
      const countryName = (aiUserContext as any)?.application?.country?.name || countryCode;
      const userId = (aiUserContext as any)?.userProfile?.userId;
      const promptVersion =
        process.env.USE_COMPACT_CHECKLIST_PROMPTS !== 'false'
          ? PROMPT_VERSIONS.CHECKLIST_PROMPT_V2_EXPERT
          : PROMPT_VERSIONS.CHECKLIST_PROMPT_V1;
      const source = process.env.AI_EVAL_MODE === 'true' ? ('eval' as const) : ('prod' as const);

      // Record failed interaction (use captured values if available)
      const failedBaseDocuments = capturedBaseDocuments || [];
      const failedRuleSetId = capturedRuleSetId || null;

      const aiConfig = getAIConfig('checklist');
      await AIOpenAIService['recordAIInteraction']({
        taskType: 'checklist_enrichment',
        model: aiConfig.model,
        promptVersion,
        source,
        requestPayload: {
          countryCode,
          visaType,
          baseDocuments: failedBaseDocuments,
        },
        responsePayload: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        contextMeta: {
          countryCode,
          visaType,
          ruleSetId: failedRuleSetId,
          applicationId,
          userId,
        },
      }).catch(() => {
        // Ignore logging errors
      });

      logChecklistGeneration({
        applicationId,
        country: countryName,
        countryCode,
        visaType,
        mode: 'rules',
        jsonValidationPassed: false,
        jsonValidationRetries: 0,
        itemCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });

      logError('[VisaChecklistEngine] Checklist generation failed', error as Error, {
        countryCode,
        visaType,
      });

      // Phase 1: Rules-first fallback - if we have base documents, return base-rules checklist
      if (capturedBaseDocuments && capturedBaseDocuments.length > 0) {
        logWarn('[VisaChecklistEngine] GPT enrichment failed, using base-rules fallback', {
          countryCode,
          visaType,
          baseDocumentCount: capturedBaseDocuments.length,
          error: error instanceof Error ? error.message : String(error),
        });

        const baseRulesChecklist = this.buildBaseRulesChecklist(
          capturedBaseDocuments,
          countryCode,
          visaType
        );

        // Phase 2: Get risk drivers and risk level from canonical context
        // Try to build canonical context if we have aiUserContext
        let riskDrivers: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' = 'medium';
        try {
          const { buildCanonicalAIUserContext } = await import('./ai-context.service');
          const fallbackCanonicalContext = await buildCanonicalAIUserContext(aiUserContext);
          riskDrivers = (fallbackCanonicalContext as any)?.riskDrivers || [];
          riskLevel = fallbackCanonicalContext?.riskScore?.level || 'medium';
        } catch (err) {
          // If we can't build canonical context, use defaults
          logWarn('[VisaChecklistEngine] Could not build canonical context for risk drivers', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Log the fallback
        logChecklistGeneration({
          applicationId,
          country: countryName,
          countryCode,
          visaType,
          mode: 'rules_base_fallback',
          jsonValidationPassed: true,
          jsonValidationRetries: 0,
          itemCount: baseRulesChecklist.checklist.length,
          fallbackReason: 'GPT enrichment failed, using base rules',
          // Phase 2: Risk drivers and risk level
          riskDrivers: riskDrivers.length > 0 ? riskDrivers : undefined,
          riskLevel,
        });

        logInfo('[VisaChecklistEngine] Base-rules checklist generated (fallback)', {
          countryCode,
          visaType,
          itemCount: baseRulesChecklist.checklist.length,
          generationMode: 'rules_base_fallback',
        });

        return baseRulesChecklist;
      }

      // No base documents available - return null so caller can fall back to legacy/static
      return null as any;
    }
  }

  /**
   * Build base-rules checklist from BaseChecklistItem[] (Phase 1: Rules-first fallback)
   *
   * This function converts base rules documents into a full ChecklistResponse
   * without GPT enrichment. Used when GPT enrichment fails but rules are available.
   *
   * Features:
   * - Uses document translations for names/descriptions
   * - Includes Uzbek context in descriptions ("Obtain from your bank in Uzbekistan")
   * - Sets appliesToThisApplicant = true for all documents (conservative approach)
   * - Generates simple but professional tri-language content
   * - Maintains document priority based on category
   */
  private static buildBaseRulesChecklist(
    baseDocuments: BaseChecklistItem[],
    countryCode: string,
    visaType: string
  ): ChecklistResponse {
    const checklist: ChecklistItem[] = baseDocuments.map((baseDoc, index) => {
      const translation = getDocumentTranslation(baseDoc.documentType);

      // Infer document group from documentType
      const group = this.inferDocumentGroup(baseDoc.documentType);

      // Calculate priority: required = 1-10, highly_recommended = 11-20, optional = 21+
      let priority = index + 1;
      if (baseDoc.category === 'required') {
        priority = index + 1; // 1, 2, 3, ...
      } else if (baseDoc.category === 'highly_recommended') {
        priority = 10 + (index + 1); // 11, 12, 13, ...
      } else {
        priority = 20 + (index + 1); // 21, 22, 23, ...
      }

      // Build description with Uzbek context
      const description = this.buildBaseDescription(
        baseDoc.documentType,
        translation.descriptionEn,
        countryCode,
        visaType
      );
      const descriptionUz = this.buildBaseDescriptionUz(
        baseDoc.documentType,
        translation.descriptionUz,
        countryCode,
        visaType
      );
      const descriptionRu = this.buildBaseDescriptionRu(
        baseDoc.documentType,
        translation.descriptionRu,
        countryCode,
        visaType
      );

      return {
        id: `DOC_${baseDoc.documentType}_${index + 1}`,
        documentType: baseDoc.documentType,
        category: baseDoc.category,
        required: baseDoc.required,
        name: translation.nameEn || baseDoc.documentType,
        nameUz: translation.nameUz || baseDoc.documentType,
        nameRu: translation.nameRu || baseDoc.documentType,
        description,
        descriptionUz,
        descriptionRu,
        appliesToThisApplicant: true, // Conservative: include all base documents
        reasonIfApplies: this.buildBaseReasonIfApplies(baseDoc, countryCode, visaType),
        extraRecommended: baseDoc.category === 'highly_recommended',
        group,
        priority,
        dependsOn: [],
        source: 'rules' as const, // Phase 3: Base documents are from rules
      };
    });

    return { checklist };
  }

  /**
   * Infer document group from documentType
   */
  private static inferDocumentGroup(documentType: string): ChecklistItem['group'] {
    const type = documentType.toLowerCase();
    if (type.includes('passport') || type.includes('photo') || type.includes('identity')) {
      return 'identity';
    }
    if (
      type.includes('bank') ||
      type.includes('financial') ||
      type.includes('sponsor') ||
      type.includes('income')
    ) {
      return 'financial';
    }
    if (
      type.includes('travel') ||
      type.includes('itinerary') ||
      type.includes('hotel') ||
      type.includes('flight')
    ) {
      return 'travel';
    }
    if (
      type.includes('education') ||
      type.includes('academic') ||
      type.includes('student') ||
      type.includes('degree') ||
      type.includes('i20') ||
      type.includes('acceptance')
    ) {
      return 'education';
    }
    if (type.includes('employment') || type.includes('job') || type.includes('work')) {
      return 'employment';
    }
    if (
      type.includes('property') ||
      type.includes('family') ||
      type.includes('marriage') ||
      type.includes('birth') ||
      type.includes('ties')
    ) {
      return 'ties';
    }
    return 'other';
  }

  /**
   * Build base description with country/visa context
   */
  private static buildBaseDescription(
    documentType: string,
    baseDescription: string,
    countryCode: string,
    visaType: string
  ): string {
    // Enhance description with country-specific context
    if (documentType.includes('bank_statement')) {
      return `${baseDescription} For ${countryCode} ${visaType} visa, typically required for the last 3-6 months. Obtain from your bank in Uzbekistan.`;
    }
    if (documentType.includes('property')) {
      return `${baseDescription} Obtain property documents (kadastr) from the cadastral office in Uzbekistan.`;
    }
    if (documentType.includes('employment')) {
      return `${baseDescription} Obtain from your employer in Uzbekistan. Should be on company letterhead with official seal.`;
    }
    return baseDescription;
  }

  /**
   * Build base description in Uzbek
   */
  private static buildBaseDescriptionUz(
    documentType: string,
    baseDescription: string,
    countryCode: string,
    visaType: string
  ): string {
    if (documentType.includes('bank_statement')) {
      return `${baseDescription} ${countryCode} ${visaType} viza uchun odatda oxirgi 3-6 oy talab qilinadi. O'zbekistondagi bankingizdan oling.`;
    }
    if (documentType.includes('property')) {
      return `${baseDescription} Mulk hujjatlari (kadastr) O'zbekistondagi kadastr idorasidan oling.`;
    }
    if (documentType.includes('employment')) {
      return `${baseDescription} O'zbekistondagi ish beruvchingizdan oling. Kompaniya blankasida va rasmiy muhr bilan bo'lishi kerak.`;
    }
    return baseDescription;
  }

  /**
   * Build base description in Russian
   */
  private static buildBaseDescriptionRu(
    documentType: string,
    baseDescription: string,
    countryCode: string,
    visaType: string
  ): string {
    if (documentType.includes('bank_statement')) {
      return `${baseDescription} Для визы ${countryCode} ${visaType} обычно требуется за последние 3-6 месяцев. Получите в вашем банке в Узбекистане.`;
    }
    if (documentType.includes('property')) {
      return `${baseDescription} Получите документы на недвижимость (кадастр) в кадастровом офисе в Узбекистане.`;
    }
    if (documentType.includes('employment')) {
      return `${baseDescription} Получите от вашего работодателя в Узбекистане. Должно быть на бланке компании с официальной печатью.`;
    }
    return baseDescription;
  }

  /**
   * Build reasonIfApplies for base rules checklist
   */
  private static buildBaseReasonIfApplies(
    baseDoc: BaseChecklistItem,
    countryCode: string,
    visaType: string
  ): string {
    if (baseDoc.category === 'required') {
      return `Required by ${countryCode} embassy for ${visaType} visa applications. This document is mandatory and must be included.`;
    }
    if (baseDoc.category === 'highly_recommended') {
      return `Highly recommended for ${countryCode} ${visaType} visa. This document strengthens your application and demonstrates compliance with embassy requirements.`;
    }
    return `Optional but recommended for ${countryCode} ${visaType} visa. This document may help strengthen your application.`;
  }

  /**
   * Generate checklist for an application (convenience method)
   * @param application - Application object with country and visaType
   * @param aiUserContext - AI user context with questionnaire data
   * @returns ChecklistResponse or null if no rules exist or generation fails
   */
  static async generateChecklistForApplication(
    application: { country: { code: string; name: string }; visaType: { name: string } },
    aiUserContext: AIUserContext,
    ruleSetId?: string
  ): Promise<ChecklistResponse | null> {
    const countryCode = application.country.code.toUpperCase();
    const visaType = application.visaType.name.toLowerCase();

    return this.generateChecklist(countryCode, visaType, aiUserContext, undefined, ruleSetId);
  }

  /**
   * Build system prompt for checklist generation (EXPERT VERSION - Phase 3)
   * GPT acts as an expert visa officer with deep immigration reasoning
   *
   * Phase 3 Upgrade (Expert Officer Mode):
   * - Specialized for 10 destination countries (US, UK, Germany, Spain, Canada, Australia, Japan, Korea, UAE, Schengen)
   * - Deep understanding of Uzbek applicant context (Uzbek banks, kadastr documents, employment patterns)
   * - Uses pre-computed expert fields (financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore) for expert reasoning
   * - Country-specific patterns, terminology, and common refusal reasons
   * - Few-shot examples showing expert reasoning patterns
   * - Expert-level appliesToThisApplicant decisions based on risk profile
   * - Expert-level reasonIfApplies explanations referencing metrics and Uzbek context
   *
   * Key Behavior:
   * - GPT receives BASE_DOCUMENTS from VisaRuleSet (cannot add/remove)
   * - GPT enriches documents with: appliesToThisApplicant, reasonIfApplies, tri-language names/descriptions
   * - Expert fields guide decisions: low funds → emphasize financial docs, weak ties → emphasize ties docs
   * - Uzbek context naturally referenced in descriptions and reasoning
   * - Country-specific terminology used (e.g., US: "Form I-20", Canada: "LOA", UK: "CAS")
   */
  private static buildSystemPrompt(
    countryCode: string,
    visaType: string,
    ruleSet: VisaRuleSetData,
    embassySummary?: string,
    playbook?: CountryVisaPlaybook
  ): string {
    // Phase 6: Check embassy rules confidence
    const embassyRulesConfidence = ruleSet.sourceInfo?.confidence ?? null;
    const hasHighConfidenceRules = embassyRulesConfidence !== null && embassyRulesConfidence >= 0.7;

    const embassyContext = embassySummary
      ? `\nEMBASSY SUMMARY:\n${embassySummary.substring(0, 2000)}\n`
      : '';

    // Phase 3: Build OFFICIAL_RULES section
    const officialRulesSection = this.buildOfficialRulesSection(ruleSet, embassySummary);

    // Phase 3: Build COUNTRY_VISA_PLAYBOOK section
    const playbookSection = playbook ? this.buildPlaybookSection(playbook) : '';

    // Phase 6: Add embassy rules confidence guidance
    const embassyRulesGuidance = hasHighConfidenceRules
      ? `\n\nEMBASSY RULES STATUS: You have up-to-date embassy rules with high confidence (${(embassyRulesConfidence! * 100).toFixed(0)}%). Follow them strictly and use them as the authoritative source for requirements.`
      : embassyRulesConfidence !== null
        ? `\n\nEMBASSY RULES STATUS: Embassy rules are available but with low confidence (${(embassyRulesConfidence * 100).toFixed(0)}%). Use them as guidance but be conservative and supplement with generic patterns for this country + visa type.`
        : `\n\nEMBASSY RULES STATUS: Embassy rules are incomplete or missing. Use generic patterns for this country + visa type and be conservative in your recommendations.`;

    // Map country code to country name for context
    const countryNames: Record<string, string> = {
      US: 'United States',
      GB: 'United Kingdom',
      UK: 'United Kingdom',
      DE: 'Germany',
      ES: 'Spain',
      CA: 'Canada',
      AU: 'Australia',
      JP: 'Japan',
      KR: 'South Korea',
      AE: 'United Arab Emirates',
    };
    const countryName = countryNames[countryCode] || countryCode;
    const isSchengen = [
      'DE',
      'ES',
      'FR',
      'IT',
      'AT',
      'BE',
      'CH',
      'CZ',
      'DK',
      'EE',
      'FI',
      'GR',
      'HU',
      'IS',
      'LV',
      'LI',
      'LT',
      'LU',
      'MT',
      'NL',
      'NO',
      'PL',
      'PT',
      'SE',
      'SK',
      'SI',
    ].includes(countryCode);
    const visaTypeLabel =
      visaType === 'tourist'
        ? countryCode === 'US'
          ? 'B1/B2'
          : countryCode === 'GB' || countryCode === 'UK'
            ? 'Standard Visitor'
            : 'Tourist'
        : 'Student';

    return `You are an EXPERT VISA OFFICER with 10+ years of experience evaluating visa applications from Uzbekistan for ${countryName} ${visaTypeLabel} visas.

================================================================================
YOUR EXPERTISE
================================================================================

You have deep knowledge of:
- Immigration law and visa requirements for ${countryCode} ${visaType.toUpperCase()} visas
- Financial sufficiency assessment (calculating required funds, evaluating income stability, sponsor credibility)
- Ties assessment (property, employment, family, children - all factors that prove return intention)
- Risk factor identification (previous refusals, weak finances, unclear purpose, immigration intent)
- Embassy officer evaluation criteria and decision-making patterns
- Country-specific requirements, terminology, and common refusal reasons

================================================================================
YOUR ROLE: EXPERT CHECKLIST ENRICHMENT
================================================================================

Your ONLY job: Enrich base documents with expert-level names, descriptions, and personalization based on THIS specific applicant's profile.

CRITICAL RULES (NON-NEGOTIABLE):
- You MUST output exactly the documentTypes provided in BASE_DOCUMENTS (no additions, no removals)
- You MUST NOT change documentType, category, required, or internal IDs
- You ONLY enrich these fields:
  - appliesToThisApplicant (boolean): Expert evaluation - does THIS applicant need this document?
  - reasonIfApplies (string): Expert reasoning - why it applies for THIS applicant (financial sufficiency, ties, risk mitigation)
  - name, nameUz, nameRu: Expert-level names using correct country-specific terminology
  - description, descriptionUz, descriptionRu: Expert descriptions explaining WHY this document matters for THIS applicant
  - extraRecommended, priority: If these fields exist in schema, adjust based on risk profile

================================================================================
PRE-COMPUTED EXPERT FIELDS (Phase 2)
================================================================================

You receive pre-computed expert fields in APPLICANT_CONTEXT that summarize key visa officer concerns:

- financialSufficiencyRatio: availableFunds / requiredFunds (0.0-1.0+)
  - < 0.7 = 'low' (insufficient funds)
  - 0.7-1.0 = 'borderline' (may need additional proof)
  - 1.0-1.3 = 'sufficient' (adequate funds)
  - ≥ 1.3 = 'strong' (excellent financial capacity)

- tiesStrengthScore: 0.0-1.0 (higher = stronger return intention)
  - < 0.4 = 'weak' (concern about return)
  - 0.4-0.7 = 'medium' (moderate ties)
  - ≥ 0.7 = 'strong' (strong ties to home country)

- travelHistoryScore: 0.0-1.0 (higher = better travel compliance)
  - 'none' = no previous travel
  - 'limited' = 1-2 trips, no issues
  - 'good' = multiple trips, no refusals
  - 'strong' = extensive travel, multiple regions, no issues

- dataCompletenessScore: 0.0-1.0 (how complete the applicant context is)
  - If < 0.7: Be cautious, some information may be missing
  - If < 0.5: Avoid overconfident statements, note data gaps

Use these fields as your starting point for reasoning. They are calculated from questionnaire data and represent what a visa officer would assess.

================================================================================
RISK-DRIVEN DOCUMENT SELECTION (Phase 2)
================================================================================

You receive a list of RISK_DRIVERS in APPLICANT_CONTEXT – for example: ["low_funds", "weak_ties", "limited_travel_history"].

Your job is to:
(a) Ensure that for each significant risk driver, there are enough documents that help mitigate that risk
(b) Mark those documents with high priority and required or highly_recommended category
(c) Use both OFFICIAL_RULES and COUNTRY_VISA_PLAYBOOK to select documents and set priority
(d) If OFFICIAL_RULES require certain documents, they must be included regardless of playbook

EXPLICIT RISK DRIVER → DOCUMENT MAPPING:

low_funds / borderline_funds:
→ Critical docs: bank_statement, sponsor_financial_documents, income_certificate, tax_returns, scholarship_proof (for students)
→ Mark as required or highly_recommended, priority 1-5
→ ReasonIfApplies: "Required to demonstrate financial sufficiency. Your available funds are [low/borderline] compared to required funds."

weak_ties / no_property / no_employment:
→ Critical docs: property_documents (kadastr in Uzbekistan), employment_letter, family_composition_documents, marriage_certificate, business_registration
→ Mark as required or highly_recommended, priority 1-5
→ ReasonIfApplies: "Strengthens ties to home country. Your ties strength is weak, and this document helps demonstrate return intention to Uzbekistan."

limited_travel_history / previous_visa_refusals:
→ Critical docs: travel_itinerary, accommodation_proof, invitation_letter, cover_letter, additional_ties_documents
→ Mark as required or highly_recommended, priority 1-5
→ ReasonIfApplies: "Addresses travel history concerns. This document helps demonstrate genuine travel purpose and reduces immigration intent concerns."

is_minor:
→ Critical docs: birth_certificate, parental_consent, guardian_documents, parents_financial_proof
→ Mark as required, priority 1-3
→ ReasonIfApplies: "Required for minor applicants. Demonstrates parental consent and guardianship arrangements."

sponsor_based_finance:
→ Critical docs: sponsor_financial_documents, sponsor_letter, sponsor_relationship_proof, sponsor_income_proof
→ Mark as required, priority 1-3
→ ReasonIfApplies: "Required for sponsored applications. Demonstrates sponsor's financial capacity and relationship to applicant."

For each checklist item, internally decide which riskDrivers it helps with, and use that to set priority and required vs highly_recommended vs optional.

Use COUNTRY_VISA_PLAYBOOK document hints to understand what officers typically focus on for each document type.
If embassy rules conflict with playbook, embassy rules win.

================================================================================
EXPERT REASONING FRAMEWORK
================================================================================

When evaluating appliesToThisApplicant, think like an embassy officer evaluating THIS specific Uzbek applicant:

1. FINANCIAL SUFFICIENCY REASONING (Use financialSufficiencyRatio, requiredFundsUSD, availableFundsUSD):
   - If financialSufficiencyLabel is 'low' or 'borderline':
     * Financial documents are CRITICAL - mark all financial docs as appliesToThisApplicant = true
     * Emphasize in reasonIfApplies: "Required to demonstrate financial sufficiency. Applicant has $X available vs $Y required (ratio: Z%). Additional proof needed to meet embassy requirements."
     * For bank statements: Reference Uzbek banks (e.g., "Bank statement from Uzbek bank showing consistent income...")
   - If financialSufficiencyLabel is 'sufficient' or 'strong':
     * Financial documents still apply, but reasonIfApplies can note adequate funds
   - If sponsorType !== 'self':
     * Sponsor financial documents are CRITICAL
     * Evaluate sponsor credibility: income, relationship, dependents
     * If sponsorHasSufficientFunds is false, emphasize need for additional sponsor proof

2. TIES ASSESSMENT (Use tiesStrengthScore, tiesStrengthLabel):
   - If tiesStrengthLabel is 'weak':
     * ALL ties-related documents are CRITICAL (property docs, employment letter, family ties proof)
     * Mark appliesToThisApplicant = true for property, employment, family documents
     * ReasonIfApplies: "Strengthens ties to home country. Applicant's ties strength is weak (score: X/1.0). This document helps demonstrate return intention to Uzbekistan."
   - If tiesStrengthLabel is 'medium':
     * Ties documents are HIGHLY RECOMMENDED - mark as appliesToThisApplicant = true
     * ReasonIfApplies: "Strengthens ties to home country. Applicant has moderate ties (score: X/1.0). This document helps strengthen the application."
   - If tiesStrengthLabel is 'strong':
     * Ties documents still apply but can note strong existing ties
   - Property documents: Reference "kadastr" (Uzbek property registry), not Western property terms
   - Employment: Reference Uzbek employment context, typical Uzbek employers

3. TRAVEL HISTORY REASONING (Use travelHistoryScore, travelHistoryLabel):
   - If travelHistoryLabel is 'none' or 'limited':
     * Itinerary, accommodation, invitation letters are CRITICAL
     * Travel history documents (previous visas, stamps) are HIGHLY RECOMMENDED
     * ReasonIfApplies: "Applicant has limited/no previous travel history. This document helps demonstrate genuine travel purpose and reduces immigration intent concerns."
   - If travelHistoryLabel is 'good' or 'strong':
     * Travel documents still apply but can note positive travel history
   - If previousVisaRejections > 0 or hasOverstayHistory:
     * Explanation letter is CRITICAL
     * Additional financial proof and ties documents are CRITICAL
     * ReasonIfApplies: "Addresses previous visa refusal/overstay. This document helps mitigate concerns and demonstrate improved circumstances."

4. COUNTRY-SPECIFIC PATTERNS (10 Priority Countries):
${
  countryCode === 'US'
    ? `   - US B1/B2 Tourist: Strong emphasis on ties (property, employment, family), financial capacity (typically 1 year of expenses), clear travel purpose, DS-160 form, visa fee receipt, interview typically required
   - US Student (F-1): I-20 form (Certificate of Eligibility), SEVIS fee (I-901), DS-160, strong academic background, financial capacity for full program duration, interview typically required`
    : ''
}
${
  countryCode === 'GB' || countryCode === 'UK'
    ? `   - UK Standard Visitor: 28-day bank statement rule (funds must be in account for 28 consecutive days), strong ties requirement, travel itinerary, accommodation proof, online application
   - UK Student: CAS (Confirmation of Acceptance for Studies) letter, tuition payment proof, accommodation proof, financial capacity, TB test certificate may be required`
    : ''
}
${
  isSchengen
    ? `   - Schengen Tourist: Travel health insurance (minimum €30,000 coverage), accommodation proof (hotel booking, invitation, Airbnb), sufficient funds (typically 3-6 months bank statements), round-trip flight reservation, Schengen visa application form
   - Schengen Student: Acceptance letter from university, financial capacity (blocked account/Sperrkonto for Germany), accommodation proof, travel health insurance (€30,000 minimum), student residence permit application`
    : ''
}
${
  countryCode === 'CA'
    ? `   - Canada Visitor: Strong ties to home country, financial capacity, clear travel purpose, travel itinerary, accommodation proof
   - Canada Student: LOA (Letter of Acceptance) from DLI (Designated Learning Institution), proof of funds for first year (tuition + living), GIC (Guaranteed Investment Certificate) may be required for SDS, study permit application`
    : ''
}
${
  countryCode === 'AU'
    ? `   - Australia Visitor: Strong ties, financial capacity, clear travel purpose, travel itinerary, accommodation proof, travel insurance recommended
   - Australia Student: COE (Confirmation of Enrolment), OSHC (Overseas Student Health Cover) insurance, GTE (Genuine Temporary Entrant) statement may be required, financial capacity for first year (tuition + living expenses), student visa application`
    : ''
}
${
  countryCode === 'JP'
    ? `   - Japan Tourist: Detailed itinerary with specific dates and locations, accommodation proof (hotel reservations or invitation), sponsor proof if sponsored, stable income and ties, tourist visa application
   - Japan Student: Certificate of Eligibility (COE), admission letter from Japanese school/university, sufficient funds for tuition and living expenses, student visa application`
    : ''
}
${
  countryCode === 'KR'
    ? `   - South Korea Tourist: Travel itinerary, accommodation proof, sponsor proof if sponsored, strong ties, financial capacity, tourist visa application
   - South Korea Student: Admission letter from Korean school/university, D-2 (university) or D-4 (language school) visa, clear study plans, financial proof for tuition and living expenses, student visa application`
    : ''
}
${
  countryCode === 'AE'
    ? `   - UAE Tourist: Hotel booking confirmation, sponsor letter if invited, proof of financial means, travel insurance may be required, strong ties, clear purpose, tourist visa application
   - UAE Student: Admission letter from UAE school/university, sponsor letter if sponsored, financial proof for tuition and living expenses, student visa application`
    : ''
}
${
  countryCode === 'FR'
    ? `   - France Tourist (Schengen): Travel health insurance (€30,000 minimum), accommodation proof, sufficient funds, round-trip booking, Schengen visa application form
   - France Student: Acceptance letter from French university, financial capacity, accommodation proof, travel health insurance, student visa application`
    : ''
}

5. DECISION TREE RULES (Explicit Logic):
   - IF financialSufficiencyRatio < 1.0 AND document is financial-related (bank_statement, sponsor_financial_documents, income_certificate):
     → appliesToThisApplicant = true
     → reasonIfApplies: "Required to demonstrate financial sufficiency. Applicant has $X available vs $Y required (ratio: Z%). Additional proof needed."
   
   - IF tiesStrengthScore < 0.5 AND document is ties-related (property_documents, employment_letter, family_ties_proof):
     → appliesToThisApplicant = true
     → reasonIfApplies: "Strengthens ties to home country. Applicant's ties strength is weak (score: X/1.0). This document helps demonstrate return intention to Uzbekistan."
   
   - IF travelHistoryLabel is 'none' OR 'limited' AND document is travel/itinerary-related (travel_itinerary, hotel_reservations, invitation_letter):
     → appliesToThisApplicant = true
     → reasonIfApplies: "Applicant has limited/no previous travel history. This document helps demonstrate genuine travel purpose and reduces immigration intent concerns."
   
   - IF previousVisaRejections > 0 OR hasOverstayHistory:
     → explanation_letter appliesToThisApplicant = true
     → additional financial proof appliesToThisApplicant = true
     → additional ties documents appliesToThisApplicant = true
     → reasonIfApplies: "Addresses previous visa refusal/overstay. This document helps mitigate concerns and demonstrate improved circumstances."
   
   - IF applicant is minor (age < 18) OR hasChildren:
     → parental_consent appliesToThisApplicant = true
     → birth_certificate appliesToThisApplicant = true
     → guardianship_documents appliesToThisApplicant = true (if applicable)
     → reasonIfApplies: "Required for minor applicants. Demonstrates parental consent and guardianship arrangements."
   
   - IF sponsorType !== 'self':
     → sponsor_letter appliesToThisApplicant = true
     → sponsor_financial_documents appliesToThisApplicant = true
     → sponsor_relationship_proof appliesToThisApplicant = true (if available)
     → reasonIfApplies: "Required for sponsored applications. Demonstrates sponsor's financial capacity and relationship to applicant."
   
   - IF isEmployed === true:
     → employment_letter appliesToThisApplicant = true
     → employment_contract appliesToThisApplicant = true (if available)
     → reasonIfApplies: "Strengthens ties to home country. Demonstrates stable employment in Uzbekistan and return intention."
   
   - IF hasPropertyInUzbekistan === true:
     → property_documents appliesToThisApplicant = true
     → kadastr_documents appliesToThisApplicant = true (if available)
     → reasonIfApplies: "Strengthens ties to home country. Property ownership in Uzbekistan demonstrates strong return intention."

6. UZBEKISTAN-SPECIFIC CONTEXT:
   - Applicants are typically from Uzbekistan, with documents from Uzbek institutions
   - Bank statements: Reference "Uzbek banks" (e.g., Kapital Bank, Uzsanoatqurilishbank, Ipak Yuli, etc.) generically
   - Property documents: Reference "kadastr" (Uzbek cadastral office), not Western property terms
   - Employment: Reference "Uzbek employers", typical Uzbek employment patterns, company letterhead with official seal
   - Family ties: Reference "family composition certificates", "marriage certificates from ZAGS" (Uzbek civil registry)
   - Documents may need translation: Uzbek/Russian documents may require English translation for embassy submission
   - Financial context: Be aware of realistic funds vs declared income patterns in Uzbekistan
   - Tone: Formal but understandable for average Uzbek users with basic English

7. DATA COMPLETENESS AWARENESS (Use meta.dataCompletenessScore):
   - If dataCompletenessScore < 0.7:
     * Be conservative in appliesToThisApplicant decisions
     * Avoid overconfident language in reasonIfApplies
     * Note: "Some information may be missing - this is an estimate based on available data"
   - If dataCompletenessScore < 0.5:
     * Mark more documents as appliesToThisApplicant = true (better safe than sorry)
     * Acknowledge data gaps in reasonIfApplies when relevant

================================================================================
OUTPUT SCHEMA
================================================================================

{
  "checklist": [
    {
      "id": "string",
      "documentType": "string",      // MUST match BASE_DOCUMENTS exactly
      "category": "required" | "highly_recommended" | "optional",  // MUST match BASE_DOCUMENTS
      "required": boolean,           // MUST match BASE_DOCUMENTS
      "name": "string",              // Expert-level EN name (embassy terminology)
      "nameUz": "string",            // Accurate Uzbek translation
      "nameRu": "string",            // Accurate Russian translation
      "description": "string",       // Expert description explaining WHY this document matters for THIS applicant
      "appliesToThisApplicant": boolean,  // Expert evaluation: Does THIS applicant need it?
      "reasonIfApplies": "string",   // Expert reasoning: Why it applies (financial sufficiency, ties, risk mitigation)
      "extraRecommended": boolean,
      "group": "identity" | "financial" | "travel" | "education" | "employment" | "ties" | "other",
      "priority": number,
      "dependsOn": ["string"]
    }
  ]
}

================================================================================
EXPERT DESCRIPTION GUIDELINES
================================================================================

When writing descriptions, include:
- WHY this document matters for visa approval
- HOW it addresses financial sufficiency / ties / risk factors
- WHAT embassy officers look for in this document
- Country-specific requirements (format, validity, currency)

Example expert description:
"Bank statements showing consistent income and sufficient funds for the trip duration. Embassy officers verify financial capacity, income stability, and ability to cover expenses without overstaying. Required: Last 3-6 months, original documents, sufficient balance (minimum $X for ${visaType} visa to ${countryCode})."

================================================================================
EXPERT REASONING FOR appliesToThisApplicant
================================================================================

Set appliesToThisApplicant = true if ANY of these apply:
- Document is required by rules (category = "required") → ALWAYS true
- Document addresses a specific risk factor:
  * financialSufficiencyLabel is 'low'/'borderline' AND document is financial-related → true
  * tiesStrengthLabel is 'weak'/'medium' AND document is ties-related → true
  * travelHistoryLabel is 'none'/'limited' AND document is travel/itinerary-related → true
  * previousVisaRejections > 0 AND document addresses refusal reasons → true
- Document strengthens the application (employment proof, property docs, travel history) → true
- Document is conditionally required AND condition is met:
  * sponsorType !== 'self' AND document is sponsor-related → true
  * isEmployed === true AND document is employment-related → true
  * hasPropertyInUzbekistan === true AND document is property-related → true

Set appliesToThisApplicant = false ONLY if:
- Document is conditionally required AND condition is NOT met (e.g., sponsor docs when sponsorType === 'self')
- Document is truly optional (category = "optional") AND doesn't address any risk factors AND applicant profile is strong (financialSufficiencyLabel === 'strong' AND tiesStrengthLabel === 'strong' AND travelHistoryLabel === 'strong')

DEFAULT: When in doubt, set appliesToThisApplicant = true (better to include than miss)

================================================================================
EXPERT REASONING FOR reasonIfApplies
================================================================================

When appliesToThisApplicant = true, provide expert reasoning that:
- References specific metrics from APPLICANT_CONTEXT (financialSufficiencyRatio, tiesStrengthScore, etc.)
- Mentions Uzbek context when relevant ("as an applicant from Uzbekistan...")
- Explains how this document addresses risk factors or strengthens the application
- Uses country-specific terminology and requirements

Examples of expert reasoning:

Financial documents (when financialSufficiencyLabel is 'low'/'borderline'):
- "Required to demonstrate financial sufficiency. As an applicant from Uzbekistan, you have $X available vs $Y required (ratio: Z%). This document helps meet ${countryName} embassy requirements and addresses financial sufficiency concerns."

Financial documents (when financialSufficiencyLabel is 'sufficient'/'strong'):
- "Required to demonstrate financial capacity. You have adequate funds (ratio: Z%), and this document confirms your financial stability for the ${visaTypeLabel} visa."

Ties documents (when tiesStrengthLabel is 'weak'):
- "Strengthens ties to home country. Your ties strength is weak (score: X/1.0), and this document (property kadastr/employment letter/family ties proof) helps demonstrate your return intention to Uzbekistan."

Ties documents (when tiesStrengthLabel is 'medium'/'strong'):
- "Strengthens ties to home country. This document (property/employment/family) demonstrates your connection to Uzbekistan and supports your visa application."

Travel history documents (when travelHistoryLabel is 'none'/'limited'):
- "Demonstrates genuine travel purpose. You have limited/no previous travel history, and this document (itinerary/accommodation/invitation) helps establish your travel plans and reduces immigration intent concerns."

Risk mitigation (previous refusals):
- "Addresses previous visa refusal. This document helps demonstrate improved circumstances and addresses concerns that led to the previous refusal."

Country-specific:
- "${countryName} embassy requirement: [Specific requirement]. This document is mandatory for ${visaTypeLabel} visa applications from Uzbekistan."
${countryCode === 'US' ? '\n- US B1/B2: "Required by US embassy to demonstrate strong ties to Uzbekistan and financial capacity for trip duration."' : ''}
${countryCode === 'GB' || countryCode === 'UK' ? '\n- UK: "Required by UK embassy. Bank statement must show funds available for 28 consecutive days before application."' : ''}
${isSchengen ? '\n- Schengen: "Required by Schengen embassy. Travel insurance must cover at least €30,000 and be valid for entire stay."' : ''}
${countryCode === 'CA' ? '\n- Canada: "Required by Canadian embassy. DLI acceptance letter (LOA) is mandatory for student visa applications."' : ''}

${embassyContext}
${embassyRulesGuidance}

================================================================================
FEW-SHOT EXAMPLES (LEARN FROM THESE PATTERNS)
================================================================================

EXAMPLE 1: US Tourist, Self-Funded, Low Balance, No Travel History
BASE_DOCUMENT: { documentType: "bank_statement", category: "required", required: true }
APPLICANT_CONTEXT: { financial: { financialSufficiencyLabel: "low", financialSufficiencyRatio: 0.6, requiredFundsUSD: 5000, availableFundsUSD: 3000 }, ties: { tiesStrengthLabel: "weak", tiesStrengthScore: 0.3 }, travelHistory: { travelHistoryLabel: "none" } }

EXPERT ENRICHMENT:
{
  "documentType": "bank_statement",
  "category": "required",
  "required": true,
  "appliesToThisApplicant": true,
  "reasonIfApplies": "CRITICAL: Required to demonstrate financial sufficiency. As an applicant from Uzbekistan, you have $3,000 available vs $5,000 required (ratio: 60%). This document is essential to address financial sufficiency concerns for US B1/B2 visa.",
  "name": "Bank Statement (Last 6 Months)",
  "nameUz": "Bank hisoboti (so'nggi 6 oy)",
  "nameRu": "Выписка из банка (последние 6 месяцев)",
  "description": "Bank statements from Uzbek bank showing consistent income and sufficient funds for trip duration. US embassy officers verify financial capacity, income stability, and ability to cover expenses without overstaying. Required: Last 6 months, original documents, sufficient balance (minimum $5,000 for tourist visa to US).",
  "descriptionUz": "O'zbek bankidan olingan bank hisoboti, barqaror daromad va sayohat muddati uchun yetarli mablag'ni ko'rsatadi. AQSh elchixonasi xodimlari moliyaviy imkoniyatni, daromad barqarorligini va muddatdan tashqari qolmaslik qobiliyatini tekshiradi.",
  "descriptionRu": "Выписка из банка Узбекистана, показывающая стабильный доход и достаточные средства на период поездки. Сотрудники посольства США проверяют финансовые возможности, стабильность дохода и способность покрыть расходы без нарушения сроков пребывания."
}

EXAMPLE 2: Canada Student, Sponsored by Parents, Good Funds, Good Ties
BASE_DOCUMENT: { documentType: "sponsor_financial_documents", category: "required", required: true }
APPLICANT_CONTEXT: { sponsorType: "parent", financial: { financialSufficiencyLabel: "sufficient", financialSufficiencyRatio: 1.2, sponsorHasSufficientFunds: true }, ties: { tiesStrengthLabel: "strong", tiesStrengthScore: 0.8 } }

EXPERT ENRICHMENT:
{
  "documentType": "sponsor_financial_documents",
  "category": "required",
  "required": true,
  "appliesToThisApplicant": true,
  "reasonIfApplies": "Required by Canadian embassy. As a sponsored student, your parent's financial documents demonstrate sufficient funds for tuition and living expenses. Sponsor has adequate funds to support your studies in Canada.",
  "name": "Sponsor Financial Documents (Parent)",
  "nameUz": "Homiy moliyaviy hujjatlari (ota-ona)",
  "nameRu": "Финансовые документы спонсора (родитель)",
  "description": "Financial documents from your parent sponsor showing sufficient funds for Canadian study program. Required: Bank statements (last 6 months), income certificate, sponsor support letter, proof of relationship. Canadian embassy verifies sponsor's financial capacity and relationship to applicant.",
  "descriptionUz": "Ota-onangiz homiy tomonidan berilgan moliyaviy hujjatlar, Kanadadagi o'qish dasturi uchun yetarli mablag'ni ko'rsatadi. Talab qilinadi: bank hisoboti (so'nggi 6 oy), daromad guvohnomasi, homiy qo'llab-quvvatlash xati, qarindoshlik guvohnomasi.",
  "descriptionRu": "Финансовые документы от родителя-спонсора, показывающие достаточные средства для программы обучения в Канаде. Требуется: выписка из банка (последние 6 месяцев), справка о доходах, письмо поддержки спонсора, подтверждение родства."
}

EXAMPLE 3: Schengen Tourist, Strong Travel History, Medium Funds
BASE_DOCUMENT: { documentType: "travel_itinerary", category: "highly_recommended", required: false }
APPLICANT_CONTEXT: { financial: { financialSufficiencyLabel: "sufficient", financialSufficiencyRatio: 1.1 }, travelHistory: { travelHistoryLabel: "strong", travelHistoryScore: 0.9 } }

EXPERT ENRICHMENT:
{
  "documentType": "travel_itinerary",
  "category": "highly_recommended",
  "required": false,
  "appliesToThisApplicant": true,
  "reasonIfApplies": "Highly recommended to demonstrate clear travel purpose. While you have strong travel history, a detailed itinerary helps Schengen embassy officers understand your travel plans and confirms genuine tourist intent.",
  "name": "Detailed Travel Itinerary",
  "nameUz": "Batafsil sayohat rejasi",
  "nameRu": "Подробный маршрут поездки",
  "description": "Detailed day-by-day travel itinerary showing planned activities, destinations, and dates. Schengen embassy officers use this to verify travel purpose and ensure you have realistic plans. Include: dates, cities, accommodations, activities, return flight details.",
  "descriptionUz": "Kunlik sayohat rejasi, rejalashtirilgan faoliyatlar, manzillar va sanalarni ko'rsatadi. Schengen elchixonasi xodimlari buni sayohat maqsadini tekshirish va realistik rejalarni ta'minlash uchun ishlatadi.",
  "descriptionRu": "Подробный дневной маршрут поездки, показывающий запланированные мероприятия, направления и даты. Сотрудники посольства Шенгена используют это для проверки цели поездки и обеспечения реалистичности планов."
}

================================================================================
FINAL INSTRUCTIONS
================================================================================

- Think like an expert visa officer evaluating THIS specific Uzbek applicant for ${countryName} ${visaTypeLabel} visa
- Use pre-computed expert fields (financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore) as your starting point
- Reference Uzbek context naturally ("as an applicant from Uzbekistan", "Uzbek banks", "kadastr documents")
- Provide expert-level descriptions that explain WHY documents matter for THIS applicant
- Be specific about country requirements (${countryCode} embassy requirements, terminology)
- Return ONLY valid JSON matching the schema, no markdown, no explanations outside JSON
- All translations (UZ/RU) must be accurate, natural, and suitable for average Uzbek users (not lawyers)
- Tone: Formal but understandable, respectful, clear`;
  }

  /**
   * LEGACY SYSTEM PROMPT (EXPERT VERSION - Phase 3)
   * Enable via feature flag: USE_COMPACT_CHECKLIST_PROMPTS=false
   *
   * Phase 3 Note: This prompt uses the same expert officer mindset as the compact version.
   * Some expert fields may be missing in legacy mode, so reasoning should be conservative.
   */
  private static buildSystemPromptLegacy(
    countryCode: string,
    visaType: string,
    ruleSet: VisaRuleSetData,
    playbook?: any
  ): string {
    // Map country code to country name for context
    const countryNames: Record<string, string> = {
      US: 'United States',
      GB: 'United Kingdom',
      UK: 'United Kingdom',
      DE: 'Germany',
      ES: 'Spain',
      CA: 'Canada',
      AU: 'Australia',
      JP: 'Japan',
      KR: 'South Korea',
      AE: 'United Arab Emirates',
    };
    const countryName = countryNames[countryCode] || countryCode;
    const visaTypeLabel =
      visaType === 'tourist'
        ? countryCode === 'US'
          ? 'B1/B2'
          : countryCode === 'GB' || countryCode === 'UK'
            ? 'Standard Visitor'
            : 'Tourist'
        : 'Student';

    return `You are an EXPERT VISA OFFICER with 10+ years of experience evaluating visa applications from Uzbekistan for ${countryName} ${visaTypeLabel} visas.

================================================================================
YOUR EXPERTISE
================================================================================

You are specialized in:
- ${countryName} ${visaTypeLabel} visa requirements and embassy evaluation patterns
- Financial sufficiency assessment for Uzbek applicants (Uzbek banking context, income patterns)
- Ties assessment specific to Uzbekistan (property via kadastr, employment in Uzbek companies, family structures)
- Risk factor identification (previous refusals, weak finances, unclear purpose, immigration intent)
- Uzbek applicant context: Understanding of Uzbek banking system, property documentation (kadastr), employment patterns
- Country-specific patterns and common refusal reasons for ${countryName}

NOTE: In legacy mode, some expert fields (financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore) may be missing from APPLICANT_CONTEXT.
When expert fields are missing, be conservative in your reasoning and mark more documents as appliesToThisApplicant = true.

${
  playbook
    ? `\n\nCOUNTRY_VISA_PLAYBOOK (Typical Patterns - Phase 3):
This playbook provides typical patterns for ${countryName} ${visaTypeLabel} visas. It is based on typical practice and may be less precise than official rules for countries where rules are not available.

${this.buildPlaybookSection(playbook)}

IMPORTANT: This playbook is supplementary guidance. If official rules (VisaRuleSet) are available, they take precedence.`
    : ''
}

================================================================================
YOUR ROLE: EXPERT CHECKLIST GENERATION
================================================================================

You are "VisaChecklistEngine", an EXPERT embassy-level visa document rules engine.

Your job:
- Use the provided VISA_RULE_SET as the ONLY source of official visa rules.
- Use the provided AI_USER_CONTEXT to decide which documents apply to this specific applicant.
- Produce a personalized visa document checklist for this application.
- Return ONLY valid JSON that matches the given checklist schema.

VISA_RULE_SET for ${countryCode} ${visaType.toUpperCase()}:
${JSON.stringify(ruleSet, null, 2)}

OUTPUT SCHEMA (JSON):
{
  "checklist": [
    {
      "id": "string",                // stable id if provided, or generate like "DOC_1"
      "documentType": "string",      // internal code, e.g. "passport", "bank_statement"
      "category": "required" | "highly_recommended" | "optional",
      "required": boolean,           // true if absolutely mandatory for this case
      "name": "string",              // human readable EN name
      "nameUz": "string",            // Uzbek translation
      "nameRu": "string",            // Russian translation
      "description": "string",       // short description (1–2 sentences, practical)
      "appliesToThisApplicant": boolean, // whether THIS user really needs it
      "reasonIfApplies": "string",   // short explanation why it applies (max 1–2 sentences)
      "extraRecommended": boolean,   // true if not strictly mandatory but strongly recommended
      "group": "identity" | "financial" | "travel" | "education" | "employment" | "ties" | "other",
      "priority": 1,                 // 1 = highest priority, larger number = lower priority
      "dependsOn": [ "DOC_ID", ... ] // ids of other docs that must exist first, if any
    }
  ]
}

================================================================================
EXPERT REASONING FRAMEWORK
================================================================================

When evaluating documents, think like an embassy officer:

1. FINANCIAL SUFFICIENCY REASONING:
   - Calculate: Does applicant have sufficient funds? (availableFunds / requiredFunds ratio)
   - If ratio < 1.0: Financial documents are CRITICAL, emphasize importance
   - If sponsor: Evaluate sponsor credibility (income, relationship, dependents)
   - Consider: Income stability, savings growth trend, account age, source of funds
   - Red flags: Sudden large deposits, inconsistent income, weak sponsor

2. TIES ASSESSMENT:
   - Property: Ownership duration, value, location (stronger if owned long-term)
   - Employment: Duration, stability, industry (government/established > startup)
   - Family: Spouse, children, dependent family (children = strongest tie)
   - Ties strength score: 0.0-1.0 (higher = stronger return intention)
   - If ties < 0.5: Emphasize documents that strengthen ties

3. RISK FACTOR MITIGATION:
   - Previous refusals: Include explanation letter, additional financial proof
   - Weak finances: Require stronger guarantees, sponsor letters, property docs
   - Unclear purpose: Emphasize detailed itinerary, invitation letters, travel plans
   - Immigration intent concerns: Add employment letters, property docs, family ties

4. EMBASSY OFFICER PERSPECTIVE:
   - What would an officer check first? (Financial capacity, ties, purpose clarity)
   - What documents reduce suspicion? (Employment proof, property docs, travel history)
   - What documents address common refusal reasons? (Country-specific patterns)
   - What makes an application "low risk"? (Strong finances + strong ties + clear purpose)

KEY RULES:

1. SOURCE OF TRUTH
- VISA_RULE_SET.requiredDocuments is the ONLY canonical list of official documents.
- You are NOT allowed to invent completely new mandatory documents.
- You may add at most a few "extraRecommended" documents IF they are logically implied by:
  - riskScore is high,
  - previousRefusals exist,
  - weak ties to home country,
  - financial sufficiency ratio < 1.0,
  - ties strength score < 0.5.
- Any "extraRecommended" document MUST have extraRecommended = true and category != "required".

2. EXPERT PERSONALIZATION USING AI_USER_CONTEXT
- For each requiredDocument in VISA_RULE_SET:
  - Apply expert reasoning (financial sufficiency, ties assessment, risk mitigation)
  - Use expert fields if available: financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore
  - Reference Uzbek context naturally ("as an applicant from Uzbekistan", "Uzbek banks", "kadastr documents")
  - Examples:
    - Sponsor-related documents apply only if sponsorType is not "self".
    - Employer letter applies only if employmentStatus is "employed" AND employment duration is stable.
    - Student documents apply only if the applicant is a student or has admission.
    - Extra financial proof may apply when:
      * riskScore is high,
      * sponsor income is low,
      * financial sufficiency ratio < 1.0,
      * savings growth is "decreasing".
    - Property documents apply if ties strength < 0.5 OR riskScore is high.
- Set:
  - required = true only if this document is mandatory for this applicant.
  - appliesToThisApplicant = true if they must or strongly should submit it (use expert reasoning).
  - extraRecommended = true if not mandatory but helpful for approval (addresses risk factors).

3. CATEGORIES AND GROUPS
- Map documents into groups consistently:
  - Passport, ID card → "identity"
  - Bank statements, income proof → "financial"
  - Tickets, hotel booking, itinerary, insurance → "travel"
  - Diploma, transcript, admission letter → "education"
  - Employment contract, employer letter → "employment"
  - Property documents, family ties → "ties"
  - Anything else → "other"
- category field:
  - "required" for officially mandatory documents.
  - "highly_recommended" for documents strongly implied by rules or high risk.
  - "optional" for documents that are nice but not necessary.

4. NAMES AND DESCRIPTIONS
- name: short, clear, embassy-style name in English.
- nameUz / nameRu: localized names if obvious; otherwise reuse the English name.
- description: 1–2 sentences, practical, describing exactly what the applicant needs to provide.

5. DEPENDENCIES AND PRIORITY
- Use dependsOn to indicate logical order where helpful.
- priority: 1 = absolutely critical, 2 = very important, 3+ = supporting documents.

6. STRICTNESS AND CONSERVATISM
- If ambiguous about a document being mandatory: set category = "highly_recommended" and extraRecommended = true.
- Never downgrade clearly mandatory documents.
- Never mark a document as not needed unless the rule set clearly indicates it is conditional and the condition is not met.

7. OUTPUT RULES
- You MUST output only a single JSON object with a "checklist" array.
- No markdown, no comments, no explanations outside the JSON.
- If translations are unknown, fill nameUz/nameRu with the English name (do NOT leave them null).

Return ONLY valid JSON matching the schema, no other text.`;
  }

  /**
   * Apply risk-weighted prioritization to checklist items (Phase 3)
   * Adjusts priority based on risk factors, financial sufficiency, and ties strength
   */
  /**
   * Phase 3: Validate and enrich checklist items with source tracking and expert fields
   * - Ensures source field is set correctly (rules vs ai_extra)
   * - Validates ai_extra items don't exceed threshold
   * - Ensures expertReasoning is populated
   * - Returns enriched checklist with metrics
   */
  private static validateAndEnrichChecklistItems(
    checklist: ChecklistItem[],
    baseDocuments: Array<{ documentType: string; category: string; required: boolean }>,
    options?: {
      ruleSetId?: string | null;
      ruleSetVersion?: number | null;
      embassySourceUrl?: string | null;
      generationMode?: ChecklistGenerationMode;
    }
  ): ChecklistItem[] {
    const baseDocTypes = new Set(baseDocuments.map((doc) => doc.documentType));
    const MAX_AI_EXTRA_ITEMS = 3;
    const generationMode = options?.generationMode;

    // Enrich items with source field and validate
    const enriched = checklist.map((item) => {
      // Set source based on whether document is in base documents
      const isFromRules = baseDocTypes.has(item.documentType);
      const source =
        item.source ||
        (generationMode === 'static_fallback' ? 'fallback' : isFromRules ? 'rules' : 'ai_extra');

      // Ensure expertReasoning exists (even if empty)
      const expertReasoning = item.expertReasoning || {
        financialRelevance: null,
        tiesRelevance: null,
        riskMitigation: [],
        embassyOfficerPerspective: null,
      };

      return {
        ...item,
        source: source as any,
        ruleSetId: item.ruleSetId || options?.ruleSetId || undefined,
        ruleSetVersion: item.ruleSetVersion || options?.ruleSetVersion || undefined,
        embassySourceUrl: item.embassySourceUrl || options?.embassySourceUrl || undefined,
        expertReasoning,
      };
    });

    // Count ai_extra items
    const aiExtraItems = enriched.filter((item) => item.source === 'ai_extra');
    const aiExtraCount = aiExtraItems.length;

    // Safety check: warn if too many ai_extra items
    if (aiExtraCount > MAX_AI_EXTRA_ITEMS) {
      logWarn('[VisaChecklistEngine][Phase3] Too many ai_extra items detected', {
        aiExtraCount,
        maxAllowed: MAX_AI_EXTRA_ITEMS,
        aiExtraTypes: aiExtraItems.map((item) => item.documentType),
      });

      // Trim to top N by priority (keep highest priority ai_extra items)
      const sortedAiExtra = aiExtraItems.sort((a, b) => b.priority - a.priority);
      const keptAiExtra = sortedAiExtra.slice(0, MAX_AI_EXTRA_ITEMS);
      const removedAiExtra = sortedAiExtra.slice(MAX_AI_EXTRA_ITEMS);

      logWarn('[VisaChecklistEngine][Phase3] Trimmed ai_extra items', {
        kept: keptAiExtra.map((item) => item.documentType),
        removed: removedAiExtra.map((item) => item.documentType),
      });

      // Remove trimmed items from enriched list
      const keptAiExtraTypes = new Set(keptAiExtra.map((item) => item.documentType));
      return enriched.filter(
        (item) => item.source !== 'ai_extra' || keptAiExtraTypes.has(item.documentType)
      );
    }

    // Validate ai_extra items are not marked as required
    const invalidAiExtra = enriched.filter(
      (item) => item.source === 'ai_extra' && item.category === 'required'
    );
    if (invalidAiExtra.length > 0) {
      logWarn('[VisaChecklistEngine][Phase3] ai_extra items marked as required (invalid)', {
        invalidItems: invalidAiExtra.map((item) => item.documentType),
      });

      // Downgrade to highly_recommended
      for (const item of invalidAiExtra) {
        item.category = 'highly_recommended';
        item.required = false;
      }
    }

    return enriched;
  }

  private static applyRiskWeightedPrioritization(
    checklist: ChecklistItem[],
    canonical: CanonicalAIUserContext
  ): ChecklistItem[] {
    const riskLevel = canonical.riskScore.level;
    const financialRatio = canonical.applicantProfile.financial?.financialSufficiencyRatio;
    const tiesStrength = canonical.applicantProfile.ties?.tiesStrengthScore;
    const hasPreviousRefusals = canonical.applicantProfile.previousVisaRejections;

    return checklist
      .map((item) => {
        let adjustedPriority = item.priority;

        // Risk-based adjustments
        if (riskLevel === 'high') {
          // High risk: prioritize documents that address risk factors
          if (item.group === 'financial' || item.group === 'ties' || item.group === 'employment') {
            adjustedPriority = Math.max(1, item.priority - 1); // Increase priority (lower number = higher priority)
          }
        }

        // Financial sufficiency adjustments
        if (
          financialRatio !== undefined &&
          financialRatio !== null &&
          financialRatio < 1.0 &&
          item.group === 'financial'
        ) {
          adjustedPriority = Math.max(1, item.priority - 1); // Critical if insufficient funds
        }

        // Ties strength adjustments
        if (tiesStrength !== undefined && tiesStrength < 0.5 && item.group === 'ties') {
          adjustedPriority = Math.max(1, item.priority - 1); // Critical if weak ties
        }

        // Previous refusals adjustments
        if (hasPreviousRefusals && (item.group === 'financial' || item.group === 'ties')) {
          adjustedPriority = Math.max(1, item.priority - 1); // Critical to address refusal reasons
        }

        const extraRecommended =
          riskLevel === 'high' &&
          (item.category === 'highly_recommended' || item.category === 'optional') &&
          (item.group === 'financial' || item.group === 'ties' || item.group === 'employment');

        return {
          ...item,
          priority: adjustedPriority,
          extraRecommended: item.extraRecommended || extraRecommended || false,
        };
      })
      .sort((a, b) => a.priority - b.priority); // Sort by priority (ascending)
  }

  /**
   * Apply conditional logic to checklist items based on AIUserContext and rule set data.
   */
  private static applyConditions(
    items: ChecklistItem[],
    aiUserContext: AIUserContext,
    ruleSet: VisaRuleSetData | null
  ): ChecklistItem[] {
    return items.map((item) => {
      // Find matching rule definition for condition
      const ruleDef = ruleSet?.requiredDocuments?.find(
        (doc) => doc.documentType === item.documentType
      );
      const condition = (item as any).condition || ruleDef?.condition;
      const applies = evaluateCondition(condition, { user: aiUserContext, item: item as any });

      return {
        ...item,
        appliesToThisApplicant: applies,
        reasonIfApplies:
          applies && (item as any).reasonIfApplies
            ? (item as any).reasonIfApplies
            : applies
              ? 'Applies based on your profile'
              : 'Not needed based on your profile',
      };
    });
  }

  /**
   * Build user prompt with base documents (COMPACT VERSION - Phase 3)
   * GPT only enriches, does NOT decide which documents to include
   *
   * Phase 3 Upgrade:
   * - Structured APPLICANT_CONTEXT with expert fields grouped (financial, ties, travelHistory, uzbekContext, meta)
   * - Explicit "EXPERT ANALYSIS REQUIRED" section guiding GPT on how to use expert fields
   * - References to Uzbek context and country-specific requirements
   * - Clear instructions on appliesToThisApplicant reasoning using expert metrics
   *
   * Key Behavior:
   * - APPLICANT_CONTEXT is structured JSON with expert fields grouped logically
   * - GPT receives explicit instructions on using financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore
   * - Uzbek context naturally included (isUzbekCitizen, residesInUzbekistan)
   * - Meta information (dataCompletenessScore) helps GPT be cautious when data is incomplete
   */
  private static async buildUserPrompt(
    aiUserContext: AIUserContext,
    baseDocuments: Array<{ documentType: string; category: string; required: boolean }>,
    previousChecklist?: ChecklistItem[]
  ): Promise<string> {
    // Convert to canonical format for consistent GPT input
    const canonical = await buildCanonicalAIUserContext(aiUserContext);
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    // Expert applicant context (Phase 3: includes expert fields)
    const applicantContext = {
      // Basic fields
      sponsorType: profile.sponsorType,
      currentStatus: profile.currentStatus,
      hasInternationalTravel: profile.hasInternationalTravel,
      previousVisaRejections: profile.previousVisaRejections,
      bankBalanceUSD: profile.bankBalanceUSD,
      monthlyIncomeUSD: profile.monthlyIncomeUSD,
      hasProperty: profile.hasPropertyInUzbekistan,
      hasFamily: profile.hasFamilyInUzbekistan,
      hasChildren: profile.hasChildren,
      riskLevel: riskScore.level,
      riskProbability: riskScore.probabilityPercent,
      // Expert fields (Phase 3 + Phase 2: Extended)
      financial: profile.financial
        ? {
            requiredFundsEstimate: profile.financial.requiredFundsEstimate,
            requiredFundsUSD: (profile.financial as any).requiredFundsUSD, // Phase 2: Added
            availableFundsUSD: (profile.financial as any).availableFundsUSD, // Phase 2: Added
            financialSufficiencyRatio: profile.financial.financialSufficiencyRatio,
            financialSufficiencyLabel: (profile.financial as any).financialSufficiencyLabel, // Phase 2: Added
            sponsorHasSufficientFunds: (profile.financial as any).sponsorHasSufficientFunds, // Phase 2: Added
            savingsGrowth: profile.financial.savingsGrowth,
            sourceOfFunds: profile.financial.sourceOfFunds,
            sponsor: profile.financial.sponsor,
          }
        : undefined,
      employment: profile.employment
        ? {
            employerName: profile.employment.employerName,
            employmentDurationMonths: profile.employment.employmentDurationMonths,
            employerStability: profile.employment.employerStability,
          }
        : undefined,
      ties: profile.ties
        ? {
            tiesStrengthScore: profile.ties.tiesStrengthScore,
            tiesStrengthLabel: (profile.ties as any).tiesStrengthLabel, // Phase 2: Added
            tiesFactors: profile.ties.tiesFactors,
            propertyValueUSD: (profile.ties as any).propertyValueUSD, // Phase 2: Added
            employmentDurationMonths: (profile.ties as any).employmentDurationMonths, // Phase 2: Added
          }
        : undefined,
      travelHistory: profile.travelHistory
        ? {
            travelHistoryScore: (profile.travelHistory as any).travelHistoryScore, // Phase 2: Added
            travelHistoryLabel: (profile.travelHistory as any).travelHistoryLabel, // Phase 2: Added
            previousVisaRejections: (profile.travelHistory as any).previousVisaRejections, // Phase 2: Added
            hasOverstayHistory: (profile.travelHistory as any).hasOverstayHistory, // Phase 2: Added
          }
        : undefined,
      property: profile.property,
      embassyContext: canonical.embassyContext
        ? {
            minimumFundsRequired: canonical.embassyContext.minimumFundsRequired,
            minimumStatementMonths: canonical.embassyContext.minimumStatementMonths,
            commonRefusalReasons: canonical.embassyContext.commonRefusalReasons,
            officerEvaluationCriteria: canonical.embassyContext.officerEvaluationCriteria,
          }
        : undefined,
      // Phase 2: Uzbek context and meta
      uzbekContext: (canonical as any).uzbekContext,
      meta: (canonical as any).meta
        ? {
            dataCompletenessScore: (canonical as any).meta?.dataCompletenessScore,
            missingCriticalFields: (canonical as any).meta?.missingCriticalFields,
          }
        : undefined,
    };

    // Phase 3: Structured applicant context with expert fields grouped
    const structuredContext = {
      application: {
        visaType: profile.visaType,
        countryCode: canonical.application.country,
        duration: profile.duration,
      },
      sponsor: {
        sponsorType: profile.sponsorType,
      },
      financial: applicantContext.financial || {
        bankBalanceUSD: profile.bankBalanceUSD,
        monthlyIncomeUSD: profile.monthlyIncomeUSD,
      },
      ties: applicantContext.ties || {
        hasPropertyInUzbekistan: profile.hasPropertyInUzbekistan,
        hasFamilyInUzbekistan: profile.hasFamilyInUzbekistan,
        hasChildren: profile.hasChildren,
        isEmployed: profile.isEmployed,
        employmentDurationMonths: applicantContext.employment?.employmentDurationMonths,
      },
      travelHistory: applicantContext.travelHistory || {
        hasInternationalTravel: profile.hasInternationalTravel,
        previousVisaRejections: profile.previousVisaRejections,
        hasOverstayHistory: profile.previousOverstay,
      },
      risk: {
        riskLevel: riskScore.level,
        riskProbability: riskScore.probabilityPercent,
        riskFactors: riskScore.riskFactors,
        positiveFactors: riskScore.positiveFactors,
      },
      uzbekContext: applicantContext.uzbekContext,
      meta: applicantContext.meta,
      embassyContext: applicantContext.embassyContext,
      // Phase 6: Embassy rules confidence
      embassyRulesConfidence: (aiUserContext as any).ruleSet?.sourceInfo?.confidence ?? null,
      // Phase 2: Risk drivers
      riskDrivers: (canonical as any).riskDrivers || [],
    };

    let prompt = `EXPERT ANALYSIS REQUIRED:

For each BASE_DOCUMENT, you must:
1. Check which RISK_DRIVERS this document addresses (see RISK_DRIVERS list below)
2. Decide appliesToThisApplicant using expert visa officer reasoning:
   - Use financial metrics (financialSufficiencyRatio, financialSufficiencyLabel) when document is financial-related
   - Use ties metrics (tiesStrengthScore, tiesStrengthLabel) when document is ties-related
   - Use travel history metrics (travelHistoryScore, travelHistoryLabel) when document is travel/itinerary-related
   - For high-risk profiles (low funds, weak ties, no travel history), almost all financial and ties docs should apply
   - Reference Uzbek applicant perspective in your reasoning
   - If document addresses a significant RISK_DRIVER, mark it as appliesToThisApplicant = true with high priority

3. Write reasonIfApplies that:
   - Explicitly mentions which RISK_DRIVER(s) this document addresses (e.g., "Addresses low_funds risk driver...")
   - References specific risk factors (low funds, weak ties, no travel history, previous refusals)
   - Explains how this document helps mitigate risk or strengthen the application
   - Mentions Uzbek context when relevant ("as an applicant from Uzbekistan...")
   - Uses country-specific requirements and terminology

4. Generate tri-language fields (name, nameUz, nameRu, description, descriptionUz, descriptionRu):
   - Use correct country-specific terminology (e.g., US: "Form I-20", Canada: "LOA", UK: "CAS")
   - Keep tone formal but understandable for average Uzbek users
   - Reference Uzbek context naturally (Uzbek banks, kadastr documents, etc.)

BASE_DOCUMENTS (enrich these exact documents, no additions/removals):
${JSON.stringify(baseDocuments, null, 2)}

APPLICANT_CONTEXT (structured with expert fields):
${JSON.stringify(structuredContext, null, 2)}

RISK_DRIVERS (Phase 2: Explicit risk factors - use these to prioritize documents):
${JSON.stringify((canonical as any).riskDrivers || [], null, 2)}

RISK DRIVER → DOCUMENT MAPPING GUIDE:
- low_funds / borderline_funds → bank_statement, sponsor_financial_documents, income_certificate (mark as required/highly_recommended, priority 1-5)
- weak_ties / no_property / no_employment → property_documents, employment_letter, family_documents (mark as required/highly_recommended, priority 1-5)
- limited_travel_history / previous_visa_refusals → travel_itinerary, accommodation_proof, invitation_letter, cover_letter (mark as required/highly_recommended, priority 1-5)
- is_minor → birth_certificate, parental_consent, guardian_documents (mark as required, priority 1-3)
- sponsor_based_finance → sponsor_financial_documents, sponsor_letter, sponsor_relationship_proof (mark as required, priority 1-3)

${(() => {
  const embassyRulesConfidence = (aiUserContext as any).ruleSet?.sourceInfo?.confidence ?? null;
  return embassyRulesConfidence !== null
    ? `\nEMBASSY RULES CONFIDENCE: ${(embassyRulesConfidence * 100).toFixed(0)}%\n${embassyRulesConfidence >= 0.7 ? 'High confidence: Embassy rules are up-to-date and reliable. Follow them strictly.' : 'Low confidence: Embassy rules may be incomplete. Use them as guidance but be conservative.'}`
    : '\nEMBASSY RULES CONFIDENCE: Not available\nEmbassy rules are missing. Use generic patterns for this country + visa type and be conservative.';
})()}`;

    if (previousChecklist && previousChecklist.length > 0) {
      prompt += `\n\nPREVIOUS_CHECKLIST (preserve IDs where possible):
${JSON.stringify(
  previousChecklist.map((item) => ({ id: item.id, documentType: item.documentType })),
  null,
  2
)}`;
    }

    prompt += `\n\nCRITICAL REMINDERS:
- Keep documentType, category, required EXACTLY as in BASE_DOCUMENTS
- Use expert fields (financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore) in your reasoning
- Reference Uzbek context naturally
- Return ONLY valid JSON matching the schema, no markdown, no explanations outside JSON`;

    return prompt;
  }

  /**
   * OLD USER PROMPT (kept for reference/rollback)
   */
  private static async buildUserPromptLegacy(
    aiUserContext: AIUserContext,
    ruleSet: VisaRuleSetData,
    previousChecklist?: ChecklistItem[]
  ): Promise<string> {
    // Convert to canonical format for consistent GPT input
    const canonical = await buildCanonicalAIUserContext(aiUserContext);
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    // Build explicit, human-readable context summary from canonical format
    const purpose = profile.visaType === 'student' ? 'study' : 'tourism';
    const duration = profile.duration === 'unknown' ? 'Not specified' : profile.duration;
    const sponsorType = profile.sponsorType;
    const employmentStatus =
      profile.currentStatus === 'unknown' ? 'Not specified' : profile.currentStatus;
    const hasInvitation = profile.hasUniversityInvitation || profile.hasOtherInvitation;
    const travelHistory = profile.hasInternationalTravel;
    const previousRefusals = profile.previousVisaRejections;
    const bankBalance = profile.bankBalanceUSD;
    const monthlyIncome = profile.monthlyIncomeUSD;
    const hasProperty = profile.hasPropertyInUzbekistan;
    const hasFamily = profile.hasFamilyInUzbekistan;
    const hasChildren = profile.hasChildren;
    const age = profile.age;

    let prompt = `Generate a personalized visa document checklist using the VISA_RULE_SET and the following applicant information:

APPLICANT PROFILE:
- Purpose of travel: ${purpose}
- Stay duration: ${duration}
- Employment status: ${employmentStatus}
- Sponsor: ${sponsorType === 'self' ? 'Self-funded' : `Sponsored by ${sponsorType}`}
- Approximate income/savings: ${bankBalance !== null ? `~$${bankBalance}` : monthlyIncome !== null ? `~$${monthlyIncome}/month` : 'Not specified'}
- Has invitation letter: ${hasInvitation ? 'Yes' : 'No'}
- Travel history: ${travelHistory ? 'Has previous international travel' : 'No previous international travel'}
- Previous visa refusals: ${previousRefusals ? 'Yes' : 'No'}
- Ties to home country: ${hasProperty ? 'Has property' : ''}${hasFamily ? (hasProperty ? ', has family' : 'Has family') : ''}${hasChildren ? (hasProperty || hasFamily ? ', has children' : 'Has children') : ''}${!hasProperty && !hasFamily && !hasChildren ? 'Standard ties' : ''}
- Age: ${age !== null ? age : 'Not specified'}
- Risk level: ${riskScore.level} (${riskScore.probabilityPercent}% probability)

VISA_RULE_SET.requiredDocuments:
${JSON.stringify(ruleSet.requiredDocuments, null, 2)}

${ruleSet.financialRequirements ? `\nFinancial Requirements:\n${JSON.stringify(ruleSet.financialRequirements, null, 2)}` : ''}
${ruleSet.processingInfo ? `\nProcessing Info:\n${JSON.stringify(ruleSet.processingInfo, null, 2)}` : ''}
${ruleSet.additionalRequirements ? `\nAdditional Requirements:\n${JSON.stringify(ruleSet.additionalRequirements, null, 2)}` : ''}`;

    if (previousChecklist && previousChecklist.length > 0) {
      prompt += `\n\nOPTIONAL PREVIOUS_CHECKLIST (use for preserving stable IDs and ordering where sensible):\n${JSON.stringify(previousChecklist, null, 2)}`;
    }

    // Phase 3: Add expert fields to legacy prompt if available
    const expertFields =
      canonical.applicantProfile.financial ||
      canonical.applicantProfile.ties ||
      canonical.applicantProfile.travelHistory;
    if (expertFields) {
      prompt += `\n\nEXPERT FIELDS (if available, use these for expert reasoning):
${canonical.applicantProfile.financial ? `Financial: ${JSON.stringify(canonical.applicantProfile.financial, null, 2)}` : ''}
${canonical.applicantProfile.ties ? `Ties: ${JSON.stringify(canonical.applicantProfile.ties, null, 2)}` : ''}
${canonical.applicantProfile.travelHistory ? `Travel History: ${JSON.stringify(canonical.applicantProfile.travelHistory, null, 2)}` : ''}
${(canonical as any).uzbekContext ? `Uzbek Context: ${JSON.stringify((canonical as any).uzbekContext, null, 2)}` : ''}
${(canonical as any).meta ? `Meta: ${JSON.stringify((canonical as any).meta, null, 2)}` : ''}

Use these expert fields to guide your appliesToThisApplicant decisions and reasonIfApplies explanations.
If expert fields are missing, be conservative and mark more documents as appliesToThisApplicant = true.`;
    }

    prompt += `\n\nGenerate the checklist following all rules in the system prompt. Return ONLY valid JSON matching the schema.`;

    return prompt;
  }

  /**
   * Fix common issues in GPT-4 responses
   */
  private static fixCommonIssues(parsed: any): any {
    const fixed = { ...parsed };

    // Ensure checklist is an array
    if (!Array.isArray(fixed.checklist)) {
      fixed.checklist = [];
    }

    // Fix each item
    fixed.checklist = fixed.checklist.map((item: any, index: number) => {
      const fixedItem: any = {
        id: item.id || `DOC_${index + 1}`,
        documentType: item.documentType || item.document || 'unknown',
        category: ['required', 'highly_recommended', 'optional'].includes(item.category)
          ? item.category
          : 'optional',
        required: item.required !== undefined ? item.required : item.category === 'required',
        name: item.name || item.documentType || 'Unknown',
        nameUz: item.nameUz || item.name || item.documentType || 'Unknown',
        nameRu: item.nameRu || item.name || item.documentType || 'Unknown',
        description: item.description || '',
        appliesToThisApplicant:
          item.appliesToThisApplicant !== undefined ? item.appliesToThisApplicant : true,
        reasonIfApplies: item.reasonIfApplies || undefined,
        extraRecommended: item.extraRecommended !== undefined ? item.extraRecommended : false,
        group: [
          'identity',
          'financial',
          'travel',
          'education',
          'employment',
          'ties',
          'other',
        ].includes(item.group)
          ? item.group
          : 'other',
        priority: typeof item.priority === 'number' ? item.priority : index + 1,
        dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn : undefined,
      };

      return fixedItem;
    });

    return fixed;
  }

  /**
   * Build OFFICIAL_RULES section for system prompt (Phase 3)
   * Extracts and formats official embassy rules from VisaRuleSet
   */
  private static buildOfficialRulesSection(
    ruleSet: VisaRuleSetData,
    embassySummary?: string
  ): string {
    const sourceUrl = ruleSet.sourceInfo?.extractedFrom || 'Unknown';
    const extractedAt = ruleSet.sourceInfo?.extractedAt || 'Unknown';
    const confidence = ruleSet.sourceInfo?.confidence ?? null;
    const confidencePercent = confidence ? (confidence * 100).toFixed(0) : 'Unknown';

    let rulesText = `OFFICIAL EMBASSY RULES (Authoritative)
Source: ${sourceUrl}
Last updated: ${extractedAt}
Confidence: ${confidencePercent}%

You MUST strictly follow these rules and must not contradict them.
If there is any conflict between these rules and your general knowledge, obey these rules.

REQUIRED DOCUMENTS:
${ruleSet.requiredDocuments
  .map(
    (doc) =>
      `- ${doc.documentType} (${doc.category}): ${doc.description || 'No description'}${doc.validityRequirements ? ` | Validity: ${doc.validityRequirements}` : ''}${doc.formatRequirements ? ` | Format: ${doc.formatRequirements}` : ''}${doc.condition ? ` | Condition: ${doc.condition}` : ''}`
  )
  .join('\n')}

${
  ruleSet.financialRequirements
    ? `FINANCIAL REQUIREMENTS:
- Minimum Balance: ${ruleSet.financialRequirements.minimumBalance || 'Not specified'} ${ruleSet.financialRequirements.currency || 'USD'}
- Bank Statement Months: ${ruleSet.financialRequirements.bankStatementMonths || 'Not specified'}
- Sponsor Allowed: ${ruleSet.financialRequirements.sponsorRequirements?.allowed ? 'Yes' : 'No'}
${
  ruleSet.financialRequirements.sponsorRequirements?.requiredDocuments
    ? `- Sponsor Required Documents: ${ruleSet.financialRequirements.sponsorRequirements.requiredDocuments.join(', ')}`
    : ''
}`
    : ''
}

${
  ruleSet.additionalRequirements
    ? `ADDITIONAL REQUIREMENTS:
${
  ruleSet.additionalRequirements.travelInsurance
    ? `- Travel Insurance: ${ruleSet.additionalRequirements.travelInsurance.required ? 'Required' : 'Optional'}${ruleSet.additionalRequirements.travelInsurance.minimumCoverage ? ` (Minimum: ${ruleSet.additionalRequirements.travelInsurance.minimumCoverage} ${ruleSet.additionalRequirements.travelInsurance.currency || 'USD'})` : ''}`
    : ''
}
${
  ruleSet.additionalRequirements.accommodationProof
    ? `- Accommodation Proof: ${ruleSet.additionalRequirements.accommodationProof.required ? 'Required' : 'Optional'}${ruleSet.additionalRequirements.accommodationProof.types ? ` (Types: ${ruleSet.additionalRequirements.accommodationProof.types.join(', ')})` : ''}`
    : ''
}
${
  ruleSet.additionalRequirements.returnTicket
    ? `- Return Ticket: ${ruleSet.additionalRequirements.returnTicket.required ? 'Required' : 'Optional'}${ruleSet.additionalRequirements.returnTicket.refundable ? ' (Refundable preferred)' : ''}`
    : ''
}`
    : ''
}

${embassySummary ? `\nEMBASSY SUMMARY EXCERPT:\n${embassySummary.substring(0, 1000)}` : ''}`;

    return rulesText;
  }

  /**
   * Build COUNTRY_VISA_PLAYBOOK section for system prompt (Phase 3)
   * Formats playbook data for GPT consumption
   */
  private static buildPlaybookSection(playbook: CountryVisaPlaybook): string {
    if (!playbook) {
      return '';
    }

    return `COUNTRY_VISA_PLAYBOOK (Typical Patterns - Not Law)
These are typical patterns based on general visa practice and Uzbek applicant context.
If embassy rules conflict with playbook, embassy rules win.

TYPICAL REFUSAL REASONS:
${playbook.typicalRefusalReasonsEn.map((reason: string) => `- ${reason}`).join('\n')}

KEY OFFICER FOCUS:
${playbook.keyOfficerFocusEn.map((focus: string) => `- ${focus}`).join('\n')}

UZBEK CONTEXT HINTS:
${playbook.uzbekContextHintsEn.map((hint: string) => `- ${hint}`).join('\n')}

DOCUMENT HINTS:
${playbook.documentHints
  .map(
    (hint) =>
      `- ${hint.documentType} (${hint.importance}): ${hint.officerFocusHintEn}${hint.typicalFor.length > 0 ? ` | Typical for: ${hint.typicalFor.join(', ')}` : ''}`
  )
  .join('\n')}`;
  }
}
