# Phase 2 Integration - Quick Reference

## Status
✅ Templates created (20 templates for 10 countries × 2 visa types)
✅ Country code normalization added
✅ VisaTemplateService created
✅ Prisma models added

## Remaining: Backend Integration

The file `apps/backend/src/services/ai-openai.service.ts` needs Phase 1 + Phase 2 integration.

**IMPORTANT**: Due to file stability issues, please use the detailed guide in `PHASE_2_MANUAL_INTEGRATION_STEPS.md` to apply changes manually.

## Quick Checklist

After applying all changes from `PHASE_2_MANUAL_INTEGRATION_STEPS.md`, verify:

- [ ] Imports added (CHECKLIST_SYSTEM_PROMPT, buildApplicantProfile, VisaTemplateService, types, mappers)
- [ ] Helper functions added (normalizeVisaTypeCode, ensureCoreDocumentsPresent)
- [ ] ApplicantProfile built in legacy mode section
- [ ] VisaTemplate fetched and logged
- [ ] System prompt replaced with CHECKLIST_SYSTEM_PROMPT
- [ ] User prompt includes ApplicantProfile + VisaTemplate JSON
- [ ] Parsing uses parseChecklistResponse → ChecklistBrainOutput → legacyChecklist
- [ ] Core documents enforced via ensureCoreDocumentsPresent
- [ ] All `parsed` references changed to `legacyChecklist`
- [ ] TypeScript builds successfully
- [ ] No lint errors

## Files Ready

All supporting files are complete:
- ✅ `apps/backend/src/types/visa-brain.ts` - Canonical types
- ✅ `apps/backend/src/config/ai-prompts.ts` - System prompts
- ✅ `apps/backend/src/services/ai-context.service.ts` - ApplicantProfile builder + country normalization
- ✅ `apps/backend/src/services/visa-template.service.ts` - Template fetcher
- ✅ `apps/backend/src/data/visa-templates.seed.ts` - 20 templates
- ✅ `apps/backend/src/utils/checklist-mappers.ts` - Brain ↔ Legacy mappers
- ✅ `apps/backend/prisma/schema.prisma` - VisaTemplate models

## Next Steps

1. Follow `PHASE_2_MANUAL_INTEGRATION_STEPS.md` step by step
2. Test after each major change
3. Run TypeScript build to verify
4. Test checklist generation for one of the 10 countries



