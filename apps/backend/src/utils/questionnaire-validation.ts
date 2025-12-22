import { z } from 'zod';
import { QuestionnaireV2 } from '../types/questionnaire-v2';

/**
 * Zod schema for QuestionnaireV2.
 * Keeps the structure in sync with the TS interface and enables runtime validation.
 */
export const questionnaireV2Schema = z
  .object({
    version: z.literal('2.0'),
    // Allow any country; prefer 2+ chars. Uppercasing/ISO mapping happens later.
    targetCountry: z.string().trim().min(2, 'targetCountry must be at least 2 characters'),
    // Allow any visa type; normalization happens later.
    visaType: z.string().trim().min(2, 'visaType must be at least 2 characters'),
    contact: z
      .object({
        email: z.string().email().optional(),
        phone: z.string().trim().min(5).max(30).optional(),
      })
      .optional(),
    personal: z.object({
      ageRange: z.enum(['under_18', '18_25', '26_35', '36_50', '51_plus']),
      maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
      nationality: z.enum(['UZ', 'other']),
      passportStatus: z.enum(['valid_6plus_months', 'valid_less_6_months', 'no_passport']),
    }),
    travel: z.object({
      plannedWhen: z.enum(['within_3_months', '3_to_12_months', 'not_sure']),
      isExactDatesKnown: z.boolean(),
      tripDurationDays: z
        .number()
        .int()
        .positive()
        .max(365 * 3)
        .nullable()
        .optional(),
    }),
    status: z.object({
      currentStatus: z.enum([
        'student',
        'employed',
        'self_employed',
        'unemployed',
        'business_owner',
        'school_child',
      ]),
      highestEducation: z.enum(['school', 'college', 'bachelor', 'master', 'phd', 'other']),
      isMinor: z.boolean(),
    }),
    finance: z.object({
      payer: z.enum([
        'self',
        'parents',
        'other_family',
        'employer',
        'scholarship',
        'other_sponsor',
      ]),
      approxMonthlyIncomeRange: z.enum([
        'less_500',
        '500_1000',
        '1000_3000',
        '3000_plus',
        'not_applicable',
      ]),
      hasBankStatement: z.boolean(),
      hasStableIncome: z.boolean(),
      sponsorRelationship: z.enum(['parent', 'relative', 'company', 'other']).optional(),
    }),
    invitation: z.object({
      hasInvitation: z.boolean(),
      studentInvitationType: z
        .enum(['university_acceptance', 'language_course', 'exchange_program'])
        .optional(),
      touristInvitationType: z
        .enum(['no_invitation', 'hotel_booking', 'family_or_friends', 'tour_agency'])
        .optional(),
    }),
    stay: z.object({
      accommodationType: z.enum([
        'hotel',
        'host_family',
        'relative',
        'rented_apartment',
        'dormitory',
        'not_decided',
      ]),
      hasRoundTripTicket: z.boolean(),
    }),
    history: z.object({
      hasTraveledBefore: z.boolean(),
      regionsVisited: z.array(z.enum(['schengen', 'usa_canada', 'uk', 'asia', 'middle_east'])),
      hasVisaRefusals: z.boolean(),
      hasOverstay: z.boolean().optional(),
      travelHistoryLevel: z.enum(['none', 'limited', 'moderate', 'strong']).optional(),
    }),
    ties: z.object({
      hasProperty: z.boolean(),
      propertyType: z.array(z.enum(['apartment', 'house', 'land', 'business'])).optional(),
      hasCloseFamilyInUzbekistan: z.boolean(),
    }),
    documents: z.object({
      hasEmploymentOrStudyProof: z.boolean(),
      hasInsurance: z.boolean(),
      hasPassport: z.boolean(),
      hasBirthCertificate: z.boolean(),
      hasPropertyDocs: z.boolean(),
    }),
    special: z.object({
      travelingWithChildren: z.boolean(),
      hasMedicalReasonForTrip: z.boolean(),
      hasCriminalRecord: z.boolean(),
    }),
    studentModule: z
      .object({
        schoolName: z.string().trim().optional(),
        acceptanceStatus: z.enum(['accepted', 'applied', 'not_applied']).optional(),
        programStartDate: z.string().trim().optional(),
        tuitionAmountUSD: z.number().nonnegative().nullable().optional(),
        tuitionPaidStatus: z.enum(['paid', 'partial', 'unpaid']).optional(),
        scholarship: z.boolean().optional(),
        accommodationType: z.enum(['dorm', 'private', 'host']).optional(),
        hasAdmissionLetter: z.boolean().optional(),
        previousEducationDocs: z.boolean().optional(),
      })
      .optional(),
    workModule: z
      .object({
        employerName: z.string().trim().optional(),
        position: z.string().trim().optional(),
        contractType: z.enum(['permanent', 'contract', 'probation']).optional(),
        salaryMonthlyUSD: z.number().nonnegative().nullable().optional(),
        sponsorshipStatus: z.enum(['employer_sponsored', 'not_sponsored']).optional(),
        hasWorkPermit: z.boolean().optional(),
        yearsOfExperience: z.number().nonnegative().nullable().optional(),
        professionalLicenses: z.boolean().optional(),
      })
      .optional(),
    familyModule: z
      .object({
        inviterRelationship: z
          .enum(['spouse', 'parent', 'sibling', 'relative', 'friend'])
          .optional(),
        inviterResidencyStatus: z
          .enum(['citizen', 'pr', 'work_permit', 'student', 'other'])
          .optional(),
        hasInvitationLetter: z.boolean().optional(),
        willHost: z.boolean().optional(),
        willSponsor: z.boolean().optional(),
      })
      .optional(),
    businessModule: z
      .object({
        companyName: z.string().trim().optional(),
        invitationFromCompany: z.boolean().optional(),
        eventType: z.string().trim().optional(),
        eventDatesKnown: z.boolean().optional(),
        funding: z.enum(['company', 'self']).optional(),
      })
      .optional(),
    transitModule: z
      .object({
        onwardTicket: z.boolean().optional(),
        layoverHours: z.number().nonnegative().nullable().optional(),
        finalDestinationVisa: z.enum(['yes', 'no', 'not_required']).optional(),
      })
      .optional(),
  })
  // Cross-field refinement relying on visaType in parent scope
  .superRefine((val, ctx) => {
    // Enforce invitation subtype logic for student/tourist
    if (val.visaType === 'student') {
      if (val.invitation.hasInvitation && !val.invitation.studentInvitationType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'studentInvitationType must be provided for student visas when invited',
          path: ['invitation', 'studentInvitationType'],
        });
      }
    } else if (val.visaType === 'tourist') {
      if (!val.invitation.touristInvitationType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'touristInvitationType must be provided for tourist visas',
          path: ['invitation', 'touristInvitationType'],
        });
      }
    }
  });

/**
 * Simple boolean validator.
 */
export function validateQuestionnaireV2(data: unknown): data is QuestionnaireV2 {
  return questionnaireV2Schema.safeParse(data).success;
}

/**
 * Completeness checker with missing-field detail.
 */
export function getQuestionnaireV2Completeness(data: unknown): {
  valid: boolean;
  missingFields: string[];
  parsed?: QuestionnaireV2;
} {
  const result = questionnaireV2Schema.safeParse(data);
  if (!result.success) {
    const missingFields = result.error.errors.map((err) => err.path.join('.') || err.message);
    return { valid: false, missingFields };
  }

  const parsed = result.data;
  const missing: string[] = [];

  // Visa-type-specific requirements
  if (
    parsed.visaType === 'student' &&
    parsed.invitation.hasInvitation &&
    !parsed.invitation.studentInvitationType
  ) {
    missing.push('invitation.studentInvitationType');
  }
  if (parsed.visaType === 'tourist' && !parsed.invitation.touristInvitationType) {
    missing.push('invitation.touristInvitationType');
  }

  // Ensure arrays are present (zod guarantees defined, but guard against empty where needed)
  if (parsed.history.hasTraveledBefore && parsed.history.regionsVisited.length === 0) {
    missing.push('history.regionsVisited');
  }

  return { valid: missing.length === 0, missingFields: missing, parsed };
}
