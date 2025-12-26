/**
 * Document Checklist Service
 * AI-powered document checklist generation for visa applications
 *
 * ========================================================================
 * CHECKLIST GENERATION MODE SELECTION LOGIC
 * ========================================================================
 *
 * This service orchestrates checklist generation using three modes in order:
 *
 * 1. RULES MODE (Primary - Default)
 *    - Uses VisaChecklistEngineService (rules + AI enrichment)
 *    - Triggered when: VisaRuleSet exists for country+visaType
 *    - Returns: Enriched checklist with expert reasoning
 *    - Model: gpt-4o (via getAIConfig('checklist'))
 *
 * 2. LEGACY_GPT MODE (Fallback)
 *    - Uses AIOpenAIService.generateChecklistLegacy()
 *    - Triggered when: No VisaRuleSet exists OR rules mode returns null/fails
 *    - Returns: GPT-generated checklist from scratch
 *    - Model: gpt-4o (via getAIConfig('checklistLegacy'))
 *
 * 3. STATIC_FALLBACK MODE (Last Resort)
 *    - Uses fallback-checklists.ts::getFallbackChecklist()
 *    - Triggered when: Both RULES and LEGACY_GPT fail (errors, timeouts, invalid JSON)
 *    - Returns: Pre-defined static checklist
 *    - Model: None (static data)
 *
 * Mode selection is explicit, logged, and persisted in checklistData.generationMode
 * ========================================================================
 */
// Change summary (2025-11-24): Added OpenAI latency warnings and enforced country-specific terminology (e.g., LOA vs I-20).

import { PrismaClient } from '@prisma/client';
import { getEnvConfig } from '../config/env';
import { errors } from '../utils/errors';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { logChecklistGeneration } from '../utils/gpt-logging';
import AIOpenAIService from './ai-openai.service';
import { getDocumentTranslation } from '../data/document-translations';
import { buildAIUserContext } from './ai-context.service';
import { inferCategory, normalizePriority } from '../utils/checklist-helpers';
import { MIN_ITEMS_HARD, IDEAL_MIN_ITEMS } from '../config/checklist-config';
import type { ChecklistGenerationMode, ChecklistMetadata } from '../types/checklist';
import { assertStatus } from '../utils/status-validator';

const prisma = new PrismaClient();
const CHECKLIST_VERSION = 1;

/**
 * Document checklist item
 */
export interface ChecklistItem {
  id: string;
  documentType: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  category?: 'required' | 'highly_recommended' | 'optional' | 'conditional'; // Optional for backward compatibility
  required: boolean; // Kept for backward compatibility
  priority: string; // Loosened type - runtime normalization ensures valid values
  status: 'missing' | 'pending' | 'processing' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

/**
 * Document checklist
 */
export interface DocumentChecklist {
  applicationId: string;
  countryId: string;
  visaTypeId: string;
  items: ChecklistItem[];
  totalRequired: number;
  completed: number;
  progress: number; // 0-100
  generatedAt: string;
  aiGenerated: boolean;
  aiFallbackUsed?: boolean;
  aiErrorOccurred?: boolean;
}

/**
 * Document Checklist Service
 * Generates AI-powered document checklists
 */
export class DocumentChecklistService {
  /**
   * Build existingDocumentsMap from application.documents
   * Ensures only the latest document per documentType is kept (sorted by createdAt desc)
   */
  private static buildExistingDocumentsMap(documents: any[]): Map<string, any> {
    // Sort by createdAt desc to ensure latest documents are processed first
    const sortedDocuments = [...documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const map = new Map<string, any>();
    for (const doc of sortedDocuments) {
      // Only add if we haven't seen this documentType yet (keeps the latest)
      if (!map.has(doc.documentType)) {
        map.set(doc.documentType, {
          type: doc.documentType,
          status: doc.status,
          id: doc.id,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
          verificationNotes: doc.verificationNotes,
          verifiedByAI: doc.verifiedByAI ?? false,
          aiConfidence: doc.aiConfidence ?? null,
          aiNotesUz: doc.aiNotesUz ?? null,
          aiNotesRu: doc.aiNotesRu ?? null,
          aiNotesEn: doc.aiNotesEn ?? null,
        });
      }
    }
    return map;
  }

  private static buildChecklistDataPayload(
    items: any[],
    meta: Partial<ChecklistMetadata> = {}
  ): ChecklistMetadata & { checklistVersion: number } {
    const generationMode = meta.generationMode;
    const normalizedItems =
      generationMode === 'static_fallback'
        ? items.map((item: any) => ({
            ...item,
            source: item.source || 'fallback',
          }))
        : items;

    return {
      items: normalizedItems,
      aiGenerated: meta.aiGenerated ?? false,
      aiFallbackUsed: meta.aiFallbackUsed ?? false,
      aiErrorOccurred: meta.aiErrorOccurred ?? false,
      generationMode: meta.generationMode || 'rules',
      modelName: meta.modelName,
      checklistVersion: CHECKLIST_VERSION,
    };
  }

  /**
   * Lightweight status lookup for polling endpoints
   */
  static async getChecklistStatus(
    applicationId: string,
    userId: string
  ): Promise<{ status: string; updatedAt?: Date | null }> {
    const application = await this.findOrCreateCanonicalApplication(applicationId);
    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    const stored = await prisma.documentChecklist.findUnique({
      where: { applicationId },
    });

    if (!stored) {
      assertStatus('DocumentChecklistStatus', 'processing'); // normalize to processing start
      return { status: 'not_started' };
    }

    return {
      status: stored.status,
      updatedAt: stored.updatedAt,
    };
  }
  /**
   * Generate document checklist for an application
   * Now uses persistent DB storage to avoid re-calling OpenAI on every GET
   *
   * @param applicationId - Application ID
   * @param userId - User ID (for verification)
   * @returns Document checklist or status object
   */
  static async generateChecklist(
    applicationId: string,
    userId: string
  ): Promise<DocumentChecklist | { status: 'processing' | 'failed'; errorMessage?: string }> {
    try {
      const application = await this.findOrCreateCanonicalApplication(applicationId);

      // Get stored checklist from database
      const storedChecklist = await prisma.documentChecklist.findUnique({
        where: { applicationId },
      });

      // Watchdog: if processing and stale (>2 minutes), repair with fallback
      if (
        storedChecklist &&
        storedChecklist.status === 'processing' &&
        storedChecklist.updatedAt &&
        Date.now() - storedChecklist.updatedAt.getTime() > 2 * 60 * 1000
      ) {
        logWarn('[Checklist][Watchdog] Detected stale processing checklist, repairing', {
          applicationId,
          status: storedChecklist.status,
          updatedAt: storedChecklist.updatedAt,
        });
        await this.repairStuckChecklist(application, storedChecklist);
        // Reload after repair
        const reloaded = await prisma.documentChecklist.findUnique({
          where: { applicationId },
        });
        if (reloaded?.status === 'ready' && reloaded.checklistData) {
          const checklistData = JSON.parse(reloaded.checklistData);
          const items = Array.isArray(checklistData) ? checklistData : checklistData.items || [];
          const aiFallbackUsed = checklistData.aiFallbackUsed || false;
          const aiErrorOccurred = checklistData.aiErrorOccurred || false;
          return this.buildChecklistResponse(
            applicationId,
            application.countryId,
            application.visaTypeId,
            items,
            application.documents,
            reloaded.aiGenerated,
            aiFallbackUsed,
            aiErrorOccurred
          );
        }
      }

      // Verify ownership
      if (application.userId !== userId) {
        throw errors.forbidden();
      }

      // CRITICAL FIX: Check for existing stored checklist first
      if (storedChecklist) {
        // If checklist is ready, return it immediately without calling OpenAI
        if (storedChecklist.status === 'ready') {
          assertStatus('DocumentChecklistStatus', storedChecklist.status);
          logInfo('[Checklist][Cache] Returning stored checklist', {
            applicationId,
            status: storedChecklist.status,
          });

          if (!storedChecklist.checklistData) {
            logWarn('[Checklist][Cache] Stored checklist has no data, will regenerate', {
              applicationId,
            });
            // Fall through to generate new checklist
          } else {
            const checklistData = JSON.parse(storedChecklist.checklistData);
            // Handle both old format (array) and new format (object with items and metadata)
            const items = Array.isArray(checklistData) ? checklistData : checklistData.items || [];
            const aiFallbackUsed = checklistData.aiFallbackUsed || false;
            const aiErrorOccurred = checklistData.aiErrorOccurred || false;
            const generationMode = checklistData.generationMode || 'static_fallback'; // Default for old checklists
            const modelName = checklistData.modelName;

            logInfo('[Checklist][Cache] Returning stored checklist', {
              applicationId,
              generationMode,
              model: modelName,
              itemCount: items.length,
            });

            return this.buildChecklistResponse(
              applicationId,
              application.countryId,
              application.visaTypeId,
              items,
              application.documents,
              storedChecklist.aiGenerated,
              aiFallbackUsed,
              aiErrorOccurred
            );
          }
        }

        // If checklist is processing, return status
        if (storedChecklist.status === 'processing') {
          logInfo('[Checklist][Status] Checklist generation in progress', {
            applicationId,
          });
          assertStatus('DocumentChecklistStatus', 'processing');
          return { status: 'processing' };
        }

        // If checklist failed, generate fallback on-the-fly instead of returning error
        if (storedChecklist.status === 'failed') {
          assertStatus('DocumentChecklistStatus', storedChecklist.status);
          logWarn('[Checklist][Status] Stored checklist failed, generating fallback on-the-fly', {
            applicationId,
            errorMessage: storedChecklist.errorMessage,
          });

          try {
            // Generate fallback checklist immediately
            const fallbackItems = await this.generateRobustFallbackChecklist(
              application.country,
              application.visaType,
              application.documents.map((doc: any) => ({
                type: doc.documentType,
                status: doc.status,
                id: doc.id,
                fileUrl: doc.fileUrl,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt,
                verificationNotes: doc.verificationNotes,
                verifiedByAI: doc.verifiedByAI ?? false,
                aiConfidence: doc.aiConfidence ?? null,
                aiNotesUz: doc.aiNotesUz ?? null,
                aiNotesRu: doc.aiNotesRu ?? null,
                aiNotesEn: doc.aiNotesEn ?? null,
              }))
            );

            const existingDocumentsMap = this.buildExistingDocumentsMap(application.documents);

            const enrichedItems = this.mergeChecklistItemsWithDocuments(
              fallbackItems,
              existingDocumentsMap as Map<string, any>,
              applicationId
            );
            const sanitizedItems = this.applyCountryTerminology(
              enrichedItems,
              application.country,
              application.visaType.name
            );

            // Update stored checklist to 'ready' with fallback data
            const payload = this.buildChecklistDataPayload(sanitizedItems, {
              aiGenerated: false,
              aiFallbackUsed: true,
              aiErrorOccurred: true,
              generationMode: 'static_fallback',
            });

            await prisma.documentChecklist.update({
              where: { applicationId },
              data: {
                status: 'ready',
                checklistData: JSON.stringify(payload),
                aiGenerated: false,
                generatedAt: new Date(),
                errorMessage: null,
                checklistVersion: CHECKLIST_VERSION,
              },
            });

            return this.buildChecklistResponse(
              applicationId,
              application.countryId,
              application.visaTypeId,
              sanitizedItems,
              application.documents,
              false // aiGenerated = false for fallback
            );
          } catch (fallbackError: any) {
            logError(
              '[Checklist] Fallback generation failed in generateChecklist',
              fallbackError as Error,
              {
                applicationId,
              }
            );
            // If even fallback fails, return processing status to trigger retry
            return { status: 'processing' };
          }
        }
      }

      // No checklist exists or needs regeneration - start async generation
      // Create checklist entry with status 'processing'
      assertStatus('DocumentChecklistStatus', 'processing');

      const checklistEntry = await prisma.documentChecklist.upsert({
        where: { applicationId },
        create: {
          applicationId,
          status: 'processing',
          checklistData: '[]',
          checklistVersion: CHECKLIST_VERSION,
        },
        update: {
          status: 'processing',
          errorMessage: null,
          checklistVersion: CHECKLIST_VERSION,
        },
      });

      const useQueue = process.env.ENABLE_CHECKLIST_QUEUE === 'true';
      if (useQueue) {
        try {
          const { ChecklistQueueService } = await import('./checklist-queue.service');
          await ChecklistQueueService.enqueueGeneration(applicationId, userId);
          logInfo('[Checklist][Queue] Enqueued checklist generation job', {
            applicationId,
            userId,
          });
        } catch (queueError) {
          logWarn('[Checklist][Queue] Failed to enqueue, falling back to inline async generation', {
            applicationId,
            error: queueError instanceof Error ? queueError.message : String(queueError),
          });
          this.generateChecklistAsync(applicationId, userId, application).catch((error) => {
            logError('[Checklist][Async] Background generation failed', error as Error, {
              applicationId,
            });
          });
        }
      } else {
        // Trigger async generation (don't await - let it run in background)
        this.generateChecklistAsync(applicationId, userId, application).catch((error) => {
          logError('[Checklist][Async] Background generation failed', error as Error, {
            applicationId,
          });
        });
      }

      // Return processing status immediately
      return { status: 'processing' };
    } catch (error) {
      logError('Error generating document checklist', error as Error, {
        applicationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate checklist asynchronously in background
   * This method runs the actual AI generation and stores the result
   */
  private static async generateChecklistAsync(
    applicationId: string,
    userId: string,
    application: any
  ): Promise<void> {
    try {
      // STEP 1: Check if checklist already exists - if so, skip AI generation
      const storedChecklist = await prisma.documentChecklist.findUnique({
        where: { applicationId },
      });

      // If checklist already exists and is ready, skip generation
      if (storedChecklist && storedChecklist.status === 'ready') {
        logInfo(
          '[Checklist][Async] Checklist already exists for application, skipping AI generation',
          {
            applicationId,
            status: storedChecklist.status,
          }
        );
        return; // Early return - do not call OpenAI
      }

      // Get existing documents with full data
      const existingDocumentsMap = this.buildExistingDocumentsMap(application.documents);

      let items: ChecklistItem[] = [];
      let aiGenerated = false;
      let aiFallbackUsed = false;
      let aiErrorOccurred = false;
      let generationMode: ChecklistGenerationMode = 'static_fallback'; // Default to fallback
      let modelName: string | undefined = undefined; // Track model used for AI generation

      // Build AI user context with questionnaire summary (needed for all modes)
      const userContext = await buildAIUserContext(userId, applicationId);

      const countryCode = application.country.code.toUpperCase();
      const originalVisaTypeName = application.visaType.name.toLowerCase();

      // Normalize visa type using alias mapping (e.g., "Schengen Tourist Visa" -> "tourist")
      const { normalizeVisaTypeForRules } = await import('../utils/visa-type-aliases');
      const normalizedVisaType = normalizeVisaTypeForRules(countryCode, originalVisaTypeName);

      logInfo('[Checklist][Mode] Starting checklist generation', {
        applicationId,
        country: application.country.name,
        countryCode,
        visaType: application.visaType.name,
        originalVisaType: originalVisaTypeName,
        normalizedVisaType,
      });

      // ========================================================================
      // MODE ROUTING: Explicit decision tree
      // ========================================================================
      //
      // RULES-FIRST APPROACH:
      // When rule sets exist for (countryCode, visaType), we ALWAYS use rules-first mode.
      // Legacy GPT and static fallback are only used when:
      //   - there is no approved rule set, OR
      //   - the rules-based flow failed hard (AI error, schema issues, etc.)
      // ========================================================================

      // STEP 1: Ensure an approved VisaRuleSet exists (auto-provision generic if missing)
      const { VisaRulesService } = await import('./visa-rules.service');
      const ensuredRuleSet = await VisaRulesService.ensureRuleSetExists(
        countryCode,
        normalizedVisaType
      );
      const ruleSet = ensuredRuleSet?.data;
      const ensuredRuleSetId = ensuredRuleSet?.id;

      // Special check for US/tourist - ensure rules are found
      const isUSTourist =
        countryCode === 'US' &&
        (normalizedVisaType === 'tourist' ||
          originalVisaTypeName.toLowerCase().includes('b1') ||
          originalVisaTypeName.toLowerCase().includes('b2') ||
          originalVisaTypeName.toLowerCase().includes('visitor'));

      if (isUSTourist && !ruleSet) {
        logError(
          '[Checklist][Mode] CRITICAL: US B1/B2 Tourist should have rules but none found',
          new Error('US/tourist rules not found'),
          {
            applicationId,
            countryCode,
            visaType: originalVisaTypeName,
            normalizedVisaType,
            suggestion: 'Run: pnpm seed:us-b1b2-rules',
          }
        );
      }

      if (ruleSet) {
        // RULES-FIRST MODE
        // Use VisaChecklistEngineService with rules + AI enrichment
        // This is the preferred mode when approved rule sets exist.
        if (isUSTourist) {
          logInfo(
            '[Checklist][Mode] Using RULES-FIRST mode for US B1/B2 Tourist (VisaChecklistEngine)',
            {
              applicationId,
              countryCode,
              visaType: originalVisaTypeName,
              normalizedVisaType,
              ruleSetVersion: ruleSet.version || 1,
              ruleSetDocumentCount: ruleSet.requiredDocuments?.length || 0,
            }
          );
        } else {
          logInfo('[Checklist][Mode] Using RULES-FIRST mode (VisaChecklistEngine)', {
            applicationId,
            countryCode,
            visaType: originalVisaTypeName,
            normalizedVisaType,
            ruleSetVersion: ruleSet.version || 1,
          });
        }

        try {
          const { VisaChecklistEngineService } = await import('./visa-checklist-engine.service');
          const { getAIConfig } = await import('../config/ai-models');

          // Get model name for logging (rules mode uses checklist config)
          const aiConfig = getAIConfig('checklist');
          modelName = aiConfig.model;

          const engineResponse = await VisaChecklistEngineService.generateChecklistForApplication(
            application,
            userContext,
            ensuredRuleSetId
          );

          if (
            engineResponse &&
            engineResponse.checklist &&
            engineResponse.checklist.length >= MIN_ITEMS_HARD
          ) {
            // Convert engine format to ChecklistItem format
            items = this.convertEngineChecklistToItems(
              engineResponse.checklist,
              existingDocumentsMap
            );
            aiGenerated = true;
            // Phase 1: Detect generation mode from engine response metadata or infer from item count
            // If engine returned base-rules fallback, it will have generationMode in metadata
            // For now, we infer: if rules mode succeeded, it's 'rules' or 'rules_base_fallback'
            // The engine logs will indicate which one was used
            generationMode = 'rules'; // Default to 'rules' for successful rules mode

            // Log structured checklist generation
            logChecklistGeneration({
              applicationId,
              country: application.country.name,
              countryCode,
              visaType: normalizedVisaType,
              mode: 'rules',
              jsonValidationPassed: true, // Rules mode handles validation internally
              jsonValidationRetries: 0,
              itemCount: items.length,
            });

            logInfo('[Checklist][Mode] Rules mode succeeded', {
              applicationId,
              countryCode,
              visaType: originalVisaTypeName,
              normalizedVisaType,
              generationMode,
              model: modelName,
              itemCount: items.length,
            });
          } else {
            // Engine returned insufficient items or null - fall back to legacy
            // This should be rare; rules mode should always produce sufficient items.
            if (isUSTourist) {
              logError(
                '[Checklist][Mode] CRITICAL: US B1/B2 Tourist rules mode returned insufficient items - this should not happen',
                new Error('Rules mode failed for US/tourist'),
                {
                  applicationId,
                  countryCode,
                  visaType: originalVisaTypeName,
                  normalizedVisaType,
                  itemCount: engineResponse?.checklist?.length || 0,
                  ruleSetVersion: ruleSet?.version || 'unknown',
                  ruleSetDocumentCount: ruleSet?.requiredDocuments?.length || 0,
                }
              );
            } else {
              logWarn(
                '[Checklist][Mode] Rules-FIRST mode returned insufficient items, falling back to LEGACY mode',
                {
                  applicationId,
                  countryCode,
                  visaType: originalVisaTypeName,
                  normalizedVisaType,
                  itemCount: engineResponse?.checklist?.length || 0,
                }
              );
            }
            // Fall through to legacy mode
          }
        } catch (engineError: any) {
          // Rules-FIRST mode failed - fall back to legacy
          if (isUSTourist) {
            logError(
              '[Checklist][Mode] CRITICAL: US B1/B2 Tourist rules-FIRST mode failed - this should not happen',
              engineError instanceof Error ? engineError : new Error(String(engineError)),
              {
                applicationId,
                countryCode,
                visaType: originalVisaTypeName,
                normalizedVisaType,
                error: engineError?.message || String(engineError),
                ruleSetVersion: ruleSet?.version || 'unknown',
                ruleSetDocumentCount: ruleSet?.requiredDocuments?.length || 0,
              }
            );
          } else {
            logWarn('[Checklist][Mode] Rules-FIRST mode failed, falling back to LEGACY mode', {
              applicationId,
              countryCode,
              visaType: originalVisaTypeName,
              normalizedVisaType,
              error: engineError?.message || String(engineError),
            });
          }
          // Fall through to legacy mode
        }
      }

      // STEP 2: NO RULESET AVAILABLE → LEGACY / FALLBACK PIPELINE
      // If no rules or rules mode failed, use legacy AI mode
      // This is a fallback path; rules-FIRST is always preferred when available.
      if (items.length < MIN_ITEMS_HARD) {
        // Check if static fallback exists for this country+visaType combination
        const { getFallbackChecklist } = await import('../data/fallback-checklists');
        const visaTypeSlug: 'student' | 'tourist' =
          normalizedVisaType.includes('student') || normalizedVisaType.includes('study')
            ? 'student'
            : 'tourist';
        const staticFallbackExists = getFallbackChecklist(countryCode, visaTypeSlug).length > 0;

        if (!ruleSet) {
          // No approved rule set exists
          if (staticFallbackExists) {
            // Prefer static fallback over legacy GPT when available
            logInfo(
              '[Checklist][Mode] No approved VisaRuleSet found, using STATIC fallback (preferred over legacy)',
              {
                countryCode,
                visaType: originalVisaTypeName,
                normalizedVisaType,
                applicationId,
                reason: 'no_approved_ruleset_static_available',
              }
            );
            // Skip legacy, go directly to static fallback below
          } else {
            // No static fallback, use legacy GPT pipeline
            logWarn('[Checklist][Mode] No approved VisaRuleSet found, using LEGACY GPT pipeline', {
              countryCode,
              visaType: originalVisaTypeName,
              normalizedVisaType,
              applicationId,
              reason: 'no_approved_ruleset_no_static',
            });
          }
        } else {
          // Rule set exists but rules mode failed - use legacy GPT pipeline
          if (isUSTourist) {
            logError(
              '[Checklist][Mode] CRITICAL: US B1/B2 Tourist falling back to LEGACY mode - rules should be available',
              new Error('US/tourist should use rules mode'),
              {
                applicationId,
                countryCode,
                visaType: originalVisaTypeName,
                normalizedVisaType: 'tourist',
                reason: 'rules_mode_failed',
                ruleSetVersion: ruleSet?.version || 'none',
                ruleSetDocumentCount: ruleSet?.requiredDocuments?.length || 0,
                suggestion: 'Check rules engine logs for errors',
              }
            );
          } else {
            logWarn('[Checklist][Mode] Rules-FIRST mode failed, using LEGACY GPT pipeline', {
              applicationId,
              countryCode,
              visaType: originalVisaTypeName,
              normalizedVisaType,
              reason: 'rules_mode_failed',
            });
          }
        }

        // Only try legacy if static fallback doesn't exist or we have a ruleSet that failed
        if (!staticFallbackExists || ruleSet) {
          try {
            const { AIOpenAIService } = await import('./ai-openai.service');
            const { getAIConfig } = await import('../config/ai-models');

            // Get model name for logging (legacy mode uses checklistLegacy config)
            const aiConfig = getAIConfig('checklistLegacy');
            modelName = aiConfig.model;

            const legacyResponse = await AIOpenAIService.generateChecklistLegacy(
              application,
              userContext
            );

            if (
              legacyResponse &&
              legacyResponse.checklist &&
              legacyResponse.checklist.length >= MIN_ITEMS_HARD
            ) {
              items = this.convertLegacyChecklistToItems(
                legacyResponse.checklist,
                existingDocumentsMap
              );
              aiGenerated = true;
              generationMode = 'legacy_gpt';

              // Log structured checklist generation (legacy mode)
              logChecklistGeneration({
                applicationId,
                country: application.country.name,
                countryCode,
                visaType: normalizedVisaType,
                mode: 'legacy',
                jsonValidationPassed: true, // Legacy mode handles validation internally
                jsonValidationRetries: 0,
                itemCount: items.length,
              });

              logInfo('[Checklist][Mode] Legacy mode succeeded', {
                applicationId,
                countryCode,
                visaType: originalVisaTypeName,
                normalizedVisaType,
                generationMode,
                model: modelName,
                itemCount: items.length,
              });

              // QUALITY CHECK: If legacy produced < IDEAL_MIN_ITEMS and static fallback exists,
              // prefer static fallback for better quality
              if (items.length < IDEAL_MIN_ITEMS && staticFallbackExists) {
                logInfo(
                  '[Checklist][Mode] Legacy produced insufficient items (< ideal), using static fallback for better quality',
                  {
                    applicationId,
                    countryCode,
                    visaType: originalVisaTypeName,
                    normalizedVisaType,
                    legacyItemCount: items.length,
                    idealMinItems: IDEAL_MIN_ITEMS,
                    decision: 'prefer_static_over_weak_legacy',
                  }
                );
                // Use static fallback immediately instead of clearing items
                const { buildFallbackChecklistFromStaticConfig } = await import(
                  '../utils/fallback-checklist-helper'
                );
                items = buildFallbackChecklistFromStaticConfig(
                  countryCode,
                  normalizedVisaType,
                  Array.from(existingDocumentsMap.values()).map((doc: any) => ({
                    type: doc.type,
                    status: doc.status,
                    id: doc.id,
                    fileUrl: doc.fileUrl,
                    fileName: doc.fileName,
                    fileSize: doc.fileSize,
                    uploadedAt: doc.uploadedAt,
                    verificationNotes: doc.verificationNotes,
                    verifiedByAI: doc.verifiedByAI,
                    aiConfidence: doc.aiConfidence,
                    aiNotesUz: doc.aiNotesUz,
                    aiNotesRu: doc.aiNotesRu,
                    aiNotesEn: doc.aiNotesEn,
                  }))
                );
                aiGenerated = false;
                aiFallbackUsed = true;
                generationMode = 'static_fallback';
                modelName = undefined;
              } else if (
                ruleSet &&
                ruleSet.requiredDocuments &&
                ruleSet.requiredDocuments.length >= IDEAL_MIN_ITEMS
              ) {
                // SAFETY NET: If rules were available but failed, and legacy produced < IDEAL_MIN_ITEMS,
                // mark for static fallback to ensure quality
                const ruleSetDocumentCount = ruleSet.requiredDocuments.length;
                if (items.length < IDEAL_MIN_ITEMS) {
                  logWarn(
                    '[Checklist][Mode] SAFETY NET: Rules were available but legacy produced insufficient items, will fallback to static',
                    {
                      applicationId,
                      countryCode,
                      visaType: originalVisaTypeName,
                      normalizedVisaType,
                      ruleSetDocumentCount,
                      legacyItemCount: items.length,
                      idealMinItems: IDEAL_MIN_ITEMS,
                      decisionChain:
                        'rules_available -> rules_failed -> legacy_insufficient -> static_fallback',
                    }
                  );
                  // Clear items to trigger static fallback below
                  items = [];
                  aiFallbackUsed = true;
                }
              }
            } else {
              logWarn(
                '[Checklist][Mode] Legacy mode returned insufficient items, using static fallback',
                {
                  applicationId,
                  itemCount: legacyResponse?.checklist?.length || 0,
                }
              );
              aiFallbackUsed = true;
            }
          } catch (legacyError: any) {
            logWarn('[Checklist][Mode] Legacy mode failed, using static fallback', {
              applicationId,
              error: legacyError?.message || String(legacyError),
            });
            aiFallbackUsed = true;
            aiErrorOccurred = true;
          }
        }
      }

      // STEP 3: If both rules-FIRST and legacy GPT failed, use static fallback
      // This is the last resort - static templates that may not reflect current embassy requirements.
      if (items.length < MIN_ITEMS_HARD) {
        // Log structured checklist generation (fallback mode)
        logChecklistGeneration({
          applicationId,
          country: application.country.name,
          countryCode,
          visaType: normalizedVisaType,
          mode: 'fallback',
          jsonValidationPassed: true, // Fallback doesn't use GPT
          jsonValidationRetries: 0,
          itemCount: 0, // Will be set after generation
        });

        generationMode = 'static_fallback';
        modelName = undefined; // Static fallback doesn't use AI

        logError(
          '[Checklist][Mode] Rules + legacy GPT both failed, using STATIC FALLBACK checklist',
          new Error('Both rules and legacy GPT generation failed'),
          {
            countryCode,
            visaType: originalVisaTypeName,
            normalizedVisaType,
            applicationId,
            reason: ruleSet ? 'rules_and_legacy_both_failed' : 'no_rules_and_legacy_failed',
          }
        );

        logInfo('[Checklist][Mode] Using STATIC FALLBACK mode', {
          applicationId,
          countryCode,
          visaType: originalVisaTypeName,
          normalizedVisaType,
          generationMode,
        });

        const { buildFallbackChecklistFromStaticConfig } = await import(
          '../utils/fallback-checklist-helper'
        );
        items = buildFallbackChecklistFromStaticConfig(
          countryCode,
          normalizedVisaType,
          Array.from(existingDocumentsMap.values()).map((doc: any) => ({
            type: doc.type,
            status: doc.status,
            id: doc.id,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            verificationNotes: doc.verificationNotes,
            verifiedByAI: doc.verifiedByAI,
            aiConfidence: doc.aiConfidence,
            aiNotesUz: doc.aiNotesUz,
            aiNotesRu: doc.aiNotesRu,
            aiNotesEn: doc.aiNotesEn,
          }))
        );
        aiGenerated = false;
        aiFallbackUsed = true;
        // Update log with actual item count
        logChecklistGeneration({
          applicationId,
          country: application.country.name,
          countryCode,
          visaType: normalizedVisaType,
          mode: 'fallback',
          jsonValidationPassed: true,
          jsonValidationRetries: 0,
          itemCount: items.length,
        });

        logInfo('[Checklist][Mode] Static fallback generated', {
          applicationId,
          countryCode,
          visaType: originalVisaTypeName,
          normalizedVisaType,
          generationMode,
          itemCount: items.length,
        });
      }

      // Validate final result
      if (items.length < MIN_ITEMS_HARD) {
        logError(
          '[Checklist][Mode] All modes failed, using emergency fallback',
          new Error('All checklist modes failed'),
          {
            applicationId,
            finalItemCount: items.length,
          }
        );
        // Use the old generateRobustFallbackChecklist as last resort
        items = await this.generateRobustFallbackChecklist(
          application.country,
          application.visaType,
          Array.from(existingDocumentsMap.values()).map((doc: any) => ({
            type: doc.type,
            status: doc.status,
            id: doc.id,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            verificationNotes: doc.verificationNotes,
            verifiedByAI: doc.verifiedByAI,
            aiConfidence: doc.aiConfidence,
            aiNotesUz: doc.aiNotesUz,
            aiNotesRu: doc.aiNotesRu,
            aiNotesEn: doc.aiNotesEn,
          }))
        );
        aiGenerated = false;
        aiFallbackUsed = true;
        aiErrorOccurred = true;
      } else if (items.length < IDEAL_MIN_ITEMS) {
        logWarn('[Checklist][Mode] Checklist has fewer than ideal items but is acceptable', {
          applicationId,
          itemCount: items.length,
          idealMin: IDEAL_MIN_ITEMS,
        });
      }

      // Merge full document data including AI verification
      const enrichedItems = this.mergeChecklistItemsWithDocuments(
        items,
        existingDocumentsMap as Map<string, any>,
        applicationId
      );
      const sanitizedItems = this.applyCountryTerminology(
        enrichedItems,
        application.country,
        application.visaType.name
      );

      // Store checklist in database with status 'ready'
      // Include metadata about AI fallback usage and generation mode
      const checklistMetadata = this.buildChecklistDataPayload(sanitizedItems, {
        aiGenerated,
        aiFallbackUsed,
        aiErrorOccurred,
        generationMode,
        modelName, // Model used for AI generation (if applicable)
      });
      await prisma.documentChecklist.update({
        where: { applicationId },
        data: {
          status: 'ready',
          checklistData: JSON.stringify(checklistMetadata),
          aiGenerated,
          generatedAt: new Date(),
          errorMessage: null,
          checklistVersion: CHECKLIST_VERSION,
        },
      });

      logInfo('[Checklist][Async] Checklist generated and stored', {
        applicationId,
        countryCode,
        visaType: originalVisaTypeName,
        normalizedVisaType,
        generationMode,
        model: modelName,
        itemCount: sanitizedItems.length,
        aiGenerated,
        aiFallbackUsed,
      });
    } catch (error: any) {
      // CRITICAL: Even if everything fails, generate a basic fallback checklist
      // Never leave the checklist empty or in 'failed' status
      logError(
        '[Checklist][Async] Failed to generate checklist, using emergency fallback',
        error as Error,
        {
          applicationId,
        }
      );

      // Mark as failed to avoid being stuck in processing
      try {
        const message =
          (error as Error)?.message?.slice(0, 500) ||
          (typeof error === 'string' ? error.slice(0, 500) : 'Unknown error');
        await prisma.documentChecklist.update({
          where: { applicationId },
          data: {
            status: 'failed',
            errorMessage: message,
            updatedAt: new Date(),
          },
        });
      } catch (updateError) {
        logWarn('[Checklist][Async] Failed to mark checklist as failed', {
          applicationId,
          error: (updateError as Error)?.message,
        });
      }

      try {
        // Generate emergency fallback checklist
        const emergencyItems = await this.generateRobustFallbackChecklist(
          application.country,
          application.visaType,
          Array.from(
            (application.documents || []).map((doc: any) => ({
              type: doc.documentType,
              status: doc.status,
              id: doc.id,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              fileSize: doc.fileSize,
              uploadedAt: doc.uploadedAt,
              verificationNotes: doc.verificationNotes,
              verifiedByAI: doc.verifiedByAI ?? false,
              aiConfidence: doc.aiConfidence ?? null,
              aiNotesUz: doc.aiNotesUz ?? null,
              aiNotesRu: doc.aiNotesRu ?? null,
              aiNotesEn: doc.aiNotesEn ?? null,
            }))
          )
        );

        // Merge with documents
        const existingDocumentsMap = this.buildExistingDocumentsMap(application.documents || []);

        const enrichedItems = this.mergeChecklistItemsWithDocuments(
          emergencyItems,
          existingDocumentsMap as Map<string, any>,
          applicationId
        );
        const sanitizedItems = this.applyCountryTerminology(
          enrichedItems,
          application.country,
          application.visaType.name
        );

        // Store checklist with status 'ready' (not 'failed')
        // Include metadata about emergency fallback usage
        const emergencyMetadata = this.buildChecklistDataPayload(sanitizedItems, {
          aiGenerated: false,
          aiFallbackUsed: true,
          aiErrorOccurred: true,
          generationMode: 'static_fallback',
          modelName: undefined, // Emergency fallback doesn't use AI
        });
        await prisma.documentChecklist.update({
          where: { applicationId },
          data: {
            status: 'ready',
            checklistData: JSON.stringify(emergencyMetadata),
            aiGenerated: false,
            generatedAt: new Date(),
            errorMessage: null, // Clear error message since we have a fallback
            checklistVersion: CHECKLIST_VERSION,
          },
        });

        logInfo('[Checklist][Async] Emergency fallback checklist generated and stored', {
          applicationId,
          generationMode: 'static_fallback',
          itemCount: sanitizedItems.length,
        });
      } catch (fallbackError: any) {
        // If even fallback fails, keep status failed and let GET handler attempt on-demand fallback
        logError('[Checklist][Async] Even fallback generation failed', fallbackError as Error, {
          applicationId,
        });
      }
    }
  }

  /**
   * Execute checklist generation as a queued job.
   * Ensures application is loaded and then runs the async generator.
   */
  static async runChecklistJob(applicationId: string, userId: string): Promise<void> {
    const application = await this.findOrCreateCanonicalApplication(applicationId);
    await this.generateChecklistAsync(applicationId, userId, application);
  }

  /**
   * Build checklist response from stored data
   */
  private static buildChecklistResponse(
    applicationId: string,
    countryId: string,
    visaTypeId: string,
    items: ChecklistItem[],
    documents: any[],
    aiGenerated: boolean,
    aiFallbackUsed: boolean = false,
    aiErrorOccurred: boolean = false
  ): DocumentChecklist {
    // Merge with current document status
    const existingDocumentsMap = new Map(
      documents.map((doc: any) => [
        doc.documentType,
        {
          type: doc.documentType,
          status: doc.status,
          id: doc.id,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
          verificationNotes: doc.verificationNotes,
          verifiedByAI: doc.verifiedByAI ?? false,
          aiConfidence: doc.aiConfidence ?? null,
          aiNotesUz: doc.aiNotesUz ?? null,
          aiNotesRu: doc.aiNotesRu ?? null,
          aiNotesEn: doc.aiNotesEn ?? null,
        },
      ])
    );

    const enrichedItems = this.mergeChecklistItemsWithDocuments(
      items,
      existingDocumentsMap,
      applicationId
    );

    const progress = this.calculateDocumentProgress(enrichedItems);
    const totalRequired = enrichedItems.filter((item) => item.required).length;
    const completed = enrichedItems.filter(
      (item) => item.required && item.status === 'verified'
    ).length;

    return {
      applicationId,
      countryId,
      visaTypeId,
      items: enrichedItems,
      totalRequired,
      completed,
      progress,
      generatedAt: new Date().toISOString(),
      aiGenerated,
      aiFallbackUsed,
      aiErrorOccurred,
    };
  }

  /**
   * Find canonical Application; if only legacy VisaApplication exists, create shadow Application
   * with legacyVisaApplicationId mapping. Prefer existing Application rows.
   */
  private static async findOrCreateCanonicalApplication(applicationId: string) {
    // 1) Try Application by id
    let app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
        user: true,
      },
    });
    if (app) {
      const documents = await prisma.userDocument.findMany({
        where: { applicationId: app.id },
      });
      return { ...app, documents };
    }

    // 2) Try Application by legacyVisaApplicationId
    app = await prisma.application.findUnique({
      where: { legacyVisaApplicationId: applicationId },
      include: {
        country: true,
        visaType: true,
        user: true,
      },
    });
    if (app) {
      const documents = await prisma.userDocument.findMany({
        where: { applicationId: app.id },
      });
      return { ...app, documents };
    }

    // 3) Fallback: load legacy VisaApplication and create shadow Application using same id
    const legacy = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
        user: true,
        documents: true,
      },
    });
    if (!legacy) {
      throw errors.notFound('Application');
    }

    // Create shadow Application with same id for stability, map legacy id
    const created = await prisma.application.create({
      data: {
        id: legacy.id,
        userId: legacy.userId,
        countryId: legacy.countryId,
        visaTypeId: legacy.visaTypeId,
        legacyVisaApplicationId: legacy.id,
        status: (legacy.status === 'expired' ? 'rejected' : legacy.status) as any,
        submissionDate: legacy.submissionDate,
        approvalDate: legacy.approvalDate,
        expiryDate: legacy.expiryDate,
        metadata: legacy.notes || null,
      },
    });

    // Refetch with includes and documents
    const createdApp = await prisma.application.findUnique({
      where: { id: created.id },
      include: {
        country: true,
        visaType: true,
        user: true,
      },
    });
    const documents = await prisma.userDocument.findMany({
      where: { applicationId: created.id },
    });

    return { ...createdApp!, documents };
  }

  /**
   * Repair a stuck checklist by writing a fallback and flipping to ready.
   */
  private static async repairStuckChecklist(application: any, storedChecklist: any): Promise<void> {
    try {
      const emergencyItems = await this.generateRobustFallbackChecklist(
        application.country,
        application.visaType,
        (application.documents || []).map((doc: any) => ({
          type: doc.documentType,
          status: doc.status,
          id: doc.id,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt,
          verificationNotes: doc.verificationNotes,
          verifiedByAI: doc.verifiedByAI ?? false,
          aiConfidence: doc.aiConfidence ?? null,
          aiNotesUz: doc.aiNotesUz ?? null,
          aiNotesRu: doc.aiNotesRu ?? null,
          aiNotesEn: doc.aiNotesEn ?? null,
        }))
      );

      const existingDocumentsMap = this.buildExistingDocumentsMap(application.documents || []);
      const enrichedItems = this.mergeChecklistItemsWithDocuments(
        emergencyItems,
        existingDocumentsMap as Map<string, any>,
        application.id
      );
      const sanitizedItems = this.applyCountryTerminology(
        enrichedItems,
        application.country,
        application.visaType.name
      );

      const emergencyMetadata = this.buildChecklistDataPayload(sanitizedItems, {
        aiGenerated: false,
        aiFallbackUsed: true,
        aiErrorOccurred: true,
        generationMode: 'static_fallback',
        modelName: undefined,
      });

      await prisma.documentChecklist.update({
        where: { applicationId: application.id },
        data: {
          status: 'ready',
          checklistData: JSON.stringify(emergencyMetadata),
          aiGenerated: false,
          generatedAt: new Date(),
          errorMessage: 'auto-repaired: stuck processing',
          checklistVersion: CHECKLIST_VERSION,
        },
      });
    } catch (error) {
      logError('[Checklist][Watchdog] Failed to repair stuck checklist', error as Error, {
        applicationId: application?.id,
      });
    }
  }

  /**
   * Generate robust fallback checklist with 7-10 items based on country/visa type
   * This is used when AI fails or returns too few items
   */
  private static async generateRobustFallbackChecklist(
    country: any,
    visaType: any,
    existingDocuments: Array<{
      type: string;
      status: string;
      id: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      uploadedAt?: Date;
      verificationNotes?: string | null;
      verifiedByAI?: boolean | null;
      aiConfidence?: number | null;
      aiNotesUz?: string | null;
      aiNotesRu?: string | null;
      aiNotesEn?: string | null;
    }>
  ): Promise<ChecklistItem[]> {
    const items: ChecklistItem[] = [];
    const countryName = (country?.name || '').toLowerCase();
    const countryCode = (country?.code || '').toUpperCase();
    const visaTypeName = (visaType?.name || '').toLowerCase();
    const isStudent = visaTypeName.includes('student') || visaTypeName.includes('study');
    const isTourist = visaTypeName.includes('tourist') || visaTypeName.includes('tourism');
    const isSchengen = [
      'ES',
      'DE',
      'IT',
      'FR',
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
    const isCanada = countryCode === 'CA';
    const isUnitedStates = countryCode === 'US';

    // Core documents (always included)
    const coreDocs = ['passport', 'passport_photo', 'visa_application_form', 'bank_statement'];

    // Additional documents based on visa type and country
    const additionalDocs: string[] = [];

    if (isStudent) {
      if (isCanada) {
        additionalDocs.push('acceptance_letter'); // LOA for Canada
      } else if (isUnitedStates) {
        additionalDocs.push('i20_form');
      } else {
        additionalDocs.push('acceptance_letter');
      }
      additionalDocs.push('academic_records', 'proof_of_tuition_payment');
    }

    if (isTourist || !isStudent) {
      additionalDocs.push('travel_itinerary', 'hotel_reservations');
    }

    // Country-specific additions
    if (isSchengen) {
      // Schengen requires travel medical insurance (use medical_certificate as proxy)
      additionalDocs.push('medical_certificate');
    }

    // Combine all document types
    const allDocTypes = [...coreDocs, ...additionalDocs];

    // Create checklist items
    for (let i = 0; i < allDocTypes.length; i++) {
      const docType = allDocTypes[i];
      const existingDoc = existingDocuments.find((d) => d.type === docType);
      const translation = getDocumentTranslation(docType);

      // Skip if translation not available (shouldn't happen, but safety check)
      if (!translation) {
        continue;
      }

      const item = {
        id: `checklist-item-${i}`,
        documentType: docType,
        name: translation.nameEn,
        nameUz: translation.nameUz,
        nameRu: translation.nameRu,
        description: translation.descriptionEn,
        descriptionUz: translation.descriptionUz,
        descriptionRu: translation.descriptionRu,
        required: true, // All fallback items are required
        priority: i < coreDocs.length ? 'high' : 'medium',
        status: existingDoc ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id,
        fileUrl: existingDoc?.fileUrl,
        fileName: existingDoc?.fileName,
        fileSize: existingDoc?.fileSize,
        uploadedAt: existingDoc?.uploadedAt?.toISOString(),
        verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence || undefined,
      };
      items.push({
        ...item,
        category: inferCategory(item),
      });
    }

    return items;
  }

  /**
   * Generate checklist items using AI and visa requirements
   * @deprecated Use generateRobustFallbackChecklist for better fallback behavior
   */
  private static async generateChecklistItems(
    country: any,
    visaType: any,
    user: any,
    existingDocuments: Array<{
      type: string;
      status: string;
      id: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      uploadedAt?: Date;
      verificationNotes?: string | null;
      verifiedByAI?: boolean | null;
      aiConfidence?: number | null;
      aiNotesUz?: string | null;
      aiNotesRu?: string | null;
      aiNotesEn?: string | null;
    }>
  ): Promise<ChecklistItem[]> {
    const items: ChecklistItem[] = [];

    // Parse document types from visa type
    let documentTypes: string[] = [];
    try {
      documentTypes = JSON.parse(visaType.documentTypes || '[]');
    } catch {
      documentTypes = [];
    }

    // If no document types specified, use AI to generate them
    if (documentTypes.length === 0) {
      documentTypes = await this.generateDocumentTypesWithAI(country, visaType, user);
    }

    // Create checklist items
    for (let i = 0; i < documentTypes.length; i++) {
      const docType = documentTypes[i];
      const existingDoc = existingDocuments.find((d) => d.type === docType);

      // Get document details using AI
      const details = await this.getDocumentDetails(docType, country, visaType);

      // Get translations
      const translation = getDocumentTranslation(docType);

      const item = {
        id: `checklist-item-${i}`,
        documentType: docType,
        name: translation.nameEn,
        nameUz: translation.nameUz,
        nameRu: translation.nameRu,
        description: translation.descriptionEn,
        descriptionUz: translation.descriptionUz,
        descriptionRu: translation.descriptionRu,
        required: details.required,
        priority: normalizePriority(details.priority),
        status: existingDoc ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id,
        fileUrl: existingDoc?.fileUrl,
        fileName: existingDoc?.fileName,
        fileSize: existingDoc?.fileSize,
        uploadedAt: existingDoc?.uploadedAt?.toISOString(),
        verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence || undefined,
      };
      items.push({
        ...item,
        category: inferCategory(item),
      });
    }

    // Add common documents that might be needed
    const commonDocTypes = ['passport', 'passport_photo'];

    // Add common docs if not already in list
    for (const docType of commonDocTypes) {
      if (!items.find((item) => item.documentType === docType)) {
        const existing = existingDocuments.find((d) => d.type === docType);
        const translation = getDocumentTranslation(docType);

        const existingDoc = existingDocuments.find((d) => d.type === docType);

        const item = {
          id: `checklist-item-${items.length}`,
          documentType: docType,
          name: translation.nameEn,
          nameUz: translation.nameUz,
          nameRu: translation.nameRu,
          description: translation.descriptionEn,
          descriptionUz: translation.descriptionUz,
          descriptionRu: translation.descriptionRu,
          required: true,
          priority: 'high' as const,
          status: existingDoc ? (existingDoc.status as any) : 'missing',
          userDocumentId: existingDoc?.id,
          fileUrl: existingDoc?.fileUrl,
          fileName: existingDoc?.fileName,
          fileSize: existingDoc?.fileSize,
          uploadedAt: existingDoc?.uploadedAt?.toISOString(),
          verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
          aiVerified: existingDoc?.verifiedByAI === true,
          aiConfidence: existingDoc?.aiConfidence || undefined,
        };
        items.push({
          ...item,
          category: inferCategory(item),
        });
      }
    }

    return items;
  }

  /**
   * Generate document types using AI
   */
  private static async generateDocumentTypesWithAI(
    country: any,
    visaType: any,
    user: any
  ): Promise<string[]> {
    try {
      const envConfig = getEnvConfig();
      if (!envConfig.OPENAI_API_KEY) {
        // Fallback to common documents
        return ['passport', 'photo', 'application_form', 'financial_proof'];
      }

      const prompt = `You are a visa application expert. List the required documents for a ${visaType.name} visa application to ${country.name}.

User nationality: ${user.firstName || 'Unknown'} (if available)

Provide a JSON array of document type names (e.g., ["passport", "photo", "bank_statement", "invitation_letter"]).
Only return the JSON array, no other text.`;

      const response = await AIOpenAIService.chat(
        [{ role: 'user', content: prompt }],
        'You are a visa document expert. Return only valid JSON arrays.'
      );

      // Try to parse JSON from response
      try {
        const jsonMatch = response.message.match(/\[.*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback
      }

      // Fallback to common documents
      return ['passport', 'photo', 'application_form', 'financial_proof'];
    } catch (error) {
      logError('Error generating document types with AI', error as Error);
      // Fallback to common documents
      return ['passport', 'photo', 'application_form', 'financial_proof'];
    }
  }

  /**
   * Get document details using AI
   */
  private static async getDocumentDetails(
    documentType: string,
    country: any,
    visaType: any
  ): Promise<{
    name: string;
    description: string;
    required: boolean;
    priority: 'high' | 'medium' | 'low';
    instructions?: string;
    exampleUrl?: string;
  }> {
    try {
      const envConfig = getEnvConfig();
      if (!envConfig.OPENAI_API_KEY) {
        // Return default details
        return {
          name: this.formatDocumentName(documentType),
          description: `Required ${documentType} document`,
          required: true,
          priority: 'high',
        };
      }

      const prompt = `Provide details for the document type "${documentType}" required for ${visaType.name} visa to ${country.name}.

Return a JSON object with:
{
  "name": "Human-readable document name",
  "description": "Brief description of what this document is",
  "required": true/false,
  "priority": "high"/"medium"/"low",
  "instructions": "How to obtain/prepare this document",
  "exampleUrl": "Optional URL to example or official source"
}

Only return the JSON object, no other text.`;

      const response = await AIOpenAIService.chat(
        [{ role: 'user', content: prompt }],
        'You are a visa document expert. Return only valid JSON objects.'
      );

      // Try to parse JSON from response
      try {
        const jsonMatch = response.message.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            name: parsed.name || this.formatDocumentName(documentType),
            description: parsed.description || `Required ${documentType} document`,
            required: parsed.required !== false,
            priority: normalizePriority(parsed.priority) || 'high',
            instructions: parsed.instructions,
            exampleUrl: parsed.exampleUrl,
          };
        }
      } catch {
        // Fallback
      }

      // Fallback
      return {
        name: this.formatDocumentName(documentType),
        description: `Required ${documentType} document for ${visaType.name} visa`,
        required: true,
        priority: 'high',
      };
    } catch (error) {
      logError('Error getting document details', error as Error);
      return {
        name: this.formatDocumentName(documentType),
        description: `Required ${documentType} document`,
        required: true,
        priority: 'high',
      };
    }
  }

  /**
   * Format document type name
   */
  private static formatDocumentName(documentType: string): string {
    return documentType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convert VisaChecklistEngine checklist format to ChecklistItem format
   */
  private static convertEngineChecklistToItems(
    engineItems: Array<{
      id: string;
      documentType: string;
      category: 'required' | 'highly_recommended' | 'optional';
      required: boolean;
      name: string;
      nameUz: string;
      nameRu: string;
      description: string;
      appliesToThisApplicant?: boolean;
      reasonIfApplies?: string;
      extraRecommended?: boolean;
      group?: string;
      priority?: number;
      dependsOn?: string[];
    }>,
    existingDocumentsMap: Map<string, any>
  ): ChecklistItem[] {
    return engineItems.map((item, index) => {
      const existingDoc = existingDocumentsMap.get(item.documentType);

      return {
        id: item.id || `checklist-item-${index}`,
        documentType: item.documentType,
        name: item.name,
        nameUz: item.nameUz,
        nameRu: item.nameRu,
        description: item.description,
        descriptionUz: item.description, // Engine doesn't provide separate translations
        descriptionRu: item.description,
        category: item.category,
        required: item.required,
        priority: item.priority
          ? item.priority <= 2
            ? 'high'
            : item.priority <= 4
              ? 'medium'
              : 'low'
          : 'medium',
        status: existingDoc?.status ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id,
        fileUrl: existingDoc?.fileUrl,
        fileName: existingDoc?.fileName,
        fileSize: existingDoc?.fileSize,
        uploadedAt: existingDoc?.uploadedAt?.toISOString(),
        verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence,
        whereToObtain: item.reasonIfApplies || undefined,
        whereToObtainUz: item.reasonIfApplies || undefined,
        whereToObtainRu: item.reasonIfApplies || undefined,
      };
    });
  }

  /**
   * Convert legacy AI checklist format to ChecklistItem format
   */
  private static convertLegacyChecklistToItems(
    legacyItems: Array<{
      document?: string;
      name?: string;
      nameUz?: string;
      nameRu?: string;
      category?: 'required' | 'highly_recommended' | 'optional';
      required?: boolean;
      priority?: 'high' | 'medium' | 'low';
      description?: string;
      descriptionUz?: string;
      descriptionRu?: string;
      whereToObtain?: string;
      whereToObtainUz?: string;
      whereToObtainRu?: string;
    }>,
    existingDocumentsMap: Map<string, any>
  ): ChecklistItem[] {
    const { toCanonicalDocumentType } = require('../config/document-types-map');

    return legacyItems.map((aiItem, index) => {
      // Normalize document type using document type mapping (handles aliases like "International Passport" -> "passport")
      // Try document field first, then name field (both may contain the document type)
      const rawDocType = aiItem.document || aiItem.name || `document_${index}`;
      // toCanonicalDocumentType handles normalization (lowercase, spaces to underscores, etc.)
      const normalized = toCanonicalDocumentType(rawDocType);
      const docType = normalized.canonicalType || normalized.originalType || rawDocType;

      const existingDoc = existingDocumentsMap.get(docType);

      const item = {
        id: `checklist-item-${index}`,
        documentType: docType,
        name: aiItem.name || aiItem.document || 'Unknown Document',
        nameUz: aiItem.nameUz || aiItem.name || aiItem.document || "Noma'lum hujjat",
        nameRu: aiItem.nameRu || aiItem.name || aiItem.document || 'Неизвестный документ',
        description: aiItem.description || '',
        descriptionUz: aiItem.descriptionUz || aiItem.description || '',
        descriptionRu: aiItem.descriptionRu || aiItem.description || '',
        required: aiItem.required !== undefined ? aiItem.required : true,
        priority: normalizePriority(aiItem.priority || (aiItem.required ? 'high' : 'medium')),
        status: existingDoc?.status ? (existingDoc.status as any) : 'missing',
        userDocumentId: existingDoc?.id as string | undefined,
        fileUrl: existingDoc?.fileUrl as string | undefined,
        fileName: existingDoc?.fileName as string | undefined,
        fileSize: existingDoc?.fileSize as number | undefined,
        uploadedAt: existingDoc?.uploadedAt
          ? (existingDoc.uploadedAt as Date).toISOString()
          : undefined,
        verificationNotes:
          (existingDoc?.aiNotesUz as string | null) ||
          (existingDoc?.verificationNotes as string | null) ||
          undefined,
        aiVerified: existingDoc?.verifiedByAI === true,
        aiConfidence: existingDoc?.aiConfidence as number | undefined,
        whereToObtain: aiItem.whereToObtain,
        whereToObtainUz: aiItem.whereToObtainUz,
        whereToObtainRu: aiItem.whereToObtainRu,
      };
      return {
        ...item,
        category: aiItem.category ?? inferCategory(item),
      };
    });
  }

  /**
   * Merge checklist items with existing documents
   * Reusable helper for both generateChecklist and recalculateDocumentProgress
   *
   * Matches documents by documentType (stable key) to ensure uploaded documents
   * are always attached to the correct checklist items, even after regeneration.
   */
  /**
   * Find matching document with fuzzy matching support
   */
  private static findMatchingDocument(
    documentType: string,
    existingDocumentsMap: Map<string, any>,
    itemName?: string // Added itemName for better matching
  ): any {
    const { toCanonicalDocumentType, documentTypesMatch } = require('../config/document-types-map');

    // Normalize checklist item document type (handles aliases like "International Passport" -> "passport")
    const checklistNorm = toCanonicalDocumentType(documentType);
    const checklistKey = checklistNorm.canonicalType ?? checklistNorm.originalType;

    // First try exact match on original type
    const exactMatch = existingDocumentsMap.get(documentType);
    if (exactMatch) {
      return exactMatch;
    }

    // Try match on normalized canonical type
    if (checklistNorm.canonicalType) {
      const canonicalMatch = existingDocumentsMap.get(checklistNorm.canonicalType);
      if (canonicalMatch) {
        return canonicalMatch;
      }
    }

    // Try matching by normalizing both sides
    for (const [docType, doc] of existingDocumentsMap.entries()) {
      const userDocNorm = toCanonicalDocumentType(docType);
      const userDocKey = userDocNorm.canonicalType ?? userDocNorm.originalType;

      // Match if canonical types match
      if (checklistNorm.canonicalType && userDocNorm.canonicalType) {
        if (checklistNorm.canonicalType === userDocNorm.canonicalType) {
          logInfo('[Checklist][Merge] Normalized match found', {
            checklistType: documentType,
            documentType: docType,
            canonicalType: checklistNorm.canonicalType,
          });
          return doc;
        }
      }

      // Fallback: use documentTypesMatch helper for alias-aware matching
      if (documentTypesMatch(checklistKey, userDocKey)) {
        logInfo('[Checklist][Merge] Alias-aware match found', {
          checklistType: documentType,
          documentType: docType,
          checklistKey,
          userDocKey,
        });
        return doc;
      }
    }

    // NEW: Try matching by item name if provided (handles "International Passport" -> "passport")
    if (itemName) {
      const itemNameNorm = toCanonicalDocumentType(itemName);
      const itemNameKey = itemNameNorm.canonicalType ?? itemNameNorm.originalType;
      if (itemNameNorm.canonicalType) {
        const canonicalNameMatch = existingDocumentsMap.get(itemNameNorm.canonicalType);
        if (canonicalNameMatch) {
          logInfo('[Checklist][Merge] Canonical name match found', {
            checklistType: documentType,
            itemName: itemName,
            documentType: canonicalNameMatch.type,
            canonicalType: itemNameNorm.canonicalType,
          });
          return canonicalNameMatch;
        }
      }
      // Fallback: use documentTypesMatch helper for alias-aware matching with item name
      for (const [docType, doc] of existingDocumentsMap.entries()) {
        const userDocNorm = toCanonicalDocumentType(docType);
        const userDocKey = userDocNorm.canonicalType ?? userDocNorm.originalType;
        if (documentTypesMatch(itemNameKey, userDocKey)) {
          logInfo('[Checklist][Merge] Alias-aware name match found', {
            checklistType: documentType,
            itemName: itemName,
            documentType: docType,
            itemNameKey,
            userDocKey,
          });
          return doc;
        }
      }
    }

    // Enhanced fuzzy matching: also check normalized document type against item name variations
    // This handles cases where GPT outputs "International Passport" but we need to match "passport"
    const normalizedType = documentType.toLowerCase().replace(/[_-]/g, '').trim();
    for (const [docType, doc] of existingDocumentsMap.entries()) {
      const userDocNorm = toCanonicalDocumentType(docType);
      const userDocCanonical = userDocNorm.canonicalType ?? userDocNorm.originalType;
      const normalizedDocType = userDocCanonical.toLowerCase().replace(/[_-]/g, '').trim();

      // Check if normalized types match (handles "international_passport" -> "passport")
      if (
        normalizedType === normalizedDocType ||
        normalizedType.includes(normalizedDocType) ||
        normalizedDocType.includes(normalizedType)
      ) {
        // Additional safety: only match if they're similar enough
        const similarity = this.calculateStringSimilarity(normalizedType, normalizedDocType);
        if (similarity > 0.6) {
          // Lowered threshold to catch more matches
          logInfo('[Checklist][Merge] Enhanced fuzzy match found', {
            checklistType: documentType,
            documentType: docType,
            canonicalType: userDocCanonical,
            similarity,
          });
          return doc;
        }
      }
    }

    // Last resort: fuzzy matching for common variations (legacy fallback)
    for (const [docType, doc] of existingDocumentsMap.entries()) {
      const normalizedDocType = docType.toLowerCase().replace(/[_-]/g, '');

      // Check if one contains the other (e.g., "bank_statement" matches "bank_statement_6_months")
      if (
        normalizedType.includes(normalizedDocType) ||
        normalizedDocType.includes(normalizedType)
      ) {
        // Additional safety: only match if they're similar enough
        const similarity = this.calculateStringSimilarity(normalizedType, normalizedDocType);
        if (similarity > 0.7) {
          logInfo('[Checklist][Merge] Fuzzy match found (legacy fallback)', {
            checklistType: documentType,
            documentType: docType,
            similarity,
          });
          return doc;
        }
      }
    }

    return null;
  }

  /**
   * Calculate simple string similarity (0-1)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  private static mergeChecklistItemsWithDocuments(
    items: ChecklistItem[],
    existingDocumentsMap: Map<string, any>,
    applicationId?: string
  ): ChecklistItem[] {
    const documentsFound = existingDocumentsMap.size;
    let merged = 0;
    const matchedDocumentIds = new Set<string>();
    const unmatchedItems: string[] = [];

    const mergedItems = items.map((item) => {
      // Try exact match first, then fuzzy match (pass item.name for better matching)
      const doc = this.findMatchingDocument(item.documentType, existingDocumentsMap, item.name);
      if (doc) {
        merged++;
        if (doc.id) {
          matchedDocumentIds.add(doc.id);
        }
        return {
          ...item,
          status: doc.status as any,
          userDocumentId: doc.id,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt?.toISOString(),
          verificationNotes: doc.aiNotesUz || doc.verificationNotes, // Prefer AI notes
          aiVerified: doc.verifiedByAI === true,
          aiConfidence: doc.aiConfidence || undefined,
        };
      } else {
        unmatchedItems.push(item.documentType);
        // Reduced log level: missing uploaded docs is normal, not a warning
        // Only log at debug level for individual items
      }
      return item;
    });

    // Log merge statistics for debugging
    if (applicationId) {
      const missingDocs = unmatchedItems.length > 0 ? unmatchedItems.slice(0, 10) : []; // Limit to first 10 for log size
      logInfo('[Checklist][Merge] Document merge completed', {
        applicationId,
        documentsFound,
        merged,
        totalItems: items.length,
        unmatchedCount: unmatchedItems.length,
        unmatchedDocuments: Math.max(0, documentsFound - matchedDocumentIds.size),
        ...(unmatchedItems.length > 0 && { missingDocs }), // Only include if there are missing docs
        ...(unmatchedItems.length > 0 && { unmatchedItems }), // Only include if there are unmatched items
      });
    }

    return mergedItems;
  }

  /**
   * Calculate document-based progress
   * Single source of truth for progress calculation
   * Formula: (verified required documents / total required documents) * 100
   */
  private static calculateDocumentProgress(items: ChecklistItem[]): number {
    const requiredItems = items.filter((item) => item.required);
    const completed = requiredItems.filter((item) => item.status === 'verified');
    return requiredItems.length > 0
      ? Math.round((completed.length / requiredItems.length) * 100)
      : 0;
  }

  /**
   * Recalculate document-based progress for an application
   * Used to update VisaApplication.progressPercentage after document uploads
   *
   * @param applicationId - Application ID
   * @returns Progress percentage (0-100)
   */
  static async recalculateDocumentProgress(applicationId: string): Promise<number> {
    try {
      // Get application with related data
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
          user: true,
          documents: true,
        },
      });

      if (!application) {
        throw errors.notFound('Application');
      }

      // Get existing documents with full data
      const existingDocumentsMap = this.buildExistingDocumentsMap(application.documents);

      // Generate checklist items using same AI-first flow as generateChecklist
      let items: ChecklistItem[] = [];

      try {
        // Build AI user context with questionnaire summary
        const userContext = await buildAIUserContext(application.userId, applicationId);

        // Call AI to generate checklist as primary source
        const aiChecklist = await AIOpenAIService.generateChecklist(
          userContext,
          application.country.name,
          application.visaType.name
        );

        // Parse AI response into ChecklistItem[]
        if (
          aiChecklist.checklist &&
          Array.isArray(aiChecklist.checklist) &&
          aiChecklist.checklist.length > 0
        ) {
          items = aiChecklist.checklist.map((aiItem: any, index: number) => {
            const docType =
              aiItem.document ||
              aiItem.name?.toLowerCase().replace(/\s+/g, '_') ||
              `document_${index}`;
            const existingDoc = existingDocumentsMap.get(docType);

            const item = {
              id: `checklist-item-${index}`,
              documentType: docType,
              name: aiItem.name || aiItem.document || 'Unknown Document',
              nameUz: aiItem.nameUz || aiItem.name || aiItem.document || "Noma'lum hujjat",
              nameRu: aiItem.nameRu || aiItem.name || aiItem.document || 'Неизвестный документ',
              description: aiItem.description || '',
              descriptionUz: aiItem.descriptionUz || aiItem.description || '',
              descriptionRu: aiItem.descriptionRu || aiItem.description || '',
              required: aiItem.required !== undefined ? aiItem.required : true,
              priority: normalizePriority(aiItem.priority || (aiItem.required ? 'high' : 'medium')),
              status: existingDoc ? (existingDoc.status as any) : 'missing',
              userDocumentId: existingDoc?.id,
              fileUrl: existingDoc?.fileUrl,
              fileName: existingDoc?.fileName,
              fileSize: existingDoc?.fileSize,
              uploadedAt: existingDoc?.uploadedAt?.toISOString(),
              verificationNotes:
                existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
              aiVerified: existingDoc?.verifiedByAI === true,
              aiConfidence: existingDoc?.aiConfidence || undefined,
            };
            return {
              ...item,
              category: aiItem.category ?? inferCategory(item),
            };
          });

          // Validate AI result - only use fallback if empty or invalid
          const MIN_AI_ITEMS = 4; // Minimum threshold for warning (but still use AI checklist)
          if (!items || items.length === 0) {
            // AI returned empty checklist - use fallback
            logWarn('[DocumentProgress] AI returned empty checklist, using fallback', {
              applicationId,
              aiItemCount: 0,
              reason: 'empty_checklist',
            });
            items = await this.generateRobustFallbackChecklist(
              application.country,
              application.visaType,
              Array.from(existingDocumentsMap.values()).map((doc: any) => ({
                type: doc.type,
                status: doc.status,
                id: doc.id,
                fileUrl: doc.fileUrl,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt,
                verificationNotes: doc.verificationNotes,
                verifiedByAI: doc.verifiedByAI,
                aiConfidence: doc.aiConfidence,
                aiNotesUz: doc.aiNotesUz,
                aiNotesRu: doc.aiNotesRu,
                aiNotesEn: doc.aiNotesEn,
              }))
            );
          } else if (items.length < MIN_AI_ITEMS) {
            // AI checklist has few items but still use it - just warn
            logWarn('[DocumentProgress] AI checklist has few items but using it anyway', {
              applicationId,
              aiItemCount: items.length,
              threshold: MIN_AI_ITEMS,
              reason: 'few_items_but_using_ai',
            });
          }
        } else {
          throw new Error('AI returned empty checklist');
        }
      } catch (aiError: any) {
        // Fallback to robust checklist if AI fails
        logWarn('[DocumentProgress] AI checklist generation failed, using fallback', {
          applicationId,
          reason: 'ai_error',
          errorMessage: aiError?.message || String(aiError),
        });

        items = await this.generateRobustFallbackChecklist(
          application.country,
          application.visaType,
          Array.from(existingDocumentsMap.values()).map((doc: any) => ({
            type: doc.type,
            status: doc.status,
            id: doc.id,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            verificationNotes: doc.verificationNotes,
            verifiedByAI: doc.verifiedByAI,
            aiConfidence: doc.aiConfidence,
            aiNotesUz: doc.aiNotesUz,
            aiNotesRu: doc.aiNotesRu,
            aiNotesEn: doc.aiNotesEn,
          }))
        );
      }

      // Merge with documents and sanitize terminology
      const enrichedItems = this.mergeChecklistItemsWithDocuments(
        items,
        existingDocumentsMap,
        applicationId
      );
      const sanitizedItems = this.applyCountryTerminology(
        enrichedItems,
        application.country,
        application.visaType.name
      );

      // Calculate progress using unified formula
      const progress = this.calculateDocumentProgress(sanitizedItems);

      logInfo('[DocumentProgress] Recalculated progress from documents', {
        applicationId,
        progress,
        totalRequired: sanitizedItems.filter((i) => i.required).length,
        verified: sanitizedItems.filter((i) => i.required && i.status === 'verified').length,
      });

      return progress;
    } catch (error) {
      logError('[DocumentProgress] Failed to recalculate progress', error as Error, {
        applicationId,
      });
      throw error;
    }
  }

  private static applyCountryTerminology(
    items: ChecklistItem[],
    country: { code?: string | null; name?: string | null },
    visaTypeName: string
  ): ChecklistItem[] {
    const code = country?.code?.toUpperCase() || '';
    const countryName = (country?.name || '').toLowerCase();
    const isUnitedStates =
      code === 'US' || countryName.includes('united states') || countryName.includes('usa');
    const isCanada = code === 'CA' || countryName.includes('canada');
    const isStudentVisa = visaTypeName.toLowerCase().includes('student');

    return items.map((item) => {
      const searchable = [
        item.name,
        item.nameUz,
        item.nameRu,
        item.description,
        item.descriptionUz,
        item.descriptionRu,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const mentionsI20 = searchable.includes('i-20') || searchable.includes('i20');

      if (!isUnitedStates && mentionsI20) {
        return this.buildAcceptanceLetterItem(item, isCanada);
      }

      if (isCanada && isStudentVisa && item.documentType === 'acceptance_letter') {
        return this.buildAcceptanceLetterItem(item, true);
      }

      return item;
    });
  }

  private static buildAcceptanceLetterItem(
    item: ChecklistItem,
    preferCanadianLoa: boolean
  ): ChecklistItem {
    const nameEn = preferCanadianLoa
      ? 'Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)'
      : 'Official Acceptance Letter from the admitting school';
    const nameUz = preferCanadianLoa
      ? 'Kanadadagi DLI tomonidan berilgan qabul xati (LOA)'
      : "Ta'lim muassasasidan rasmiy qabul xati";
    const nameRu = preferCanadianLoa
      ? 'Письмо о зачислении (LOA) от канадского учебного заведения из списка DLI'
      : 'Официальное письмо о зачислении от учебного заведения';

    const descriptionEn = preferCanadianLoa
      ? 'Provide the LOA issued by your Canadian DLI that lists the program, start date, DLI number, and student ID.'
      : 'Provide the official admission letter confirming your enrolment details.';
    const descriptionUz = preferCanadianLoa
      ? 'Kanadadagi DLI tomonidan berilgan LOA (dastur, boshlanish sanasi, DLI raqami, talaba ID) nusxasini yuklang.'
      : 'Qabul qilinganligingizni tasdiqlovchi rasmiy qabul xatini yuklang.';
    const descriptionRu = preferCanadianLoa
      ? 'Загрузите LOA от канадского DLI с указанием программы, даты начала, номера DLI и ID студента.'
      : 'Загрузите официальное письмо о зачислении с деталями программы.';

    const whereToObtainEn = preferCanadianLoa
      ? 'Request the LOA directly from the admissions office of your Canadian DLI and upload the original PDF or scan.'
      : 'Request this letter from the admissions/registrar office of the school that accepted you.';
    const whereToObtainUz = preferCanadianLoa
      ? "Kanadadagi DLI qabul bo'limidan LOA ni oling va PDF yoki skan nusxasini yuklang."
      : "Qabul qilgan ta'lim muassasasining qabul bo'limidan rasmiy qabul xatini so'rang va nusxasini yuklang.";
    const whereToObtainRu = preferCanadianLoa
      ? 'Получите LOA в приёмной комиссии канадского DLI и загрузите оригинальный PDF/скан.'
      : 'Запросите письмо о зачислении в приёмной комиссии выбранного учебного заведения и загрузите его копию.';

    return {
      ...item,
      documentType: 'acceptance_letter',
      name: nameEn,
      nameUz,
      nameRu,
      description: descriptionEn,
      descriptionUz,
      descriptionRu,
      whereToObtain: whereToObtainEn,
      whereToObtainUz,
      whereToObtainRu,
    };
  }

  /**
   * Update checklist item status
   */
  static async updateItemStatus(
    applicationId: string,
    itemId: string,
    status: ChecklistItem['status'],
    documentId?: string
  ): Promise<void> {
    const application = await this.findOrCreateCanonicalApplication(applicationId);

    if (!application) {
      throw errors.notFound('Application');
    }

    // Update document status if documentId provided
    // Map ChecklistItem status to UserDocumentStatus
    if (documentId) {
      const statusMap: Record<string, string> = {
        pending: 'pending',
        verified: 'verified',
        rejected: 'rejected',
        missing: 'pending', // Map missing to pending
        processing: 'pending', // Map processing to pending
      };
      const mappedStatus = statusMap[status] || 'pending';
      await prisma.userDocument.update({
        where: { id: documentId },
        data: { status: mappedStatus as any },
      });
    }
  }
}
