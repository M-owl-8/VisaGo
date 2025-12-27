import { z } from 'zod';
import { VisaRuleSetData } from '../services/visa-rules.service';

const RequiredDocumentSchema = z.object({
  documentType: z.string().min(1),
  category: z.enum(['required', 'highly_recommended', 'optional']),
  description: z.string().optional(),
  validityRequirements: z.string().optional(),
  formatRequirements: z.string().optional(),
  condition: z.string().optional(),
});

const FinancialRequirementsSchema = z
  .object({
    minimumBalance: z.number().optional(),
    currency: z.string().optional(),
    bankStatementMonths: z.number().optional(),
    sponsorRequirements: z
      .object({
        allowed: z.boolean(),
        requiredDocuments: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .optional();

const ProcessingInfoSchema = z
  .object({
    processingDays: z.number().optional(),
    appointmentRequired: z.boolean().optional(),
    interviewRequired: z.boolean().optional(),
    biometricsRequired: z.boolean().optional(),
  })
  .optional();

const FeesSchema = z
  .object({
    // Accept null or undefined for optional numeric/string fields
    visaFee: z.number().nullish(),
    serviceFee: z.number().nullish(),
    currency: z.string().nullish(),
    // Accept null/undefined for paymentMethods; array of strings when present
    paymentMethods: z.array(z.string()).nullish(),
  })
  .nullish();

const AdditionalRequirementsSchema = z
  .object({
    travelInsurance: z
      .object({
        required: z.boolean(),
        minimumCoverage: z.number().optional(),
        currency: z.string().optional(),
      })
      .optional(),
    accommodationProof: z
      .object({
        required: z.boolean(),
        types: z.array(z.string()).optional(),
      })
      .optional(),
    returnTicket: z
      .object({
        required: z.boolean(),
        refundable: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

const SourceInfoSchema = z
  .object({
    extractedFrom: z.string().optional(),
    extractedAt: z.string().optional(),
    confidence: z.number().optional(),
  })
  .optional();

export const VisaRuleSetZodSchema = z.object({
  version: z.number().int().optional(),
  schemaVersion: z.number().int().optional(),
  requiredDocuments: z.array(RequiredDocumentSchema).min(1),
  financialRequirements: FinancialRequirementsSchema,
  processingInfo: ProcessingInfoSchema,
  fees: FeesSchema,
  additionalRequirements: AdditionalRequirementsSchema,
  sourceInfo: SourceInfoSchema,
});

export function validateRuleSetData(
  data: unknown
): { success: true; data: VisaRuleSetData } | { success: false; errors: string[] } {
  const result = VisaRuleSetZodSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as VisaRuleSetData };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}
