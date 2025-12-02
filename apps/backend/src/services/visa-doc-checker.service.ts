/**
 * Visa Document Checker Service
 * Compares uploaded documents against VisaRuleSet requirements
 * Uses GPT-4 to evaluate document compliance
 */

import { AIOpenAIService } from './ai-openai.service';
import { VisaRuleSetData } from './visa-rules.service';
import { AIUserContext } from '../types/ai-context';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { z } from 'zod';

/**
 * Document Check Result Schema
 */
const DocumentCheckResultSchema = z.object({
  status: z.enum(['APPROVED', 'NEED_FIX', 'REJECTED']),
  short_reason: z.string(),
  embassy_risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  technical_notes: z.string().nullable().optional(),
});

export type DocumentCheckResult = z.infer<typeof DocumentCheckResultSchema>;

/**
 * Visa Document Checker Service
 */
export class VisaDocCheckerService {
  /**
   * Check a single document against a requirement
   */
  static async checkDocument(
    requiredDocumentRule: VisaRuleSetData['requiredDocuments'][0],
    userDocumentText: string,
    aiUserContext?: AIUserContext,
    metadata?: {
      fileType?: string;
      issueDate?: string;
      expiryDate?: string;
      amounts?: Array<{ value: number; currency: string }>;
      bankName?: string;
      accountHolder?: string;
    }
  ): Promise<DocumentCheckResult> {
    try {
      logInfo('[VisaDocChecker] Checking document', {
        documentType: requiredDocumentRule.documentType,
        textLength: userDocumentText.length,
        hasMetadata: !!metadata,
      });

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Build user prompt
      const userPrompt = this.buildUserPrompt(
        requiredDocumentRule,
        userDocumentText,
        aiUserContext,
        metadata
      );

      // Call GPT-4 with structured output
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: AIOpenAIService.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2, // Very low temperature for strict evaluation
        max_tokens: 500, // Concise responses
        response_format: { type: 'json_object' }, // Force JSON output
      });

      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[VisaDocChecker] GPT-4 response received', {
        documentType: requiredDocumentRule.documentType,
        responseLength: rawContent.length,
      });

      // Parse and validate JSON
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          const objectMatch = rawContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsed = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      // Validate against schema
      const validationResult = DocumentCheckResultSchema.safeParse(parsed);

      if (!validationResult.success) {
        logError(
          '[VisaDocChecker] Schema validation failed',
          new Error('Invalid check result structure'),
          {
            documentType: requiredDocumentRule.documentType,
            errors: validationResult.error.errors,
          }
        );

        // Fallback: create a conservative result
        return {
          status: 'NEED_FIX',
          short_reason: 'Document validation could not be completed. Please review manually.',
          embassy_risk_level: 'MEDIUM',
          technical_notes: `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
        };
      }

      logInfo('[VisaDocChecker] Document check completed', {
        documentType: requiredDocumentRule.documentType,
        status: validationResult.data.status,
        riskLevel: validationResult.data.embassy_risk_level,
      });

      return validationResult.data;
    } catch (error) {
      logError('[VisaDocChecker] Document check failed', error as Error, {
        documentType: requiredDocumentRule.documentType,
      });

      // Return conservative fallback
      return {
        status: 'NEED_FIX',
        short_reason: 'Document check could not be completed. Please review manually.',
        embassy_risk_level: 'MEDIUM',
        technical_notes: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build system prompt for document checking
   */
  private static buildSystemPrompt(): string {
    return `You are "VisaDocChecker", an embassy-level visa document reviewer.

Your job:
- Compare ONE uploaded user document against ONE official document requirement.
- Decide if the user document satisfies the requirement according to the official rules.
- Return a strict, concise JSON result.
- You must be strict but fair, similar to an experienced visa officer.

OUTPUT SCHEMA (JSON):
{
  "status": "APPROVED" | "NEED_FIX" | "REJECTED",
  "short_reason": "string",            // 1–2 short sentences, practical and clear
  "embassy_risk_level": "LOW" | "MEDIUM" | "HIGH",
  "technical_notes": "string | null"   // optional, short extra details for internal logs
}

DECISION RULES:

1. STATUS
- APPROVED: The document clearly satisfies the key conditions described in REQUIRED_DOCUMENT_RULE.
  Any minor formatting or wording differences do not matter for a typical embassy officer.
- NEED_FIX: The document is on the right track but has one or more correctable issues, for example:
  - Not enough months of history.
  - Missing stamp/signature.
  - Wrong language when translation is required.
  - Amount slightly below the recommended minimum.
  The user could fix this by getting an updated or corrected document.
- REJECTED: The document is clearly unusable for this requirement, for example:
  - Completely wrong document type.
  - No relevant information present.
  - Expired when validity is clearly required.
  - Amounts or dates are far below or outside the stated rules.
  - Obviously fake or inconsistent (e.g. impossible dates, mismatched names) if clearly visible.

2. EMBASSY_RISK_LEVEL
- LOW: Document appears solid and compliant with the requirement.
- MEDIUM: There are some weaknesses or small deviations, but it might still be accepted.
- HIGH: Serious issues that are likely to cause refusal or additional scrutiny if not fixed.

3. REASONING GUIDELINES
- short_reason: MUST be 1–2 sentences, simple, direct, written for the user.
- technical_notes: Optional, use for slightly more technical or internal comments.

4. USE OF REQUIRED_DOCUMENT_RULE
- You must align your judgment with REQUIRED_DOCUMENT_RULE, not with generic visa knowledge.
- If REQUIRED_DOCUMENT_RULE specifies:
  - minimum history months → check if USER_DOCUMENT_TEXT indicates that history.
  - minimum balance / amount → check approximate amounts.
  - required language → check whether it appears to be in the required language(s).
  - validity months → check expiry vs intended travel dates if available.
- If something is not specified in REQUIRED_DOCUMENT_RULE: Do NOT invent strict rules.
  Lean toward NEED_FIX or MEDIUM risk only when a typical embassy officer would reasonably worry.

5. HANDLING UNCLEAR OR INCOMPLETE TEXT
- If USER_DOCUMENT_TEXT is extremely short, corrupted, or clearly incomplete:
  - Prefer REJECTED or NEED_FIX with an explanation.
- If you cannot find any evidence for crucial required fields:
  - Do not assume it is present.
  - Mark as NEED_FIX or REJECTED, depending on severity.

6. CONSISTENCY AND CONSERVATISM
- When in doubt, be slightly conservative:
  - If the document might be accepted but has visible weaknesses:
    - status: NEED_FIX, embassy_risk_level: MEDIUM or HIGH.
- Do NOT mark REJECTED unless you see clear, strong reasons.

7. OUTPUT RULES
- You MUST output only the JSON object with fields: status, short_reason, embassy_risk_level, technical_notes.
- No markdown, no comments, no extra explanation outside the JSON.
- The JSON must be syntactically valid (no trailing commas).

Return ONLY valid JSON matching the schema, no other text.`;
  }

  /**
   * Build user prompt with document and requirement
   */
  private static buildUserPrompt(
    requiredDocumentRule: VisaRuleSetData['requiredDocuments'][0],
    userDocumentText: string,
    aiUserContext?: AIUserContext,
    metadata?: {
      fileType?: string;
      issueDate?: string;
      expiryDate?: string;
      amounts?: Array<{ value: number; currency: string }>;
      bankName?: string;
      accountHolder?: string;
    }
  ): string {
    let prompt = `Check if the uploaded user document satisfies the official requirement.

REQUIRED_DOCUMENT_RULE:
${JSON.stringify(requiredDocumentRule, null, 2)}

USER_DOCUMENT_TEXT:
${userDocumentText.substring(0, 10000)}${userDocumentText.length > 10000 ? '\n\n[Text truncated for length]' : ''}`;

    if (metadata) {
      prompt += `\n\nOPTIONAL METADATA:\n${JSON.stringify(metadata, null, 2)}`;
    }

    if (aiUserContext) {
      const contextSummary = {
        sponsorType: aiUserContext.questionnaireSummary?.sponsorType,
        employmentStatus: aiUserContext.questionnaireSummary?.employment?.currentStatus,
        travelDates: aiUserContext.questionnaireSummary?.travelInfo?.plannedDates,
        riskScore: aiUserContext.riskScore?.level,
      };
      prompt += `\n\nAI_USER_CONTEXT (for conditional requirements):\n${JSON.stringify(contextSummary, null, 2)}`;
    }

    prompt += `\n\nEvaluate the document and return the JSON result following all rules in the system prompt.`;

    return prompt;
  }
}
