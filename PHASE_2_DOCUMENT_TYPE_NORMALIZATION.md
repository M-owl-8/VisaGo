# Phase 2: Document Type Normalization - Implementation Report

## Summary

Phase 2 successfully implements document type normalization across the entire VisaBuddy/Ketdik backend system. All document types are now normalized to canonical forms using a centralized mapping system, ensuring consistent matching between checklist items, uploaded documents, and validation logic.

## Files Modified

### Core Configuration

- **`apps/backend/src/config/document-types-map.ts`**
  - Enhanced with `toCanonicalDocumentType()` function that returns `NormalizedDocumentTypeResult`
  - Added `logUnknownDocumentType()` helper for safe logging
  - Added canonical types: `ds160_confirmation`, `visa_fee_receipt`, `appointment_confirmation`
  - Enhanced alias mappings for common document type variations

### Checklist Generation

- **`apps/backend/src/services/checklist-rules.service.ts`**
  - Applied normalization in `buildBaseChecklistFromCatalogReferences()` (catalog mode)
  - Applied normalization in `buildBaseChecklistFromEmbeddedDocuments()` (legacy mode)
  - All document types from `VisaRuleSet.requiredDocuments` and `VisaRuleReference` are normalized
  - Unknown types are logged but do not crash the system

### Document Upload & Storage

- **`apps/backend/src/routes/documents.ts`**
  - Document types are normalized when creating `UserDocument` records
  - Uses canonical type when available, falls back to original for backward compatibility
  - Unknown types are logged with context (userId, applicationId)

### Document Matching

- **`apps/backend/src/services/document-checklist.service.ts`**
  - Enhanced `findMatchingDocument()` to use normalization for matching
  - Supports matching by canonical types and aliases
  - Falls back to legacy fuzzy matching if normalization doesn't find a match

### Document Validation

- **`apps/backend/src/services/document-validation.service.ts`**
  - Normalizes document types before passing to AI prompts
  - Uses normalized types in rule matching logic
  - Logs original and normalized types for debugging

- **`apps/backend/src/services/visa-doc-checker.service.ts`**
  - Normalizes document types from `VisaRuleSet.requiredDocuments`
  - Uses normalized types in prompts and logging

### Rules Extraction & Storage

- **`apps/backend/src/services/visa-rules.service.ts`**
  - Normalizes document types in `createOrUpdateRuleSetFromAI()` before saving to database
  - Both `VisaRuleSet.data` and `VisaRuleVersion.data` use normalized document types
  - Unknown types are logged with source context

## Canonical Document Type List

The system now recognizes the following canonical document types (aligned with `DocumentCatalog.documentType`):

### Identity Documents

- `passport` (aliases: `passport_international`, `international_passport`)
- `passport_photo` (aliases: `passport_photo`, `passport_photos`, `photo`, `photos`)
- `passport_biometric`
- `birth_certificate`
- `marriage_certificate`

### Financial Documents

- `bank_statement` (aliases: `bank_statements`, `bank_statements_applicant`, `financial_evidence`, etc.)
- `bank_statements_applicant`
- `sponsor_bank_statements` (aliases: `sponsor_bank_statement`, `sponsor_financial_documents`, etc.)
- `income_certificate` (aliases: `income_proof`, `income_document`, `salary_certificate`)
- `proof_of_funds` (aliases: `financial_guarantee`, `funds_proof`, `financial_proof`)
- `tax_returns` (aliases: `tax_return`, `tax_document`, `income_tax`)

### Travel Documents

- `travel_insurance` (aliases: `insurance`, `health_insurance`, `medical_insurance`)
- `flight_booking` (aliases: `flight_reservation`, `return_ticket`, `flight_ticket`)
- `accommodation_proof` (aliases: `hotel_booking`, `accommodation_booking`, `hotel_reservation`, etc.)
- `travel_itinerary` (aliases: `itinerary`, `travel_plan`, `trip_itinerary`)

### Visa Application Documents

- `visa_application_form` (aliases: `visa_form`, `visa_application`, `application_form`)
- `ds160_confirmation` (aliases: `ds160`, `ds-160`, `ds_160`, `ds160_form`)
- `visa_fee_receipt` (aliases: `visa_fee`, `fee_receipt`, `visa_payment_receipt`)
- `appointment_confirmation` (aliases: `appointment`, `interview_appointment`, `visa_appointment`)

### Student Visa Documents

- `i20_form` (aliases: `i20`, `i-20`, `form_i20`, `sevis_i20`)
- `cas_letter` (aliases: `cas`, `confirmation_of_acceptance_for_studies`)
- `loa_letter` (aliases: `loa`, `letter_of_acceptance`, `acceptance_letter`)
- `coe_letter` (aliases: `coe`, `confirmation_of_enrollment`, `university_acceptance`)
- `tuition_payment_proof` (aliases: `tuition_payment`, `tuition_receipt`, `payment_receipt`, etc.)
- `sevis_fee_receipt`
- `scholarship_letter` (aliases: `scholarship`, `scholarship_document`, `funding_letter`)
- `gic_proof` (aliases: `gic`, `guaranteed_investment_certificate`)
- `academic_transcripts` (aliases: `transcripts`, `academic_records`, `grade_transcripts`)
- `diploma` (aliases: `degree`, `certificate`, `graduation_certificate`)

### Employment & Business Documents

- `employment_letter` (aliases: `employment_contract`, `work_letter`, `employer_letter`, etc.)
- `business_registration` (aliases: `business_license`, `company_registration`, `business_document`)

### Family & Ties Documents

- `family_ties_documents` (aliases: `family_ties`, `family_documents`, `family_proof`)
- `property_documents` (aliases: `property_document`, `kadastr`, `kadastr_document`, `real_estate_docs`, etc.)
- `invitation_letter` (aliases: `invitation`, `sponsor_letter`, `host_letter`)

### Other Documents

- `cover_letter` (aliases: `personal_statement`, `motivation_letter`, `explanation_letter`)
- `previous_visas` (aliases: `previous_visa`, `visa_history`, `travel_history`)
- `parental_consent` (aliases: `parent_consent`, `minor_consent`, `guardian_consent`)
- `police_clearance` (aliases: `police_certificate`, `criminal_record`, `background_check`)
- `medical_exam` (aliases: `medical_examination`, `health_exam`, `medical_check`)
- `tb_test_certificate` (aliases: `tuberculosis_test`, `tb_test`, `medical_test`)
- `additional_supporting_docs` (aliases: `supporting_documents`, `additional_docs`, `other_documents`)

## Where Normalization is Applied

### 1. Checklist Generation Pipeline

- **Input**: `VisaRuleSet.data.requiredDocuments[].documentType` and `VisaRuleReference.documentId → DocumentCatalog.documentType`
- **Normalization**: Applied via `toCanonicalDocumentType()` in `checklist-rules.service.ts`
- **Output**: `ChecklistItem.documentType` uses canonical type when available

### 2. Document Upload Pipeline

- **Input**: `documentType` from API request body
- **Normalization**: Applied in `routes/documents.ts` before creating `UserDocument`
- **Output**: `UserDocument.documentType` stores canonical type (backward compatible with original)

### 3. Document Matching Pipeline

- **Input**: `ChecklistItem.documentType` and `UserDocument.documentType`
- **Normalization**: Both sides normalized in `findMatchingDocument()` before comparison
- **Output**: Matching works correctly even when checklist uses "passport" and upload uses "passport_international"

### 4. Document Validation Pipeline

- **Input**: `UserDocument.documentType` and `VisaRuleSet.requiredDocuments[].documentType`
- **Normalization**: Applied in `document-validation.service.ts` and `visa-doc-checker.service.ts`
- **Output**: AI prompts and rule matching use normalized types

### 5. Rules Extraction Pipeline

- **Input**: Document types extracted from embassy pages by AI
- **Normalization**: Applied in `visa-rules.service.ts` before saving to database
- **Output**: `VisaRuleSet.data.requiredDocuments[].documentType` uses canonical types

## Safety & Backward Compatibility

### Unknown Type Handling

- Unknown document types are **never** rejected or cause crashes
- Unknown types are logged with context (source, countryCode, visaType, etc.)
- System falls back to using the original raw string when normalization fails
- This ensures backward compatibility with existing data

### Logging

- All unknown document types are logged via `logUnknownDocumentType()` helper
- Logs include context: source location, countryCode, visaType, userId, applicationId
- Helps identify patterns and add new aliases over time

### Database Schema

- **No schema changes** - existing `documentType` fields remain as `String`
- Normalization happens at the application layer
- Existing records with legacy types continue to work
- New records use canonical types when possible

## Testing Recommendations

### Unit Tests

1. Test `toCanonicalDocumentType()` with:
   - Direct canonical values (should return same, `wasNormalized=false`)
   - Common aliases (should return canonical, `wasNormalized=true`)
   - Unknown values (should return `null`, `wasNormalized=false`)

2. Test document matching:
   - Checklist item with `documentType="passport"` should match `UserDocument` with `documentType="passport_international"`
   - Both normalized to same canonical type should match exactly

### Integration Tests

1. Test checklist generation with mixed document types (canonical + aliases)
2. Test document upload with alias types (should normalize and store canonical)
3. Test document validation with normalized types in prompts

## Limitations & Future Work

### Current Limitations

1. **Alias Coverage**: Not all possible document type variations are covered. New aliases can be added incrementally as patterns are discovered.
2. **Legacy Data**: Existing database records may still contain non-canonical types. These will be normalized on-the-fly during reads, but not migrated in bulk.
3. **Case Sensitivity**: Normalization is case-insensitive, but some edge cases with special characters may need additional handling.

### Future Enhancements

1. **Bulk Migration Script**: Optional script to normalize all existing `UserDocument.documentType` values in the database
2. **Admin UI**: Interface to view and manage document type aliases
3. **Analytics**: Track which document types are most commonly normalized to identify new alias patterns
4. **Validation**: Add runtime validation to ensure `DocumentCatalog.documentType` values match canonical types

## Architecture Documentation

A new section should be added to `apps/backend/docs/architecture/rules-engine.md`:

### 5. Document Type Normalization

All document types are normalized via `toCanonicalDocumentType()` in `document-types-map.ts`. Canonical types are aligned with `DocumentCatalog.documentType`. Matching between rules, checklist items, uploader, and doc verification is done on normalized types. Unknown/legacy types are allowed but logged and treated carefully.

---

## PHASE 2 IMPLEMENTATION COMPLETED

All document type normalization has been successfully implemented across the system. The system now uses canonical document types consistently while maintaining full backward compatibility with existing data.
