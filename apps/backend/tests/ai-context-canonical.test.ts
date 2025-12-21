/**
 * Unit tests for CanonicalAIUserContext mapping
 * Tests legacy → canonical and v2 → canonical conversions
 */

import {
  buildCanonicalAIUserContext,
  buildAIUserContext,
} from '../src/services/ai-context.service';
import {
  AIUserContext,
  CanonicalAIUserContext,
} from '../src/types/ai-context';

describe('CanonicalAIUserContext Mapping', () => {
  describe('Legacy → Canonical', () => {
    it('should map legacy questionnaire data with all defaults', async () => {
      const legacyContext: AIUserContext = {
        userProfile: {
          userId: 'user-123',
          appLanguage: 'en',
          // No citizenship or age
        },
        application: {
          applicationId: 'app-123',
          visaType: 'tourist',
          country: 'US',
          status: 'draft',
        },
        questionnaireSummary: {
          version: '1.0',
          visaType: 'tourist',
          targetCountry: 'US',
          appLanguage: 'en',
          // Minimal legacy data
          duration: '1_3_months',
          sponsorType: undefined, // Missing
          previousVisaRejections: undefined, // Missing
          documents: {
            hasPassport: false,
            hasBankStatement: false,
            hasEmploymentOrStudyProof: false,
            hasInsurance: false,
            hasFlightBooking: false,
            hasHotelBookingOrAccommodation: false,
          },
        },
        uploadedDocuments: [],
        appActions: [],
      };

      const canonical = await buildCanonicalAIUserContext(legacyContext);

      // Check that all required fields are present
      expect(canonical.applicantProfile).toBeDefined();
      expect(canonical.riskScore).toBeDefined();

      // Check defaults
      expect(canonical.applicantProfile.citizenship).toBe('UZ');
      expect(canonical.applicantProfile.sponsorType).toBe('self');
      expect(canonical.applicantProfile.currentStatus).toBe('unknown');
      expect(canonical.applicantProfile.previousVisaRejections).toBe(false);
      expect(canonical.applicantProfile.hasInternationalTravel).toBe(false);

      // Check that risk score is always present
      expect(canonical.riskScore.probabilityPercent).toBeGreaterThanOrEqual(10);
      expect(canonical.riskScore.probabilityPercent).toBeLessThanOrEqual(90);
      expect(['low', 'medium', 'high']).toContain(canonical.riskScore.level);

      // Check metadata
      expect(canonical.metadata).toBeDefined();
      expect(canonical.metadata?.fallbackFieldsUsed).toContain('sponsorType');
      expect(canonical.metadata?.fallbackFieldsUsed).toContain('currentStatus');
    });

    it('should map legacy data with sponsor information', async () => {
      const legacyContext: AIUserContext = {
        userProfile: {
          userId: 'user-123',
          appLanguage: 'en',
          citizenship: 'UZ',
          age: 25,
        },
        application: {
          applicationId: 'app-123',
          visaType: 'student',
          country: 'US',
          status: 'draft',
        },
        questionnaireSummary: {
          version: '1.0',
          visaType: 'student',
          targetCountry: 'US',
          appLanguage: 'en',
          sponsorType: 'parent',
          bankBalanceUSD: 15000,
          previousVisaRejections: true,
          hasInternationalTravel: true,
          employment: {
            currentStatus: 'student',
            isEmployed: false,
          },
          documents: {
            hasPassport: true,
            hasBankStatement: true,
            hasEmploymentOrStudyProof: false,
            hasInsurance: false,
            hasFlightBooking: false,
            hasHotelBookingOrAccommodation: false,
          },
        },
        uploadedDocuments: [],
        appActions: [],
      };

      const canonical = await buildCanonicalAIUserContext(legacyContext);

      // Check that sponsor type is preserved
      expect(canonical.applicantProfile.sponsorType).toBe('parent');
      expect(canonical.applicantProfile.bankBalanceUSD).toBe(15000);
      expect(canonical.applicantProfile.previousVisaRejections).toBe(true);
      expect(canonical.applicantProfile.hasInternationalTravel).toBe(true);
      expect(canonical.applicantProfile.currentStatus).toBe('student');
      expect(canonical.applicantProfile.isStudent).toBe(true);

      // Check that risk score reflects previous rejections
      expect(canonical.riskScore.riskFactors.length).toBeGreaterThan(0);
      expect(canonical.riskScore.riskFactors.some((f) => f.includes('rejection'))).toBe(true);
    });
  });

  describe('V2 → Canonical', () => {
    it('should map V2 questionnaire data correctly', async () => {
      const v2Context: AIUserContext = {
        userProfile: {
          userId: 'user-123',
          appLanguage: 'uz',
          citizenship: 'UZ',
          age: 22,
        },
        application: {
          applicationId: 'app-123',
          visaType: 'student',
          country: 'US',
          status: 'draft',
        },
        questionnaireSummary: {
          version: '2.0',
          visaType: 'student',
          targetCountry: 'US',
          appLanguage: 'uz',
          sponsorType: 'parent',
          bankBalanceUSD: 20000,
          monthlyIncomeUSD: 500,
          previousVisaRejections: false,
          hasInternationalTravel: true,
          employment: {
            currentStatus: 'student',
            isEmployed: false,
          },
          education: {
            isStudent: true,
            programType: 'bachelor',
          },
          travelHistory: {
            traveledBefore: true,
            hasRefusals: false,
            visitedCountries: ['GB', 'DE'],
          },
          ties: {
            propertyDocs: true,
            familyTies: true,
          },
          documents: {
            hasPassport: true,
            hasBankStatement: true,
            hasEmploymentOrStudyProof: true,
            hasInsurance: false,
            hasFlightBooking: false,
            hasHotelBookingOrAccommodation: false,
          },
        },
        uploadedDocuments: [],
        appActions: [],
      };

      const canonical = await buildCanonicalAIUserContext(v2Context);

      // Check V2 fields are mapped correctly
      expect(canonical.applicantProfile.sponsorType).toBe('parent');
      expect(canonical.applicantProfile.bankBalanceUSD).toBe(20000);
      expect(canonical.applicantProfile.monthlyIncomeUSD).toBe(500);
      expect(canonical.applicantProfile.currentStatus).toBe('student');
      expect(canonical.applicantProfile.isStudent).toBe(true);
      expect(canonical.applicantProfile.hasInternationalTravel).toBe(true);
      expect(canonical.applicantProfile.previousVisaRejections).toBe(false);
      expect(canonical.applicantProfile.hasPropertyInUzbekistan).toBe(true);
      expect(canonical.applicantProfile.hasFamilyInUzbekistan).toBe(true);

      // Check metadata
      expect(canonical.metadata?.sourceFormat).toBe('v2');
    });
  });

  describe('Missing Questionnaire → Canonical', () => {
    it('should handle missing questionnaire with all defaults', async () => {
      const contextWithoutSummary: AIUserContext = {
        userProfile: {
          userId: 'user-123',
          appLanguage: 'en',
        },
        application: {
          applicationId: 'app-123',
          visaType: 'tourist',
          country: 'US',
          status: 'draft',
        },
        // No questionnaireSummary
        uploadedDocuments: [],
        appActions: [],
      };

      const canonical = await buildCanonicalAIUserContext(contextWithoutSummary);

      // Check that all fields have defaults
      expect(canonical.applicantProfile).toBeDefined();
      expect(canonical.applicantProfile.citizenship).toBe('UZ');
      expect(canonical.applicantProfile.sponsorType).toBe('self');
      expect(canonical.applicantProfile.currentStatus).toBe('unknown');
      expect(canonical.applicantProfile.previousVisaRejections).toBe(false);
      expect(canonical.applicantProfile.hasInternationalTravel).toBe(false);

      // Check that risk score has default
      expect(canonical.riskScore.probabilityPercent).toBe(70);
      expect(canonical.riskScore.level).toBe('medium');
      expect(canonical.riskScore.riskFactors).toContain(
        'Questionnaire data incomplete - using default risk assessment'
      );

      // Check metadata
      expect(canonical.metadata?.sourceFormat).toBe('unknown');
      expect(canonical.metadata?.extractionWarnings).toContain(
        'Questionnaire missing - using default risk score'
      );
    });
  });

  describe('Field Type Safety', () => {
    it('should always return boolean for boolean fields', async () => {
      const context: AIUserContext = {
        userProfile: {
          userId: 'user-123',
          appLanguage: 'en',
        },
        application: {
          applicationId: 'app-123',
          visaType: 'tourist',
          country: 'US',
          status: 'draft',
        },
        questionnaireSummary: undefined,
        uploadedDocuments: [],
        appActions: [],
      };

      const canonical = await buildCanonicalAIUserContext(context);

      // All boolean fields should be boolean, not undefined
      expect(typeof canonical.applicantProfile.isStudent).toBe('boolean');
      expect(typeof canonical.applicantProfile.isEmployed).toBe('boolean');
      expect(typeof canonical.applicantProfile.hasInternationalTravel).toBe('boolean');
      expect(typeof canonical.applicantProfile.previousVisaRejections).toBe('boolean');
      expect(typeof canonical.applicantProfile.previousOverstay).toBe('boolean');
      expect(typeof canonical.applicantProfile.hasPropertyInUzbekistan).toBe('boolean');
      expect(typeof canonical.applicantProfile.hasFamilyInUzbekistan).toBe('boolean');
      expect(typeof canonical.applicantProfile.hasChildren).toBe('boolean');
      expect(typeof canonical.applicantProfile.hasUniversityInvitation).toBe('boolean');
      expect(typeof canonical.applicantProfile.hasOtherInvitation).toBe('boolean');

      // Documents should all be boolean
      expect(typeof canonical.applicantProfile.documents.hasPassport).toBe('boolean');
      expect(typeof canonical.applicantProfile.documents.hasBankStatement).toBe('boolean');
      expect(typeof canonical.applicantProfile.documents.hasEmploymentOrStudyProof).toBe('boolean');
      expect(typeof canonical.applicantProfile.documents.hasInsurance).toBe('boolean');
      expect(typeof canonical.applicantProfile.documents.hasFlightBooking).toBe('boolean');
      expect(typeof canonical.applicantProfile.documents.hasHotelBookingOrAccommodation).toBe('boolean');
    });

    it('should handle null values for optional numeric fields', async () => {
      const context: AIUserContext = {
        userProfile: {
          userId: 'user-123',
          appLanguage: 'en',
        },
        application: {
          applicationId: 'app-123',
          visaType: 'tourist',
          country: 'US',
          status: 'draft',
        },
        questionnaireSummary: {
          version: '1.0',
          visaType: 'tourist',
          targetCountry: 'US',
          appLanguage: 'en',
          // No bankBalance or monthlyIncome
          documents: {
            hasPassport: false,
            hasBankStatement: false,
            hasEmploymentOrStudyProof: false,
            hasInsurance: false,
            hasFlightBooking: false,
            hasHotelBookingOrAccommodation: false,
          },
        },
        uploadedDocuments: [],
        appActions: [],
      };

      const canonical = await buildCanonicalAIUserContext(context);

      // Numeric fields can be null (explicit "unknown")
      expect(canonical.applicantProfile.bankBalanceUSD).toBeNull();
      expect(canonical.applicantProfile.monthlyIncomeUSD).toBeNull();
      expect(canonical.applicantProfile.age).toBeNull();
    });
  });
});

