/**
 * Unit tests for VisaDocCheckerService
 * Tests document verification logic with synthetic document text examples
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisaDocCheckerService, DocumentVerificationStatus, EmbassyRiskLevel } from '../services/visa-doc-checker.service';
import { VisaRuleSetData } from '../services/visa-rules.service';
import { AIUserContext } from '../types/ai-context';

// Mock OpenAI service
vi.mock('../services/ai-openai.service', () => ({
  AIOpenAIService: {
    getOpenAIClient: () => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    }),
    MODEL: 'gpt-4o-mini',
    isInitialized: () => true,
  },
}));

describe('VisaDocCheckerService', () => {
  const mockRequiredDocumentRule: VisaRuleSetData['requiredDocuments'][0] = {
    documentType: 'bank_statement',
    category: 'required',
    name: 'Bank Statement',
    description: 'Bank statement showing minimum balance of $5,000 USD for last 3 months',
    minimumHistoryMonths: 3,
    minimumBalanceUSD: 5000,
  };

  const mockCanonicalContext = {
    applicantProfile: {
      sponsorType: 'self' as const,
      currentStatus: 'employed' as const,
      bankBalanceUSD: 6000,
      monthlyIncomeUSD: 2000,
    },
    riskScore: {
      level: 'low' as const,
      score: 75,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDocument - Synthetic Document Examples', () => {
    it('should APPROVE a valid bank statement with sufficient balance and history', async () => {
      const validBankStatement = `
        BANK STATEMENT
        Account Holder: John Doe
        Account Number: 123456789
        Period: January 2024 - March 2024
        
        Date        Description              Debit      Credit     Balance
        2024-01-01  Opening Balance                      $6,500.00  $6,500.00
        2024-01-15  Salary Deposit          $2,000.00              $8,500.00
        2024-02-01  Transfer Out           $500.00                $8,000.00
        2024-02-15  Salary Deposit          $2,000.00              $10,000.00
        2024-03-01  Transfer Out           $1,000.00               $9,000.00
        2024-03-15  Salary Deposit          $2,000.00              $11,000.00
        
        Closing Balance: $11,000.00
        Statement Period: 3 months
      `;

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'APPROVED',
              short_reason: 'Bank statement shows sufficient balance ($11,000) and 3 months of history.',
              notes: {
                en: 'Document meets all requirements: balance above $5,000 and 3 months history.',
                uz: 'Hujjat barcha talablarni qondiradi: balans $5,000 dan yuqori va 3 oylik tarix.',
                ru: 'Документ соответствует всем требованиям: баланс выше $5,000 и история за 3 месяца.',
              },
              embassy_risk_level: 'LOW',
              technical_notes: null,
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        validBankStatement,
        undefined,
        { fileType: 'pdf' }
      );

      expect(result.status).toBe('APPROVED');
      expect(result.embassy_risk_level).toBe('LOW');
      expect(result.notes?.en).toContain('meets all requirements');
      expect(result.notes?.uz).toBeDefined();
      expect(result.notes?.ru).toBeDefined();
    });

    it('should NEED_FIX for bank statement with insufficient history', async () => {
      const insufficientHistoryStatement = `
        BANK STATEMENT
        Account Holder: Jane Smith
        Period: February 2024 - March 2024
        
        Date        Description              Balance
        2024-02-01  Opening Balance          $7,000.00
        2024-02-15  Salary Deposit           $9,000.00
        2024-03-15  Salary Deposit           $11,000.00
        
        Closing Balance: $11,000.00
        Statement Period: 2 months only
      `;

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'NEED_FIX',
              short_reason: 'Bank statement only shows 2 months of history. Required: 3 months.',
              notes: {
                en: 'Please provide a statement covering the last 3 months.',
                uz: 'Iltimos, oxirgi 3 oy uchun hisobotni taqdim eting.',
                ru: 'Пожалуйста, предоставьте выписку за последние 3 месяца.',
              },
              embassy_risk_level: 'MEDIUM',
              technical_notes: 'Statement covers Feb-Mar 2024, missing January.',
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        insufficientHistoryStatement
      );

      expect(result.status).toBe('NEED_FIX');
      expect(result.embassy_risk_level).toBe('MEDIUM');
      expect(result.short_reason).toContain('2 months');
      expect(result.notes?.en).toContain('3 months');
    });

    it('should NEED_FIX for bank statement with low balance', async () => {
      const lowBalanceStatement = `
        BANK STATEMENT
        Account Holder: Bob Johnson
        Period: January 2024 - March 2024
        
        Date        Balance
        2024-01-01  $3,000.00
        2024-02-01  $3,500.00
        2024-03-01  $4,000.00
        
        Closing Balance: $4,000.00
      `;

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'NEED_FIX',
              short_reason: 'Bank statement shows balance of $4,000, below required minimum of $5,000.',
              notes: {
                en: 'Please ensure your account balance is at least $5,000 USD.',
                uz: 'Iltimos, hisobingizdagi balans kamida $5,000 AQSh dollari bo\'lishini ta\'minlang.',
                ru: 'Пожалуйста, убедитесь, что баланс вашего счета составляет не менее $5,000 USD.',
              },
              embassy_risk_level: 'HIGH',
              technical_notes: 'Balance $4,000 < required $5,000',
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        lowBalanceStatement
      );

      expect(result.status).toBe('NEED_FIX');
      expect(result.embassy_risk_level).toBe('HIGH');
      expect(result.short_reason).toContain('$4,000');
      expect(result.notes?.en).toContain('$5,000');
    });

    it('should REJECT completely wrong document type', async () => {
      const wrongDocument = `
        EMPLOYMENT LETTER
        To Whom It May Concern,
        
        This is to certify that John Doe is employed at ABC Company.
        Position: Software Engineer
        Salary: $5,000 per month
        
        Signed,
        HR Manager
      `;

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'REJECTED',
              short_reason: 'This is an employment letter, not a bank statement. Please upload the correct document.',
              notes: {
                en: 'A bank statement is required, not an employment letter.',
                uz: 'Bank hisoboti talab qilinadi, ish haqida xat emas.',
                ru: 'Требуется банковская выписка, а не справка о работе.',
              },
              embassy_risk_level: 'HIGH',
              technical_notes: 'Document type mismatch: employment_letter vs bank_statement',
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        wrongDocument
      );

      expect(result.status).toBe('REJECTED');
      expect(result.embassy_risk_level).toBe('HIGH');
      expect(result.short_reason).toContain('employment letter');
    });

    it('should handle invalid JSON response with fixCommonValidationIssues', async () => {
      const validStatement = 'BANK STATEMENT\nBalance: $6,000';

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      // Simulate GPT returning invalid enum value
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'APPROVED_INVALID', // Invalid enum
              short_reason: 'Valid statement',
              embassy_risk_level: 'MEDIUM',
              notesEn: 'English note', // Old format
              notesUz: 'Uzbek note',
              notesRu: 'Russian note',
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        validStatement
      );

      // Should fallback to NEED_FIX due to invalid status
      expect(result.status).toBe('NEED_FIX');
      expect(result.notes?.en).toBe('English note'); // Should map from notesEn
      expect(result.notes?.uz).toBe('Uzbek note');
      expect(result.notes?.ru).toBe('Russian note');
    });

    it('should handle missing notes gracefully', async () => {
      const validStatement = 'BANK STATEMENT\nBalance: $6,000';

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'APPROVED',
              short_reason: 'Valid bank statement',
              embassy_risk_level: 'LOW',
              // notes field missing
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        validStatement
      );

      expect(result.status).toBe('APPROVED');
      expect(result.short_reason).toBe('Valid bank statement');
      // Notes should be optional
      expect(result.notes).toBeUndefined();
    });

    it('should truncate overly long text in response', async () => {
      const validStatement = 'BANK STATEMENT\nBalance: $6,000';

      const { AIOpenAIService } = await import('../services/ai-openai.service');
      const mockCreate = vi.mocked(AIOpenAIService.getOpenAIClient().chat.completions.create);
      
      const longReason = 'A'.repeat(300); // Exceeds 200 char limit
      const longNote = 'B'.repeat(600); // Exceeds 500 char limit
      
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              status: 'APPROVED',
              short_reason: longReason,
              notes: {
                en: longNote,
                uz: longNote,
                ru: longNote,
              },
              embassy_risk_level: 'LOW',
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      } as any);

      const result = await VisaDocCheckerService.checkDocument(
        mockRequiredDocumentRule,
        validStatement
      );

      expect(result.short_reason.length).toBeLessThanOrEqual(200);
      expect(result.notes?.en?.length).toBeLessThanOrEqual(500);
    });
  });

  describe('mapToInternalEnums', () => {
    it('should map valid status and risk level correctly', () => {
      const result = {
        status: 'APPROVED' as const,
        short_reason: 'Test',
        embassy_risk_level: 'LOW' as const,
      };

      // Access private method via type assertion (for testing)
      const mapped = (VisaDocCheckerService as any).mapToInternalEnums(result);
      
      expect(mapped.status).toBe(DocumentVerificationStatus.APPROVED);
      expect(mapped.embassy_risk_level).toBe(EmbassyRiskLevel.LOW);
    });

    it('should fallback invalid status to NEED_FIX', () => {
      const result = {
        status: 'INVALID_STATUS' as any,
        short_reason: 'Test',
        embassy_risk_level: 'LOW' as const,
      };

      const mapped = (VisaDocCheckerService as any).mapToInternalEnums(result);
      
      expect(mapped.status).toBe(DocumentVerificationStatus.NEED_FIX);
    });
  });

  describe('fixCommonValidationIssues', () => {
    it('should fix old format notes (notesEn, notesUz, notesRu)', () => {
      const parsed = {
        status: 'APPROVED',
        short_reason: 'Test',
        embassy_risk_level: 'LOW',
        notesEn: 'English',
        notesUz: 'Uzbek',
        notesRu: 'Russian',
      };

      const fixed = (VisaDocCheckerService as any).fixCommonValidationIssues(parsed);
      
      expect(fixed.notes?.en).toBe('English');
      expect(fixed.notes?.uz).toBe('Uzbek');
      expect(fixed.notes?.ru).toBe('Russian');
    });

    it('should truncate long strings', () => {
      const parsed = {
        status: 'APPROVED',
        short_reason: 'A'.repeat(300),
        embassy_risk_level: 'LOW',
        notes: {
          en: 'B'.repeat(600),
        },
      };

      const fixed = (VisaDocCheckerService as any).fixCommonValidationIssues(parsed);
      
      expect(fixed.short_reason.length).toBeLessThanOrEqual(200);
      expect(fixed.notes?.en?.length).toBeLessThanOrEqual(500);
    });
  });
});

