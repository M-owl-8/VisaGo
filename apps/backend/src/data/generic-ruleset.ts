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
  ],
};
