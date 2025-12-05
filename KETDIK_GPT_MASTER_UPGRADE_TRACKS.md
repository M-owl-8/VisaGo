# Ketdik – GPT Master Upgrade: Track Execution Plan

**Agent:** Ketdik – GPT Master Upgrade  
**Repository:** `apps/backend/` + `apps/web/`  
**Execution:** Sequential (Track A → Track B → Track C → Track D → Track E)

---

## Track A – Questionnaire & AIUserContext Cleanup

### Objective

Clean up questionnaire extraction and AIUserContext building to ensure complete, accurate applicant profiles are passed to GPT-4.

### Current Issues

- Questionnaire V2 extraction returns nullable fields
- `buildAIUserContext()` may return incomplete profiles
- Legacy format dependencies still exist
- No validation for questionnaire completeness

### Files to Modify

1. `apps/backend/src/utils/questionnaire-extractor.ts` (or similar)
2. `apps/backend/src/services/ai-openai.service.ts` (buildAIUserContext method)
3. `apps/backend/src/types/questionnaire.ts`
4. `apps/backend/src/routes/applications.ts` (questionnaire submission endpoint)

### Tasks

#### A1. Improve Questionnaire V2 Extraction

- [ ] Locate questionnaire extraction logic
- [ ] Handle all nullable fields with sensible defaults
- [ ] Extract summary field if available
- [ ] Validate extracted data structure
- [ ] Add error handling for malformed questionnaire data

#### A2. Enhance buildAIUserContext()

- [ ] Review current implementation
- [ ] Ensure all fields are populated (use defaults if needed)
- [ ] Add validation for required fields
- [ ] Improve field mapping from questionnaire to context
- [ ] Add logging for missing fields

#### A3. Add Questionnaire Validation

- [ ] Create validation schema (Zod)
- [ ] Validate questionnaire on submission
- [ ] Return clear error messages for invalid data
- [ ] Add validation tests

#### A4. Remove Legacy Dependencies

- [ ] Identify legacy format usage
- [ ] Migrate to V2 format only
- [ ] Remove legacy format parsing
- [ ] Update tests to use V2 format

#### A5. Add Unit Tests

- [ ] Test questionnaire extraction with various inputs
- [ ] Test buildAIUserContext() with complete/incomplete data
- [ ] Test validation logic
- [ ] Test edge cases (null, undefined, empty strings)

### Success Criteria

- ✅ All questionnaire fields are extracted correctly
- ✅ buildAIUserContext() returns complete profiles
- ✅ Validation catches invalid questionnaire data
- ✅ Unit tests pass with >90% coverage
- ✅ No legacy format dependencies remain

### Migration Notes

- No database migration needed
- Backward compatible (handles both formats during transition)
- No API breaking changes

---

## Track B – Rules Engine & Condition Logic

### Objective

Add conditional logic to VisaRuleSet so rules can specify when documents apply based on applicant profile.

### Current Issues

- VisaRuleSet has no `condition` field
- Rules engine treats all documents as always required
- GPT-4 must guess which documents apply
- No way to specify "sponsor_bank_statement only if sponsorType !== 'self'"

### Files to Modify

1. `apps/backend/prisma/schema.prisma` (VisaRuleSet model)
2. `apps/backend/src/services/visa-rules.service.ts`
3. `apps/backend/src/services/visa-checklist-engine.service.ts`
4. `apps/backend/src/types/visa-rules.ts`
5. `apps/web/app/admin/visa-rules/` (admin UI for editing rules)

### Tasks

#### B1. Database Schema Update

- [ ] Add `condition` field to VisaRuleSet document structure
- [ ] Create Prisma migration
- [ ] Document condition syntax (e.g., JSONPath, JavaScript expression)
- [ ] Add migration rollback plan

#### B2. Condition Evaluation Engine

- [ ] Create `applyConditionalRules()` function
- [ ] Implement condition parser/evaluator
- [ ] Support common conditions:
  - `sponsorType !== 'self'`
  - `employmentStatus === 'employed'`
  - `visaType === 'student' && hasUniversityAcceptance === false`
  - `riskScore.level === 'high'`
- [ ] Add condition validation

#### B3. Update Rules Engine

- [ ] Modify `VisaChecklistEngineService.generateChecklist()`
- [ ] Filter documents by conditions before passing to GPT
- [ ] Pass filtered rule set to GPT prompt
- [ ] Log which documents were filtered and why

#### B4. Admin UI Updates

- [ ] Add condition editor to visa rules admin page
- [ ] Add condition validation in UI
- [ ] Show condition preview/test
- [ ] Add examples/documentation

#### B5. Tests

- [ ] Test condition evaluation with various applicant profiles
- [ ] Test edge cases (null values, missing fields)
- [ ] Test invalid conditions (error handling)
- [ ] Integration tests with GPT

### Success Criteria

- ✅ VisaRuleSet supports condition field
- ✅ Conditions are evaluated correctly
- ✅ Rules engine filters documents by conditions
- ✅ Admin UI allows editing conditions
- ✅ Tests pass with >90% coverage

### Migration Notes

- **Database migration required:** Add `condition` field to existing rules
- **Backward compatible:** Existing rules without conditions work as before
- **Data migration:** Set `condition: null` for existing rules (all documents required)

---

## Track C – Embassy Auto-Learning Pipeline

### Objective

Integrate EmbassySource content into GPT prompts so GPT-4 can see latest embassy requirements.

### Current Issues

- EmbassySource URLs are fetched but content is never used
- GPT-4 only sees VisaRuleSet (stale rules)
- No RAG retrieval from embassy pages
- 403 errors are stored but ignored

### Files to Modify

1. `apps/backend/src/services/embassy-crawler.service.ts`
2. `apps/backend/src/services/embassy-source.service.ts`
3. `apps/backend/src/services/visa-checklist-engine.service.ts`
4. `apps/backend/src/services/rag.service.ts` (if RAG exists, or create new)
5. `apps/backend/src/routes/admin/embassy-sources.ts` (if exists)

### Tasks

#### C1. EmbassySource Content Fetching

- [ ] Review `EmbassyCrawlerService.crawlSource()` implementation
- [ ] Ensure cleaned text is extracted from pages
- [ ] Handle 403/404 errors gracefully
- [ ] Cache embassy content (Redis or database)
- [ ] Add retry logic for failed fetches

#### C2. EmbassySource Integration

- [ ] Create `EmbassySourceService.listSources()` method
- [ ] Filter by countryCode, visaType, isActive, lastStatus
- [ ] Fetch content for active sources only
- [ ] Merge multiple embassy sources if available

#### C3. Requirements Extraction

- [ ] Create `extractRequirementsFromEmbassyPages()` function
- [ ] Extract document requirements from embassy text
- [ ] Parse visa-specific requirements
- [ ] Structure extracted requirements (document type, description, etc.)
- [ ] Alternative: Use RAG if vector DB is available

#### C4. Merge with VisaRuleSet

- [ ] Create `mergeDocumentLists()` function
- [ ] Merge baseDocuments (from rules) + additionalRequirements (from embassy)
- [ ] Deduplicate documents
- [ ] Prioritize embassy requirements over rules (if conflict)

#### C5. Update GPT Prompts

- [ ] Modify `VisaChecklistEngineService.buildSystemPrompt()`
- [ ] Add EMBASSY_REQUIREMENTS section to prompt
- [ ] Include embassy content in user prompt
- [ ] Update prompt to use embassy requirements

#### C6. Candidate Rules Generation

- [ ] Create function to generate candidate rules from embassy pages
- [ ] Extract document types, categories, descriptions
- [ ] Suggest new rules to admin for approval
- [ ] Add admin UI for reviewing candidate rules

#### C7. Error Handling & Caching

- [ ] Handle embassy fetch failures gracefully
- [ ] Fall back to rules-only if embassy unavailable
- [ ] Cache embassy content (TTL: 24 hours)
- [ ] Log embassy integration status

### Success Criteria

- ✅ EmbassySource content is fetched and cleaned
- ✅ Embassy requirements are extracted and structured
- ✅ GPT-4 receives embassy content in prompts
- ✅ Candidate rules are generated from embassy pages
- ✅ System handles embassy failures gracefully

### Migration Notes

- **No database migration needed** (EmbassySource table already exists)
- **Backward compatible:** Falls back to rules-only if embassy unavailable
- **Cache strategy:** Use Redis or database field for cached content

---

## Track D – GPT Prompt Refactor + Doc Verification

### Objective

Simplify and optimize GPT prompts, add document verification capability.

### Current Issues

- Legacy GPT-4 prompt is 1500+ lines with redundancy
- No structured prompt templates
- No document verification endpoint
- High token costs

### Files to Modify

1. `apps/backend/src/services/ai-openai.service.ts`
2. `apps/backend/src/services/visa-checklist-engine.service.ts`
3. `apps/backend/src/services/document-verification.service.ts` (create new)
4. `apps/backend/src/routes/applications.ts` (add verification endpoint)
5. `apps/backend/src/prompts/` (create prompt templates directory)

### Tasks

#### D1. Prompt Template System

- [ ] Create `apps/backend/src/prompts/` directory
- [ ] Extract checklist generation prompt to template
- [ ] Create structured prompt builder
- [ ] Support variable substitution
- [ ] Add prompt versioning

#### D2. Refactor Legacy Prompt

- [ ] Review current 1500+ line prompt
- [ ] Remove redundant instructions
- [ ] Simplify structure
- [ ] Focus on essential rules only
- [ ] Reduce token count by 50%+

#### D3. Structured Output Enforcement

- [ ] Add JSON schema to prompts
- [ ] Enforce strict output format
- [ ] Add validation instructions
- [ ] Prevent hallucinations (no extra documents)

#### D4. Document Verification Prompt

- [ ] Create document verification system prompt
- [ ] Design verification output schema:
  - `isValid: boolean`
  - `confidence: number`
  - `matchesDocumentType: boolean`
  - `issues: string[]`
  - `notesUz/Ru/En: string`
- [ ] Add verification rules (blurry, expired, missing fields)

#### D5. Document Verification Service

- [ ] Create `DocumentVerificationService`
- [ ] Implement verification endpoint
- [ ] Integrate with document upload flow
- [ ] Store verification results
- [ ] Add verification history

#### D6. Multi-Language Support

- [ ] Ensure all prompts support EN/UZ/RU
- [ ] Add language-specific instructions
- [ ] Test prompts in all languages

#### D7. Token Optimization

- [ ] Measure token usage before/after
- [ ] Optimize prompt length
- [ ] Use GPT-4 efficiently (system vs user prompts)
- [ ] Add token usage logging

### Success Criteria

- ✅ Prompt templates are created and used
- ✅ Legacy prompt is reduced by 50%+ tokens
- ✅ Document verification works correctly
- ✅ Multi-language support works
- ✅ Token usage is optimized

### Migration Notes

- **No database migration needed** (unless storing verification results)
- **Backward compatible:** Old prompts still work during transition
- **API changes:** New document verification endpoint (additive)

---

## Track E – Evaluation, Logging & Monitoring

### Objective

Add comprehensive evaluation framework, logging, and monitoring for GPT system.

### Current Issues

- No evaluation framework
- Limited GPT request/response logging
- No monitoring dashboard
- No A/B testing capability

### Files to Create/Modify

1. `apps/backend/src/services/evaluation.service.ts` (new)
2. `apps/backend/src/middleware/gpt-logging.ts` (new)
3. `apps/backend/src/routes/admin/evaluation.ts` (new)
4. `apps/web/app/admin/evaluation/` (new admin UI)
5. `apps/backend/src/types/evaluation.ts` (new)
6. `apps/backend/prisma/schema.prisma` (add evaluation tables)

### Tasks

#### E1. Evaluation Service

- [ ] Create `EvaluationService` class
- [ ] Implement metrics calculation:
  - Checklist accuracy
  - Document relevance
  - JSON validity
  - Response time
  - Token usage
- [ ] Compare GPT output against evaluation dataset
- [ ] Generate evaluation reports

#### E2. GPT Logging Middleware

- [ ] Create `gpt-logging.ts` middleware
- [ ] Log all GPT requests (prompt, parameters)
- [ ] Log all GPT responses (output, tokens, time)
- [ ] Log errors and retries
- [ ] Store logs in database (GPTLog table)

#### E3. Evaluation Dashboard (Admin UI)

- [ ] Create evaluation page in admin panel
- [ ] Show metrics over time (charts)
- [ ] Compare prompt versions (A/B testing)
- [ ] Show evaluation dataset results
- [ ] Display token usage trends
- [ ] Show error rates

#### E4. Monitoring & Alerting

- [ ] Add monitoring for GPT API errors
- [ ] Track retry rates
- [ ] Monitor token usage (cost tracking)
- [ ] Alert on high error rates
- [ ] Alert on cost spikes

#### E5. A/B Testing Framework

- [ ] Create A/B test infrastructure
- [ ] Support multiple prompt versions
- [ ] Route requests to different versions
- [ ] Compare results between versions
- [ ] Statistical significance testing

#### E6. Evaluation Dataset Integration

- [ ] Load evaluation dataset
- [ ] Run evaluations automatically
- [ ] Compare results against baseline
- [ ] Generate improvement reports

#### E7. Database Schema

- [ ] Create `GPTLog` table (requests/responses)
- [ ] Create `EvaluationRun` table (evaluation results)
- [ ] Create `ABTest` table (A/B test configurations)
- [ ] Create Prisma migrations

### Success Criteria

- ✅ Evaluation service calculates all metrics
- ✅ All GPT requests/responses are logged
- ✅ Evaluation dashboard shows metrics
- ✅ Monitoring alerts work
- ✅ A/B testing framework is functional

### Migration Notes

- **Database migrations required:** New tables for logging and evaluation
- **Backward compatible:** Logging is additive, doesn't break existing flow
- **Data:** Evaluation dataset must be provided/configured

---

## Execution Order

1. **Track A** → Complete all tasks, validate, mark complete
2. **Track B** → Start only after Track A is complete
3. **Track C** → Start only after Track B is complete
4. **Track D** → Start only after Track C is complete
5. **Track E** → Start only after Track D is complete

## Progress Tracking

Update this document as tracks are completed:

- [ ] Track A – Questionnaire & AIUserContext Cleanup
- [ ] Track B – Rules Engine & Condition Logic
- [ ] Track C – Embassy Auto-Learning Pipeline
- [ ] Track D – GPT Prompt Refactor + Doc Verification
- [ ] Track E – Evaluation, Logging & Monitoring

---

## Notes

- All changes must be incremental and safe
- Migrations must be explained and tested
- Evaluation dataset must be used for validation
- All GPT code changes go through this agent
