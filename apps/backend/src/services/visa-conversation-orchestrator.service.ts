/**
 * Visa Conversation Orchestrator Service (Phase 6)
 *
 * This service orchestrates chat conversations by:
 * - Gathering comprehensive context (application, risk, checklist, docs, rules, playbook)
 * - Building rich ChatAIContext
 * - Calling chat model with strong system prompt
 * - Running self-evaluation pass on replies
 * - Returning final text reply with metadata
 */

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import { buildAIUserContext, buildCanonicalAIUserContext } from './ai-context.service';
import { DocumentChecklistService } from './document-checklist.service';
import { VisaRiskExplanationService } from './visa-risk-explanation.service';
import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import {
  getCountryVisaPlaybook,
  type VisaCategory,
  type CountryVisaPlaybook,
} from '../config/country-visa-playbooks';
import { VISA_CHAT_SYSTEM_PROMPT, VISA_CHAT_SELF_CHECK_PROMPT } from '../config/ai-prompts';
import { logInfo, logWarn, logError } from '../middleware/logger';
import { logChat } from '../utils/gpt-logging';
import { normalizeDocumentType } from '../config/document-types-map';
import {
  normalizeCountryCode,
  getCountryNameFromCode,
  buildCanonicalCountryContext,
  assertCountryConsistency,
} from '../config/country-registry';

const prisma = new PrismaClient();

/**
 * Chat request from user
 */
export interface VisaChatRequest {
  userId: string;
  message: string;
  applicationId?: string; // optional; if absent, orchestrator picks the "most relevant" or asks to choose
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Chat response with metadata
 */
export interface VisaChatResponse {
  reply: string;
  // optional metadata:
  applicationId?: string;
  countryCode?: string;
  visaType?: string;
  visaCategory?: 'tourist' | 'student';
  riskLevel?: 'low' | 'medium' | 'high';
  riskDrivers?: string[];
  selfCheck?: {
    passed: boolean;
    flags: string[]; // high-level codes like ["COUNTRY_MISMATCH", "PROMISES_APPROVAL"]
  };
  // For backward compatibility with existing chat API
  sources?: any[];
  tokens_used?: number;
  model?: string;
  id?: string;
}

/**
 * Chat AI Context (internal structure)
 */
interface ChatAIContext {
  // Application info
  applicationId?: string;
  countryCode?: string;
  countryName?: string;
  visaType?: string;
  visaCategory?: 'tourist' | 'student';

  // Risk profile
  riskLevel?: 'low' | 'medium' | 'high';
  riskScore?: number;
  riskDrivers?: string[];

  // Expert fields
  financial?: {
    requiredFundsUSD?: number;
    availableFundsUSD?: number;
    financialSufficiencyRatio?: number;
    financialSufficiencyLabel?: 'low' | 'borderline' | 'sufficient' | 'strong';
  };
  ties?: {
    tiesStrengthScore?: number;
    tiesStrengthLabel?: 'weak' | 'medium' | 'strong';
    hasPropertyInUzbekistan?: boolean;
    hasFamilyInUzbekistan?: boolean;
    hasChildren?: boolean;
    isEmployed?: boolean;
  };
  travelHistory?: {
    travelHistoryScore?: number;
    travelHistoryLabel?: 'none' | 'limited' | 'good' | 'strong';
    previousVisaRejections?: number;
  };

  // Checklist status
  checklistSummary?: {
    totalRequired: number;
    uploadedCount: number;
    approvedCount: number;
    needFixCount: number;
    missingCount: number;
    items: Array<{
      documentType: string;
      name: string;
      status: 'missing' | 'pending' | 'verified' | 'rejected';
      aiDecision?: 'APPROVED' | 'NEED_FIX' | 'REJECTED';
    }>;
  };

  // Official rules summary
  officialRulesSummary?: {
    hasRules: boolean;
    source?: string;
    confidence?: number;
    keyRequirements?: string[];
  };

  // Country playbook summary
  playbookSummary?: {
    hasPlaybook: boolean;
    typicalRefusalReasons?: string[];
    keyOfficerFocus?: string[];
    uzbekContextHints?: string[];
  };

  // Risk explanation (if available)
  riskExplanation?: {
    summaryEn?: string;
    summaryUz?: string;
    summaryRu?: string;
    recommendations?: Array<{
      titleEn: string;
      detailsEn: string;
    }>;
  };
}

/**
 * Visa Conversation Orchestrator Service
 */
export class VisaConversationOrchestratorService {
  /**
   * Handle user message with comprehensive context
   */
  static async handleUserMessage(request: VisaChatRequest): Promise<VisaChatResponse> {
    try {
      const { userId, message, applicationId, conversationHistory } = request;

      logInfo('[VisaChatOrchestrator] Processing message', {
        userId,
        messageLength: message.length,
        hasApplicationId: !!applicationId,
        historyLength: conversationHistory?.length || 0,
      });

      // Step 1: Identify active application
      const activeApplicationId = await this.identifyActiveApplication(userId, applicationId);

      // Step 2: Build comprehensive context
      const chatContext = await this.buildChatContext(userId, activeApplicationId);

      // Step 3: Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(chatContext);

      // Step 4: Build user messages (history + current message)
      const messages = this.buildMessages(conversationHistory || [], message, chatContext);

      // Step 5: Call chat model
      const aiConfig = getAIConfig('chat');
      const openaiClient = AIOpenAIService.getOpenAIClient();

      logInfo('[VisaChatOrchestrator] Calling chat model', {
        model: aiConfig.model,
        messageLength: message.length,
        contextSize: JSON.stringify(chatContext).length,
      });

      const chatResponse = await openaiClient.chat.completions.create({
        model: aiConfig.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      });

      const primaryReply =
        chatResponse.choices[0]?.message?.content ||
        'I apologize, but I could not generate a response.';
      const tokensUsed = chatResponse.usage?.total_tokens || 0;

      logInfo('[VisaChatOrchestrator] Primary reply generated', {
        replyLength: primaryReply.length,
        tokensUsed,
      });

      // Step 6: Run self-evaluation
      const selfCheck = await this.runSelfEvaluation(chatContext, message, primaryReply);

      logInfo('[VisaChatOrchestrator] Self-evaluation completed', {
        passed: selfCheck.passed,
        flags: selfCheck.flags,
      });

      // Step 7: If self-check failed, regenerate with hints (Option B)
      let finalReply = primaryReply;
      if (!selfCheck.passed && selfCheck.flags.length > 0) {
        logWarn('[VisaChatOrchestrator] Self-check failed, regenerating reply', {
          flags: selfCheck.flags,
        });

        const regeneratedReply = await this.regenerateReplyWithHints(
          chatContext,
          message,
          primaryReply,
          selfCheck.flags,
          conversationHistory || []
        );

        if (regeneratedReply) {
          finalReply = regeneratedReply;

          // Re-run self-check on regenerated reply
          const secondCheck = await this.runSelfEvaluation(chatContext, message, finalReply);

          if (secondCheck.passed) {
            selfCheck.passed = true;
            selfCheck.flags = [];
          } else {
            // Keep flags but note it's after regeneration
            logWarn('[VisaChatOrchestrator] Regenerated reply still has issues', {
              flags: secondCheck.flags,
            });
          }
        }
      }

      // Step 8: Build response
      const response: VisaChatResponse = {
        reply: finalReply,
        applicationId: chatContext.applicationId,
        countryCode: chatContext.countryCode,
        visaType: chatContext.visaType,
        visaCategory: chatContext.visaCategory,
        riskLevel: chatContext.riskLevel,
        riskDrivers: chatContext.riskDrivers,
        selfCheck: {
          passed: selfCheck.passed,
          flags: selfCheck.flags,
        },
        sources: [],
        tokens_used: tokensUsed,
        model: aiConfig.model,
      };

      logInfo('[VisaChatOrchestrator] Response built', {
        replyLength: response.reply.length,
        hasSelfCheck: !!response.selfCheck,
        selfCheckPassed: response.selfCheck?.passed,
      });

      // Phase 6: Log chat interaction
      logChat({
        userId: request.userId,
        applicationId: response.applicationId,
        countryCode: response.countryCode,
        visaType: response.visaType,
        visaCategory: response.visaCategory,
        messageLength: message.length,
        replyLength: response.reply.length,
        tokensUsed: response.tokens_used,
        selfCheckPassed: response.selfCheck?.passed,
        selfCheckFlags: response.selfCheck?.flags,
        riskLevel: response.riskLevel,
        riskDrivers: response.riskDrivers,
        hasVisaRuleSet: chatContext.officialRulesSummary?.hasRules,
        hasCountryPlaybook: chatContext.playbookSummary?.hasPlaybook,
      });

      return response;
    } catch (error) {
      logError('[VisaChatOrchestrator] Error handling message', error as Error, {
        userId: request.userId,
        applicationId: request.applicationId,
      });

      // Return safe fallback
      return {
        reply:
          "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        selfCheck: {
          passed: false,
          flags: ['ERROR'],
        },
      };
    }
  }

  /**
   * Identify active application
   */
  private static async identifyActiveApplication(
    userId: string,
    providedApplicationId?: string
  ): Promise<string | undefined> {
    if (providedApplicationId) {
      // Verify it belongs to user
      const app = await prisma.visaApplication.findFirst({
        where: {
          id: providedApplicationId,
          userId,
        },
      });
      if (app) {
        return providedApplicationId;
      }
    }

    // Find most recent "in progress" application
    const recentApp = await prisma.visaApplication.findFirst({
      where: {
        userId,
        status: {
          in: ['draft', 'in_progress', 'pending'],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return recentApp?.id;
  }

  /**
   * Build comprehensive chat context
   */
  private static async buildChatContext(
    userId: string,
    applicationId?: string
  ): Promise<ChatAIContext> {
    const context: ChatAIContext = {};

    if (!applicationId) {
      // Pre-application context: general guidance only
      return context;
    }

    try {
      // Fetch application
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
          user: true,
        },
      });

      if (!application) {
        return context;
      }

      context.applicationId = applicationId;
      // Phase 8: Normalize country code using CountryRegistry
      const normalizedCountryCode =
        normalizeCountryCode(application.country.code) || application.country.code.toUpperCase();
      const countryContext = buildCanonicalCountryContext(normalizedCountryCode);
      context.countryCode = normalizedCountryCode;
      context.countryName = countryContext?.countryName || application.country.name;

      // Assert consistency
      const consistency = assertCountryConsistency(
        normalizedCountryCode,
        application.country.code,
        canonicalContext?.application.country,
        canonicalContext?.countryContext?.countryCode
      );
      if (!consistency.consistent) {
        logWarn('[VisaChatOrchestrator] Country consistency check failed', {
          mismatches: consistency.mismatches,
          normalizedCountryCode,
          originalCountryCode: application.country.code,
        });
      }
      context.visaType = application.visaType.name.toLowerCase();

      // Derive visaCategory
      context.visaCategory =
        context.visaType.includes('student') ||
        context.visaType.includes('study') ||
        context.visaType === 'f-1' ||
        context.visaType === 'j-1'
          ? 'student'
          : 'tourist';

      // Build canonical AI user context (includes risk drivers, expert fields)
      try {
        const aiUserContext = await buildAIUserContext(userId, applicationId);
        const canonicalContext = await buildCanonicalAIUserContext(aiUserContext);

        context.riskLevel = canonicalContext.riskScore?.level;
        context.riskScore = canonicalContext.riskScore?.probabilityPercent;
        context.riskDrivers = canonicalContext.riskDrivers || [];
        context.financial = canonicalContext.financial;
        context.ties = canonicalContext.ties;
        context.travelHistory = canonicalContext.travelHistory;
      } catch (error) {
        logWarn('[VisaChatOrchestrator] Failed to build canonical context', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Fetch checklist and document statuses
      try {
        const checklist = await DocumentChecklistService.generateChecklist(applicationId, userId);
        if (checklist && 'items' in checklist) {
          const items = checklist.items || [];
          const uploadedItems = items.filter((item) => item.status !== 'missing');
          const approvedItems = items.filter((item) => item.status === 'verified');
          const needFixItems = items.filter(
            (item) => item.status === 'pending' || item.status === 'rejected'
          );
          const missingItems = items.filter((item) => item.status === 'missing');

          context.checklistSummary = {
            totalRequired: items.filter((item) => item.required).length,
            uploadedCount: uploadedItems.length,
            approvedCount: approvedItems.length,
            needFixCount: needFixItems.length,
            missingCount: missingItems.length,
            items: items.map((item) => ({
              documentType: normalizeDocumentType(item.documentType) || item.documentType,
              name: item.name,
              status: item.status,
              // Note: aiDecision would need to be extracted from document validation results
              // For now, we infer from status
              aiDecision:
                item.status === 'verified'
                  ? 'APPROVED'
                  : item.status === 'rejected'
                    ? 'REJECTED'
                    : item.status === 'pending'
                      ? 'NEED_FIX'
                      : undefined,
            })),
          };
        }
      } catch (error) {
        logWarn('[VisaChatOrchestrator] Failed to fetch checklist', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Fetch risk explanation (if available)
      try {
        const riskExplanation =
          await VisaRiskExplanationService.generateRiskExplanation(applicationId);
        if (riskExplanation) {
          context.riskExplanation = {
            summaryEn: riskExplanation.summaryEn,
            summaryUz: riskExplanation.summaryUz,
            summaryRu: riskExplanation.summaryRu,
            recommendations: riskExplanation.recommendations?.map((rec) => ({
              titleEn: rec.titleEn,
              detailsEn: rec.detailsEn,
            })),
          };
        }
      } catch (error) {
        // Non-blocking: risk explanation may not exist yet
        logWarn('[VisaChatOrchestrator] Failed to fetch risk explanation', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Fetch official rules summary
      try {
        const ruleSet = await VisaRulesService.getActiveRuleSet(
          context.countryCode!,
          context.visaType!
        );
        if (ruleSet) {
          context.officialRulesSummary = {
            hasRules: true,
            source: ruleSet.sourceInfo?.extractedFrom,
            confidence: ruleSet.sourceInfo?.confidence,
            keyRequirements: ruleSet.requiredDocuments
              ?.slice(0, 5)
              .map((doc: any) => doc.name || doc.documentType),
          };
        }
      } catch (error) {
        logWarn('[VisaChatOrchestrator] Failed to fetch official rules', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Fetch country playbook summary
      try {
        if (context.countryCode && context.visaCategory) {
          // Phase 8: Use normalized country code
          const playbook = getCountryVisaPlaybook(context.countryCode, context.visaCategory);
          if (playbook) {
            context.playbookSummary = {
              hasPlaybook: true,
              typicalRefusalReasons: playbook.typicalRefusalReasonsEn,
              keyOfficerFocus: playbook.keyOfficerFocusEn,
              uzbekContextHints: playbook.uzbekContextHintsEn,
            };
          }
        }
      } catch (error) {
        logWarn('[VisaChatOrchestrator] Failed to fetch playbook', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      logError('[VisaChatOrchestrator] Error building context', error as Error, {
        userId,
        applicationId,
      });
    }

    return context;
  }

  /**
   * Build system prompt with context
   */
  private static buildSystemPrompt(context: ChatAIContext): string {
    // Base prompt is already comprehensive, but we can add context-specific hints
    let prompt = VISA_CHAT_SYSTEM_PROMPT;

    // Add context-specific reminders if we have application context
    if (context.applicationId && context.countryCode) {
      prompt += `\n\n[CONTEXT REMINDERS]\n`;
      prompt += `- You are currently helping with: ${context.countryName || context.countryCode} ${context.visaCategory || context.visaType || 'visa'}\n`;
      if (context.riskLevel) {
        prompt += `- Applicant's risk level: ${context.riskLevel}\n`;
      }
      if (context.riskDrivers && context.riskDrivers.length > 0) {
        prompt += `- Main risk drivers: ${context.riskDrivers.join(', ')}\n`;
      }
      if (context.officialRulesSummary?.hasRules) {
        prompt += `- Official embassy rules are available and authoritative\n`;
      }
      if (context.playbookSummary?.hasPlaybook) {
        prompt += `- Country-specific playbook patterns are available\n`;
      }
      prompt += `\nRemember: Stick to this country and visa type unless the user explicitly asks about another.\n`;
    }

    return prompt;
  }

  /**
   * Build messages array (history + context message + current message)
   */
  private static buildMessages(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentMessage: string,
    context: ChatAIContext
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add context message (assistant role, but internal context)
    if (context.applicationId) {
      const contextMessage = this.buildContextMessage(context);
      messages.push({
        role: 'assistant',
        content: contextMessage,
      });
    }

    // Add conversation history (trimmed to last 10 messages)
    const trimmedHistory = history.slice(-10);
    for (const msg of trimmedHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Build context message (internal context, not shown to user)
   */
  private static buildContextMessage(context: ChatAIContext): string {
    let msg = `[INTERNAL CONTEXT - Not shown to user]\n\n`;

    if (context.countryCode && context.countryName) {
      msg += `Country: ${context.countryName} (${context.countryCode})\n`;
    }
    if (context.visaType) {
      msg += `Visa Type: ${context.visaType}\n`;
    }
    if (context.visaCategory) {
      msg += `Visa Category: ${context.visaCategory}\n`;
    }

    if (context.riskLevel) {
      msg += `\nRisk Level: ${context.riskLevel}\n`;
      msg += `Risk Score: ${context.riskScore || 'N/A'}%\n`;
    }
    if (context.riskDrivers && context.riskDrivers.length > 0) {
      msg += `Risk Drivers: ${context.riskDrivers.join(', ')}\n`;
    }

    if (context.financial) {
      msg += `\nFinancial:\n`;
      if (context.financial.financialSufficiencyLabel) {
        msg += `- Sufficiency: ${context.financial.financialSufficiencyLabel}\n`;
      }
      if (context.financial.requiredFundsUSD) {
        msg += `- Required: $${context.financial.requiredFundsUSD}\n`;
      }
      if (context.financial.availableFundsUSD) {
        msg += `- Available: $${context.financial.availableFundsUSD}\n`;
      }
    }

    if (context.ties) {
      msg += `\nTies:\n`;
      if (context.ties.tiesStrengthLabel) {
        msg += `- Strength: ${context.ties.tiesStrengthLabel}\n`;
      }
      msg += `- Has Property: ${context.ties.hasPropertyInUzbekistan ? 'Yes' : 'No'}\n`;
      msg += `- Is Employed: ${context.ties.isEmployed ? 'Yes' : 'No'}\n`;
    }

    if (context.checklistSummary) {
      msg += `\nChecklist Status:\n`;
      msg += `- Total Required: ${context.checklistSummary.totalRequired}\n`;
      msg += `- Uploaded: ${context.checklistSummary.uploadedCount}\n`;
      msg += `- Approved: ${context.checklistSummary.approvedCount}\n`;
      msg += `- Need Fix: ${context.checklistSummary.needFixCount}\n`;
      msg += `- Missing: ${context.checklistSummary.missingCount}\n`;

      if (context.checklistSummary.items.length > 0) {
        msg += `\nDocument Status:\n`;
        for (const item of context.checklistSummary.items.slice(0, 10)) {
          msg += `- ${item.name}: ${item.status}${item.aiDecision ? ` (${item.aiDecision})` : ''}\n`;
        }
      }
    }

    if (context.officialRulesSummary?.hasRules) {
      msg += `\nOfficial Rules: Available (source: ${context.officialRulesSummary.source || 'N/A'}, confidence: ${context.officialRulesSummary.confidence ? (context.officialRulesSummary.confidence * 100).toFixed(0) + '%' : 'N/A'})\n`;
      if (context.officialRulesSummary.keyRequirements) {
        msg += `Key Requirements: ${context.officialRulesSummary.keyRequirements.join(', ')}\n`;
      }
    }

    if (context.playbookSummary?.hasPlaybook) {
      msg += `\nCountry Playbook: Available\n`;
      if (context.playbookSummary.typicalRefusalReasons) {
        msg += `Typical Refusal Reasons: ${context.playbookSummary.typicalRefusalReasons.slice(0, 3).join('; ')}\n`;
      }
      if (context.playbookSummary.keyOfficerFocus) {
        msg += `Key Officer Focus: ${context.playbookSummary.keyOfficerFocus.slice(0, 3).join('; ')}\n`;
      }
    }

    if (context.riskExplanation) {
      msg += `\nRisk Explanation Summary: ${context.riskExplanation.summaryEn || 'N/A'}\n`;
    }

    return msg;
  }

  /**
   * Run self-evaluation on reply
   */
  private static async runSelfEvaluation(
    context: ChatAIContext,
    userQuestion: string,
    reply: string
  ): Promise<{ passed: boolean; flags: string[] }> {
    try {
      const aiConfig = getAIConfig('chat'); // Use same model config, or could use cheaper model
      const openaiClient = AIOpenAIService.getOpenAIClient();

      const evaluatorPrompt = this.buildEvaluatorPrompt(context, userQuestion, reply);

      const response = await openaiClient.chat.completions.create({
        model: aiConfig.model, // Could use gpt-4o-mini for cost savings
        messages: [
          { role: 'system', content: VISA_CHAT_SELF_CHECK_PROMPT },
          { role: 'user', content: evaluatorPrompt },
        ],
        temperature: 0.2, // Lower temperature for evaluator
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Fallback: assume safe if parse fails
        return { passed: true, flags: [] };
      }

      const isSafe = parsed.isSafe === true;
      const flags = Array.isArray(parsed.flags) ? parsed.flags : [];

      return { passed: isSafe, flags };
    } catch (error) {
      logWarn('[VisaChatOrchestrator] Self-evaluation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback: assume safe if evaluation fails
      return { passed: true, flags: [] };
    }
  }

  /**
   * Build evaluator prompt
   */
  private static buildEvaluatorPrompt(
    context: ChatAIContext,
    userQuestion: string,
    reply: string
  ): string {
    // Phase 8: Use canonical country for evaluation
    const countryContext = context.countryCode
      ? buildCanonicalCountryContext(context.countryCode)
      : null;
    const canonicalCountryName = countryContext?.countryName || context.countryName;
    const canonicalCountryCode = context.countryCode;

    let prompt = `Evaluate this chat reply for safety and consistency:\n\n`;

    prompt += `CONTEXT:\n`;
    if (canonicalCountryCode && canonicalCountryName) {
      prompt += `- CANONICAL COUNTRY: ${canonicalCountryName} (${canonicalCountryCode})\n`;
      prompt += `- You MUST flag COUNTRY_MISMATCH if the reply mentions a different primary country than ${canonicalCountryName}\n`;
      if (countryContext?.schengen) {
        prompt += `- This is a Schengen country. Mentioning "Schengen" is allowed, but the primary country must be ${canonicalCountryName}\n`;
        prompt += `- Common confusions to flag: mixing ${canonicalCountryName} with other Schengen countries (Germany, Spain, France)\n`;
      } else if (canonicalCountryCode === 'GB') {
        prompt += `- Common confusions to flag: mixing "United Kingdom" with "US" or inconsistently using "UK" vs "GB"\n`;
      }
    }
    if (context.visaType) {
      prompt += `- Visa Type: ${context.visaType}\n`;
    }
    if (context.visaCategory) {
      prompt += `- Visa Category: ${context.visaCategory}\n`;
    }
    if (context.riskDrivers && context.riskDrivers.length > 0) {
      prompt += `- Risk Drivers: ${context.riskDrivers.join(', ')}\n`;
    }
    if (context.officialRulesSummary?.hasRules) {
      prompt += `- Official Rules: Available\n`;
    }
    if (context.playbookSummary?.hasPlaybook) {
      prompt += `- Country Playbook: Available\n`;
    }

    prompt += `\nUSER QUESTION:\n${userQuestion}\n\n`;
    prompt += `ASSISTANT REPLY:\n${reply}\n\n`;
    prompt += `Evaluate the reply and return JSON with isSafe (boolean) and flags (string[]).`;

    return prompt;
  }

  /**
   * Regenerate reply with hints (Option B)
   */
  private static async regenerateReplyWithHints(
    context: ChatAIContext,
    userQuestion: string,
    originalReply: string,
    flags: string[],
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string | null> {
    try {
      const aiConfig = getAIConfig('chat');
      const openaiClient = AIOpenAIService.getOpenAIClient();

      const systemPrompt =
        VISA_CHAT_SYSTEM_PROMPT +
        `\n\nIMPORTANT: Your previous draft had these issues: ${flags.join(', ')}. Please rewrite the answer fixing them.`;

      const messages = this.buildMessages(history, userQuestion, context);

      const response = await openaiClient.chat.completions.create({
        model: aiConfig.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      logWarn('[VisaChatOrchestrator] Regeneration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
