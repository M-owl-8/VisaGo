import { VisaRuleSetData } from '../services/visa-rules.service';

/**
 * Default generic VisaRuleSet data used for unknown country/visaType combinations.
 * This is intentionally conservative, editable in DB after auto-provisioning.
 */
export const DEFAULT_GENERIC_RULESET_DATA: VisaRuleSetData = {
  version: 1,
  requiredDocuments: [
    {
      documentType: 'passport',
      category: 'required',
      description: 'Valid passport with at least 6 months remaining validity.',
    },
    {
      documentType: 'passport_photo',
      category: 'required',
      description: 'Recent passport-style photo that meets destination requirements.',
    },
    {
      documentType: 'visa_application_form',
      category: 'required',
      description: 'Completed visa application form (print or online confirmation).',
    },
    {
      documentType: 'travel_itinerary',
      category: 'highly_recommended',
      description: 'Planned travel itinerary or draft booking that can be adjusted.',
    },
    {
      documentType: 'accommodation_proof',
      category: 'highly_recommended',
      description: 'Hotel booking, invitation, or rental showing where you plan to stay.',
    },
    {
      documentType: 'financial_proof',
      category: 'required',
      description: 'Bank statements or other proof that you can fund the trip.',
    },
    {
      documentType: 'employment_or_study_proof',
      category: 'required',
      description: 'Employment letter, study letter, or other proof of current activity.',
    },
    {
      documentType: 'invitation_letter',
      category: 'optional',
      description: 'Invitation letter from host (if applicable).',
    },
    {
      documentType: 'travel_insurance',
      category: 'highly_recommended',
      description: 'Travel/medical insurance covering the full stay.',
    },
    // Work / employment
    {
      documentType: 'employment_contract',
      category: 'required',
      description: 'Signed job offer or employment contract specifying role and salary.',
    },
    {
      documentType: 'work_permit_sponsorship',
      category: 'required',
      description: 'Work permit or employer sponsorship/authorization (if applicable).',
    },
    // Business / conference
    {
      documentType: 'business_invitation',
      category: 'required',
      description:
        'Official invitation from partner/company or event organizer with purpose/dates.',
    },
    {
      documentType: 'company_cover_letter',
      category: 'highly_recommended',
      description: 'Letter from employer explaining business trip, dates, and who pays.',
    },
    // Family / visitor
    {
      documentType: 'relationship_proof',
      category: 'highly_recommended',
      description: 'Birth/marriage certificates or other documents proving relationship to host.',
    },
    {
      documentType: 'host_invitation',
      category: 'required',
      description: 'Invitation letter from host stating relationship, stay dates, and address.',
    },
    // Transit
    {
      documentType: 'onward_ticket',
      category: 'required',
      description: 'Confirmed onward/return ticket matching transit plan.',
    },
    {
      documentType: 'final_destination_visa',
      category: 'required',
      description: 'Visa for final destination if that country requires one.',
    },
    // Ties / return intent
    {
      documentType: 'ties_supporting_docs',
      category: 'optional',
      description: 'Property, family, or employment evidence showing intent to return.',
    },
  ],
};
