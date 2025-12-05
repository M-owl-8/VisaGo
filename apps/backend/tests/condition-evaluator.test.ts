/**
 * Unit tests for Condition Evaluator
 */

import { evaluateCondition } from '../src/utils/condition-evaluator';
import { CanonicalAIUserContext } from '../src/types/ai-context';

describe('Condition Evaluator', () => {
  const createMockContext = (overrides?: Partial<CanonicalAIUserContext['applicantProfile']>): CanonicalAIUserContext => {
    return {
      userProfile: {
        userId: 'test-user',
        appLanguage: 'en',
        citizenship: 'UZ',
        age: 25,
      },
      application: {
        applicationId: 'test-app',
        visaType: 'student',
        country: 'US',
        status: 'draft',
      },
      applicantProfile: {
        citizenship: 'UZ',
        age: 25,
        visaType: 'student',
        targetCountry: 'US',
        duration: 'more_than_1_year',
        sponsorType: 'self',
        bankBalanceUSD: 15000,
        monthlyIncomeUSD: null,
        currentStatus: 'student',
        isStudent: true,
        isEmployed: false,
        hasInternationalTravel: false,
        previousVisaRejections: false,
        previousOverstay: false,
        hasPropertyInUzbekistan: false,
        hasFamilyInUzbekistan: true,
        maritalStatus: 'single',
        hasChildren: false,
        hasUniversityInvitation: true,
        hasOtherInvitation: false,
        documents: {
          hasPassport: true,
          hasBankStatement: true,
          hasEmploymentOrStudyProof: true,
          hasInsurance: false,
          hasFlightBooking: false,
          hasHotelBookingOrAccommodation: false,
        },
        ...overrides,
      },
      riskScore: {
        probabilityPercent: 75,
        level: 'medium',
        riskFactors: [],
        positiveFactors: [],
      },
      uploadedDocuments: [],
      appActions: [],
    };
  };

  describe('Simple equality conditions', () => {
    it('should evaluate sponsorType === "self"', () => {
      const context = createMockContext({ sponsorType: 'self' });
      expect(evaluateCondition('sponsorType === \'self\'', context)).toBe(true);
    });

    it('should evaluate sponsorType !== "self"', () => {
      const context = createMockContext({ sponsorType: 'parent' });
      expect(evaluateCondition('sponsorType !== \'self\'', context)).toBe(true);
    });

    it('should evaluate currentStatus === "employed"', () => {
      const context = createMockContext({ currentStatus: 'employed', isEmployed: true });
      expect(evaluateCondition('currentStatus === \'employed\'', context)).toBe(true);
    });

    it('should evaluate boolean fields', () => {
      const context = createMockContext({ previousVisaRejections: true });
      expect(evaluateCondition('previousVisaRejections === true', context)).toBe(true);
    });

    it('should evaluate isStudent === true', () => {
      const context = createMockContext({ isStudent: true });
      expect(evaluateCondition('isStudent === true', context)).toBe(true);
    });
  });

  describe('AND logic', () => {
    it('should evaluate AND conditions correctly', () => {
      const context = createMockContext({
        sponsorType: 'parent',
        currentStatus: 'employed',
        isEmployed: true,
      });
      expect(
        evaluateCondition('sponsorType !== \'self\' && currentStatus === \'employed\'', context)
      ).toBe(true);
    });

    it('should return false if one AND condition is false', () => {
      const context = createMockContext({
        sponsorType: 'self',
        currentStatus: 'employed',
      });
      expect(
        evaluateCondition('sponsorType !== \'self\' && currentStatus === \'employed\'', context)
      ).toBe(false);
    });
  });

  describe('OR logic', () => {
    it('should evaluate OR conditions correctly', () => {
      const context = createMockContext({
        isStudent: true,
        hasUniversityInvitation: false,
      });
      expect(
        evaluateCondition('isStudent === true || hasUniversityInvitation === true', context)
      ).toBe(true);
    });

    it('should return true if either OR condition is true', () => {
      const context = createMockContext({
        isStudent: false,
        hasUniversityInvitation: true,
      });
      expect(
        evaluateCondition('isStudent === true || hasUniversityInvitation === true', context)
      ).toBe(true);
    });
  });

  describe('Parentheses', () => {
    it('should handle parentheses correctly', () => {
      const context = createMockContext({
        sponsorType: 'parent',
        currentStatus: 'employed',
        isEmployed: true,
      });
      expect(
        evaluateCondition('(sponsorType !== \'self\') && (currentStatus === \'employed\')', context)
      ).toBe(true);
    });
  });

  describe('Unknown fields', () => {
    it('should return unknown for undefined fields', () => {
      const context = createMockContext();
      // Using a field that doesn't exist
      expect(evaluateCondition('nonexistentField === \'value\'', context)).toBe('unknown');
    });
  });

  describe('Empty condition', () => {
    it('should return true for empty condition', () => {
      const context = createMockContext();
      expect(evaluateCondition('', context)).toBe(true);
      expect(evaluateCondition('   ', context)).toBe(true);
    });
  });

  describe('Risk score level', () => {
    it('should evaluate riskScore.level', () => {
      const context = createMockContext();
      context.riskScore.level = 'high';
      expect(evaluateCondition('riskScore.level === \'high\'', context)).toBe(true);
    });
  });

  describe('Complex conditions', () => {
    it('should handle complex nested conditions', () => {
      const context = createMockContext({
        sponsorType: 'parent',
        currentStatus: 'employed',
        isEmployed: true,
        previousVisaRejections: false,
      });
      expect(
        evaluateCondition(
          '(sponsorType !== \'self\') && (currentStatus === \'employed\') && (previousVisaRejections === false)',
          context
        )
      ).toBe(true);
    });

    it('should handle OR with AND', () => {
      const context = createMockContext({
        isStudent: false,
        hasUniversityInvitation: true,
        currentStatus: 'employed',
        isEmployed: true,
      });
      expect(
        evaluateCondition(
          '(isStudent === true || hasUniversityInvitation === true) && (currentStatus === \'employed\')',
          context
        )
      ).toBe(true);
    });
  });

  describe('Invalid conditions', () => {
    it('should return unknown for invalid syntax', () => {
      const context = createMockContext();
      expect(evaluateCondition('invalid syntax here', context)).toBe('unknown');
      expect(evaluateCondition('sponsorType = self', context)).toBe('unknown'); // Missing ===
    });
  });
});

