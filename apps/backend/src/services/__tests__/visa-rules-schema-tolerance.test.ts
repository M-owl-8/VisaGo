/**
 * Test VisaRuleSetDataSchema tolerance to null/missing fields
 * Verifies that the schema accepts null values and coerces them to safe defaults
 */

import { z } from 'zod';

// Import the schema helpers (we'll need to extract them or test inline)
// For now, we'll test the pattern inline

const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');
const nullableNumber = z.union([z.number(), z.null()]).transform((v) => v ?? 0);
const nullableBool = z.union([z.boolean(), z.null()]).transform((v) => v ?? false);

const RequiredDocumentSchema = z.object({
  documentType: z.string(),
  category: z.enum(['required', 'highly_recommended', 'optional']).optional().default('required'),
  description: nullableString.optional(),
  validityRequirements: nullableString.optional(),
  formatRequirements: nullableString.optional(),
});

const FinancialRequirementsSchema = z.object({
  minimumBalance: nullableNumber.optional(),
  currency: nullableString.optional(),
  bankStatementMonths: nullableNumber.optional(),
  sponsorRequirements: z
    .object({
      allowed: nullableBool.optional(),
      requiredDocuments: z.array(z.string()).optional().default([]),
    })
    .optional(),
});

const ProcessingInfoSchema = z.object({
  processingDays: nullableNumber.optional(),
  appointmentRequired: nullableBool.optional(),
  interviewRequired: nullableBool.optional(),
  biometricsRequired: nullableBool.optional(),
});

const FeesSchema = z.object({
  visaFee: nullableNumber.optional(),
  serviceFee: nullableNumber.optional(),
  currency: nullableString.optional(),
  paymentMethods: z.array(z.string()).optional().default([]),
});

const AdditionalRequirementsSchema = z.object({
  travelInsurance: z
    .object({
      required: nullableBool.optional(),
      minimumCoverage: nullableNumber.optional(),
      currency: nullableString.optional(),
    })
    .optional(),
  accommodationProof: z
    .object({
      required: nullableBool.optional(),
      types: z.array(z.string()).optional().default([]),
    })
    .optional(),
  returnTicket: z
    .object({
      required: nullableBool.optional(),
      refundable: nullableBool.optional(),
    })
    .optional(),
});

const VisaRuleSetDataSchema = z
  .object({
    requiredDocuments: z.array(RequiredDocumentSchema).optional().default([]),
    financialRequirements: FinancialRequirementsSchema.optional(),
    processingInfo: ProcessingInfoSchema.optional(),
    fees: FeesSchema.optional(),
    additionalRequirements: AdditionalRequirementsSchema.optional(),
    sourceInfo: z
      .object({
        extractedFrom: z.string().optional(),
        extractedAt: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .passthrough();

describe('VisaRuleSetDataSchema null tolerance', () => {
  it('should accept null values in requiredDocuments fields', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
          category: 'required',
          description: null,
          validityRequirements: null,
          formatRequirements: null,
        },
      ],
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments[0].description).toBe('');
      expect(result.data.requiredDocuments[0].validityRequirements).toBe('');
      expect(result.data.requiredDocuments[0].formatRequirements).toBe('');
    }
  });

  it('should accept null values in financialRequirements', () => {
    const input = {
      requiredDocuments: [],
      financialRequirements: {
        minimumBalance: null,
        currency: null,
        bankStatementMonths: null,
        sponsorRequirements: {
          allowed: null,
          requiredDocuments: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financialRequirements?.minimumBalance).toBe(0);
      expect(result.data.financialRequirements?.currency).toBe('');
      expect(result.data.financialRequirements?.bankStatementMonths).toBe(0);
      expect(result.data.financialRequirements?.sponsorRequirements?.allowed).toBe(false);
      expect(result.data.financialRequirements?.sponsorRequirements?.requiredDocuments).toEqual([]);
    }
  });

  it('should accept null values in processingInfo', () => {
    const input = {
      requiredDocuments: [],
      processingInfo: {
        processingDays: null,
        appointmentRequired: null,
        interviewRequired: null,
        biometricsRequired: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processingInfo?.processingDays).toBe(0);
      expect(result.data.processingInfo?.appointmentRequired).toBe(false);
      expect(result.data.processingInfo?.interviewRequired).toBe(false);
      expect(result.data.processingInfo?.biometricsRequired).toBe(false);
    }
  });

  it('should accept null values in fees', () => {
    const input = {
      requiredDocuments: [],
      fees: {
        visaFee: null,
        serviceFee: null,
        currency: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fees?.visaFee).toBe(0);
      expect(result.data.fees?.serviceFee).toBe(0);
      expect(result.data.fees?.currency).toBe('');
    }
  });

  it('should accept null values in additionalRequirements', () => {
    const input = {
      requiredDocuments: [],
      additionalRequirements: {
        travelInsurance: {
          required: null,
          minimumCoverage: null,
          currency: null,
        },
        accommodationProof: {
          required: null,
          types: null,
        },
        returnTicket: {
          required: null,
          refundable: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additionalRequirements?.travelInsurance?.required).toBe(false);
      expect(result.data.additionalRequirements?.travelInsurance?.minimumCoverage).toBe(0);
      expect(result.data.additionalRequirements?.travelInsurance?.currency).toBe('');
      expect(result.data.additionalRequirements?.accommodationProof?.required).toBe(false);
      expect(result.data.additionalRequirements?.accommodationProof?.types).toEqual([]);
      expect(result.data.additionalRequirements?.returnTicket?.required).toBe(false);
      expect(result.data.additionalRequirements?.returnTicket?.refundable).toBe(false);
    }
  });

  it('should accept missing top-level blocks', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
        },
      ],
      // Missing financialRequirements, processingInfo, fees, additionalRequirements
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toHaveLength(1);
      expect(result.data.financialRequirements).toBeUndefined();
      expect(result.data.processingInfo).toBeUndefined();
      expect(result.data.fees).toBeUndefined();
      expect(result.data.additionalRequirements).toBeUndefined();
    }
  });

  it('should handle completely empty input with defaults', () => {
    const input = {};

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toEqual([]);
    }
  });
});
 * Test VisaRuleSetDataSchema tolerance to null/missing fields
 * Verifies that the schema accepts null values and coerces them to safe defaults
 */

import { z } from 'zod';

// Import the schema helpers (we'll need to extract them or test inline)
// For now, we'll test the pattern inline

const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');
const nullableNumber = z.union([z.number(), z.null()]).transform((v) => v ?? 0);
const nullableBool = z.union([z.boolean(), z.null()]).transform((v) => v ?? false);

const RequiredDocumentSchema = z.object({
  documentType: z.string(),
  category: z.enum(['required', 'highly_recommended', 'optional']).optional().default('required'),
  description: nullableString.optional(),
  validityRequirements: nullableString.optional(),
  formatRequirements: nullableString.optional(),
});

const FinancialRequirementsSchema = z.object({
  minimumBalance: nullableNumber.optional(),
  currency: nullableString.optional(),
  bankStatementMonths: nullableNumber.optional(),
  sponsorRequirements: z
    .object({
      allowed: nullableBool.optional(),
      requiredDocuments: z.array(z.string()).optional().default([]),
    })
    .optional(),
});

const ProcessingInfoSchema = z.object({
  processingDays: nullableNumber.optional(),
  appointmentRequired: nullableBool.optional(),
  interviewRequired: nullableBool.optional(),
  biometricsRequired: nullableBool.optional(),
});

const FeesSchema = z.object({
  visaFee: nullableNumber.optional(),
  serviceFee: nullableNumber.optional(),
  currency: nullableString.optional(),
  paymentMethods: z.array(z.string()).optional().default([]),
});

const AdditionalRequirementsSchema = z.object({
  travelInsurance: z
    .object({
      required: nullableBool.optional(),
      minimumCoverage: nullableNumber.optional(),
      currency: nullableString.optional(),
    })
    .optional(),
  accommodationProof: z
    .object({
      required: nullableBool.optional(),
      types: z.array(z.string()).optional().default([]),
    })
    .optional(),
  returnTicket: z
    .object({
      required: nullableBool.optional(),
      refundable: nullableBool.optional(),
    })
    .optional(),
});

const VisaRuleSetDataSchema = z
  .object({
    requiredDocuments: z.array(RequiredDocumentSchema).optional().default([]),
    financialRequirements: FinancialRequirementsSchema.optional(),
    processingInfo: ProcessingInfoSchema.optional(),
    fees: FeesSchema.optional(),
    additionalRequirements: AdditionalRequirementsSchema.optional(),
    sourceInfo: z
      .object({
        extractedFrom: z.string().optional(),
        extractedAt: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .passthrough();

describe('VisaRuleSetDataSchema null tolerance', () => {
  it('should accept null values in requiredDocuments fields', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
          category: 'required',
          description: null,
          validityRequirements: null,
          formatRequirements: null,
        },
      ],
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments[0].description).toBe('');
      expect(result.data.requiredDocuments[0].validityRequirements).toBe('');
      expect(result.data.requiredDocuments[0].formatRequirements).toBe('');
    }
  });

  it('should accept null values in financialRequirements', () => {
    const input = {
      requiredDocuments: [],
      financialRequirements: {
        minimumBalance: null,
        currency: null,
        bankStatementMonths: null,
        sponsorRequirements: {
          allowed: null,
          requiredDocuments: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financialRequirements?.minimumBalance).toBe(0);
      expect(result.data.financialRequirements?.currency).toBe('');
      expect(result.data.financialRequirements?.bankStatementMonths).toBe(0);
      expect(result.data.financialRequirements?.sponsorRequirements?.allowed).toBe(false);
      expect(result.data.financialRequirements?.sponsorRequirements?.requiredDocuments).toEqual([]);
    }
  });

  it('should accept null values in processingInfo', () => {
    const input = {
      requiredDocuments: [],
      processingInfo: {
        processingDays: null,
        appointmentRequired: null,
        interviewRequired: null,
        biometricsRequired: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processingInfo?.processingDays).toBe(0);
      expect(result.data.processingInfo?.appointmentRequired).toBe(false);
      expect(result.data.processingInfo?.interviewRequired).toBe(false);
      expect(result.data.processingInfo?.biometricsRequired).toBe(false);
    }
  });

  it('should accept null values in fees', () => {
    const input = {
      requiredDocuments: [],
      fees: {
        visaFee: null,
        serviceFee: null,
        currency: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fees?.visaFee).toBe(0);
      expect(result.data.fees?.serviceFee).toBe(0);
      expect(result.data.fees?.currency).toBe('');
    }
  });

  it('should accept null values in additionalRequirements', () => {
    const input = {
      requiredDocuments: [],
      additionalRequirements: {
        travelInsurance: {
          required: null,
          minimumCoverage: null,
          currency: null,
        },
        accommodationProof: {
          required: null,
          types: null,
        },
        returnTicket: {
          required: null,
          refundable: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additionalRequirements?.travelInsurance?.required).toBe(false);
      expect(result.data.additionalRequirements?.travelInsurance?.minimumCoverage).toBe(0);
      expect(result.data.additionalRequirements?.travelInsurance?.currency).toBe('');
      expect(result.data.additionalRequirements?.accommodationProof?.required).toBe(false);
      expect(result.data.additionalRequirements?.accommodationProof?.types).toEqual([]);
      expect(result.data.additionalRequirements?.returnTicket?.required).toBe(false);
      expect(result.data.additionalRequirements?.returnTicket?.refundable).toBe(false);
    }
  });

  it('should accept missing top-level blocks', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
        },
      ],
      // Missing financialRequirements, processingInfo, fees, additionalRequirements
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toHaveLength(1);
      expect(result.data.financialRequirements).toBeUndefined();
      expect(result.data.processingInfo).toBeUndefined();
      expect(result.data.fees).toBeUndefined();
      expect(result.data.additionalRequirements).toBeUndefined();
    }
  });

  it('should handle completely empty input with defaults', () => {
    const input = {};

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toEqual([]);
    }
  });
});
 * Test VisaRuleSetDataSchema tolerance to null/missing fields
 * Verifies that the schema accepts null values and coerces them to safe defaults
 */

import { z } from 'zod';

// Import the schema helpers (we'll need to extract them or test inline)
// For now, we'll test the pattern inline

const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');
const nullableNumber = z.union([z.number(), z.null()]).transform((v) => v ?? 0);
const nullableBool = z.union([z.boolean(), z.null()]).transform((v) => v ?? false);

const RequiredDocumentSchema = z.object({
  documentType: z.string(),
  category: z.enum(['required', 'highly_recommended', 'optional']).optional().default('required'),
  description: nullableString.optional(),
  validityRequirements: nullableString.optional(),
  formatRequirements: nullableString.optional(),
});

const FinancialRequirementsSchema = z.object({
  minimumBalance: nullableNumber.optional(),
  currency: nullableString.optional(),
  bankStatementMonths: nullableNumber.optional(),
  sponsorRequirements: z
    .object({
      allowed: nullableBool.optional(),
      requiredDocuments: z.array(z.string()).optional().default([]),
    })
    .optional(),
});

const ProcessingInfoSchema = z.object({
  processingDays: nullableNumber.optional(),
  appointmentRequired: nullableBool.optional(),
  interviewRequired: nullableBool.optional(),
  biometricsRequired: nullableBool.optional(),
});

const FeesSchema = z.object({
  visaFee: nullableNumber.optional(),
  serviceFee: nullableNumber.optional(),
  currency: nullableString.optional(),
  paymentMethods: z.array(z.string()).optional().default([]),
});

const AdditionalRequirementsSchema = z.object({
  travelInsurance: z
    .object({
      required: nullableBool.optional(),
      minimumCoverage: nullableNumber.optional(),
      currency: nullableString.optional(),
    })
    .optional(),
  accommodationProof: z
    .object({
      required: nullableBool.optional(),
      types: z.array(z.string()).optional().default([]),
    })
    .optional(),
  returnTicket: z
    .object({
      required: nullableBool.optional(),
      refundable: nullableBool.optional(),
    })
    .optional(),
});

const VisaRuleSetDataSchema = z
  .object({
    requiredDocuments: z.array(RequiredDocumentSchema).optional().default([]),
    financialRequirements: FinancialRequirementsSchema.optional(),
    processingInfo: ProcessingInfoSchema.optional(),
    fees: FeesSchema.optional(),
    additionalRequirements: AdditionalRequirementsSchema.optional(),
    sourceInfo: z
      .object({
        extractedFrom: z.string().optional(),
        extractedAt: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .passthrough();

describe('VisaRuleSetDataSchema null tolerance', () => {
  it('should accept null values in requiredDocuments fields', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
          category: 'required',
          description: null,
          validityRequirements: null,
          formatRequirements: null,
        },
      ],
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments[0].description).toBe('');
      expect(result.data.requiredDocuments[0].validityRequirements).toBe('');
      expect(result.data.requiredDocuments[0].formatRequirements).toBe('');
    }
  });

  it('should accept null values in financialRequirements', () => {
    const input = {
      requiredDocuments: [],
      financialRequirements: {
        minimumBalance: null,
        currency: null,
        bankStatementMonths: null,
        sponsorRequirements: {
          allowed: null,
          requiredDocuments: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financialRequirements?.minimumBalance).toBe(0);
      expect(result.data.financialRequirements?.currency).toBe('');
      expect(result.data.financialRequirements?.bankStatementMonths).toBe(0);
      expect(result.data.financialRequirements?.sponsorRequirements?.allowed).toBe(false);
      expect(result.data.financialRequirements?.sponsorRequirements?.requiredDocuments).toEqual([]);
    }
  });

  it('should accept null values in processingInfo', () => {
    const input = {
      requiredDocuments: [],
      processingInfo: {
        processingDays: null,
        appointmentRequired: null,
        interviewRequired: null,
        biometricsRequired: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processingInfo?.processingDays).toBe(0);
      expect(result.data.processingInfo?.appointmentRequired).toBe(false);
      expect(result.data.processingInfo?.interviewRequired).toBe(false);
      expect(result.data.processingInfo?.biometricsRequired).toBe(false);
    }
  });

  it('should accept null values in fees', () => {
    const input = {
      requiredDocuments: [],
      fees: {
        visaFee: null,
        serviceFee: null,
        currency: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fees?.visaFee).toBe(0);
      expect(result.data.fees?.serviceFee).toBe(0);
      expect(result.data.fees?.currency).toBe('');
    }
  });

  it('should accept null values in additionalRequirements', () => {
    const input = {
      requiredDocuments: [],
      additionalRequirements: {
        travelInsurance: {
          required: null,
          minimumCoverage: null,
          currency: null,
        },
        accommodationProof: {
          required: null,
          types: null,
        },
        returnTicket: {
          required: null,
          refundable: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additionalRequirements?.travelInsurance?.required).toBe(false);
      expect(result.data.additionalRequirements?.travelInsurance?.minimumCoverage).toBe(0);
      expect(result.data.additionalRequirements?.travelInsurance?.currency).toBe('');
      expect(result.data.additionalRequirements?.accommodationProof?.required).toBe(false);
      expect(result.data.additionalRequirements?.accommodationProof?.types).toEqual([]);
      expect(result.data.additionalRequirements?.returnTicket?.required).toBe(false);
      expect(result.data.additionalRequirements?.returnTicket?.refundable).toBe(false);
    }
  });

  it('should accept missing top-level blocks', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
        },
      ],
      // Missing financialRequirements, processingInfo, fees, additionalRequirements
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toHaveLength(1);
      expect(result.data.financialRequirements).toBeUndefined();
      expect(result.data.processingInfo).toBeUndefined();
      expect(result.data.fees).toBeUndefined();
      expect(result.data.additionalRequirements).toBeUndefined();
    }
  });

  it('should handle completely empty input with defaults', () => {
    const input = {};

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toEqual([]);
    }
  });
});
 * Test VisaRuleSetDataSchema tolerance to null/missing fields
 * Verifies that the schema accepts null values and coerces them to safe defaults
 */

import { z } from 'zod';

// Import the schema helpers (we'll need to extract them or test inline)
// For now, we'll test the pattern inline

const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');
const nullableNumber = z.union([z.number(), z.null()]).transform((v) => v ?? 0);
const nullableBool = z.union([z.boolean(), z.null()]).transform((v) => v ?? false);

const RequiredDocumentSchema = z.object({
  documentType: z.string(),
  category: z.enum(['required', 'highly_recommended', 'optional']).optional().default('required'),
  description: nullableString.optional(),
  validityRequirements: nullableString.optional(),
  formatRequirements: nullableString.optional(),
});

const FinancialRequirementsSchema = z.object({
  minimumBalance: nullableNumber.optional(),
  currency: nullableString.optional(),
  bankStatementMonths: nullableNumber.optional(),
  sponsorRequirements: z
    .object({
      allowed: nullableBool.optional(),
      requiredDocuments: z.array(z.string()).optional().default([]),
    })
    .optional(),
});

const ProcessingInfoSchema = z.object({
  processingDays: nullableNumber.optional(),
  appointmentRequired: nullableBool.optional(),
  interviewRequired: nullableBool.optional(),
  biometricsRequired: nullableBool.optional(),
});

const FeesSchema = z.object({
  visaFee: nullableNumber.optional(),
  serviceFee: nullableNumber.optional(),
  currency: nullableString.optional(),
  paymentMethods: z.array(z.string()).optional().default([]),
});

const AdditionalRequirementsSchema = z.object({
  travelInsurance: z
    .object({
      required: nullableBool.optional(),
      minimumCoverage: nullableNumber.optional(),
      currency: nullableString.optional(),
    })
    .optional(),
  accommodationProof: z
    .object({
      required: nullableBool.optional(),
      types: z.array(z.string()).optional().default([]),
    })
    .optional(),
  returnTicket: z
    .object({
      required: nullableBool.optional(),
      refundable: nullableBool.optional(),
    })
    .optional(),
});

const VisaRuleSetDataSchema = z
  .object({
    requiredDocuments: z.array(RequiredDocumentSchema).optional().default([]),
    financialRequirements: FinancialRequirementsSchema.optional(),
    processingInfo: ProcessingInfoSchema.optional(),
    fees: FeesSchema.optional(),
    additionalRequirements: AdditionalRequirementsSchema.optional(),
    sourceInfo: z
      .object({
        extractedFrom: z.string().optional(),
        extractedAt: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .passthrough();

describe('VisaRuleSetDataSchema null tolerance', () => {
  it('should accept null values in requiredDocuments fields', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
          category: 'required',
          description: null,
          validityRequirements: null,
          formatRequirements: null,
        },
      ],
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments[0].description).toBe('');
      expect(result.data.requiredDocuments[0].validityRequirements).toBe('');
      expect(result.data.requiredDocuments[0].formatRequirements).toBe('');
    }
  });

  it('should accept null values in financialRequirements', () => {
    const input = {
      requiredDocuments: [],
      financialRequirements: {
        minimumBalance: null,
        currency: null,
        bankStatementMonths: null,
        sponsorRequirements: {
          allowed: null,
          requiredDocuments: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.financialRequirements?.minimumBalance).toBe(0);
      expect(result.data.financialRequirements?.currency).toBe('');
      expect(result.data.financialRequirements?.bankStatementMonths).toBe(0);
      expect(result.data.financialRequirements?.sponsorRequirements?.allowed).toBe(false);
      expect(result.data.financialRequirements?.sponsorRequirements?.requiredDocuments).toEqual([]);
    }
  });

  it('should accept null values in processingInfo', () => {
    const input = {
      requiredDocuments: [],
      processingInfo: {
        processingDays: null,
        appointmentRequired: null,
        interviewRequired: null,
        biometricsRequired: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processingInfo?.processingDays).toBe(0);
      expect(result.data.processingInfo?.appointmentRequired).toBe(false);
      expect(result.data.processingInfo?.interviewRequired).toBe(false);
      expect(result.data.processingInfo?.biometricsRequired).toBe(false);
    }
  });

  it('should accept null values in fees', () => {
    const input = {
      requiredDocuments: [],
      fees: {
        visaFee: null,
        serviceFee: null,
        currency: null,
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fees?.visaFee).toBe(0);
      expect(result.data.fees?.serviceFee).toBe(0);
      expect(result.data.fees?.currency).toBe('');
    }
  });

  it('should accept null values in additionalRequirements', () => {
    const input = {
      requiredDocuments: [],
      additionalRequirements: {
        travelInsurance: {
          required: null,
          minimumCoverage: null,
          currency: null,
        },
        accommodationProof: {
          required: null,
          types: null,
        },
        returnTicket: {
          required: null,
          refundable: null,
        },
      },
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.additionalRequirements?.travelInsurance?.required).toBe(false);
      expect(result.data.additionalRequirements?.travelInsurance?.minimumCoverage).toBe(0);
      expect(result.data.additionalRequirements?.travelInsurance?.currency).toBe('');
      expect(result.data.additionalRequirements?.accommodationProof?.required).toBe(false);
      expect(result.data.additionalRequirements?.accommodationProof?.types).toEqual([]);
      expect(result.data.additionalRequirements?.returnTicket?.required).toBe(false);
      expect(result.data.additionalRequirements?.returnTicket?.refundable).toBe(false);
    }
  });

  it('should accept missing top-level blocks', () => {
    const input = {
      requiredDocuments: [
        {
          documentType: 'passport',
        },
      ],
      // Missing financialRequirements, processingInfo, fees, additionalRequirements
    };

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toHaveLength(1);
      expect(result.data.financialRequirements).toBeUndefined();
      expect(result.data.processingInfo).toBeUndefined();
      expect(result.data.fees).toBeUndefined();
      expect(result.data.additionalRequirements).toBeUndefined();
    }
  });

  it('should handle completely empty input with defaults', () => {
    const input = {};

    const result = VisaRuleSetDataSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredDocuments).toEqual([]);
    }
  });
});
