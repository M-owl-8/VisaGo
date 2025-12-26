# AI Playbook

Last updated: 2025-12-17

## Models

- Checklist: GPT-4o (env `OPENAI_MODEL_CHECKLIST`, default `gpt-4o`) — `apps/backend/src/services/ai-openai.service.ts:48-51`
- General tasks: GPT-4o-mini — `ai-openai.service.ts:48`
- Chat: DeepSeek R1 via Together.ai (Python AI service) — `apps/ai-service/services/deepseek.py`
- Embeddings: text-embedding-3-small — `apps/ai-service/services/embeddings.py`

## Prompts

- Checklist system/user prompts — `apps/backend/src/config/ai-prompts.ts`
- Chat system prompt — `apps/backend/prisma/schema.prisma:354-361` (ChatSession.systemPrompt default)
- Document validation prompt — `apps/backend/src/services/document-validation.service.ts`

## Input/Output Schemas

- Checklist items Zod schema — `apps/backend/src/services/visa-checklist-engine.service.ts:38-94`
- Checklist response schema — `visa-checklist-engine.service.ts:89-94`
- AI responses (types) — `apps/backend/src/types/ai-responses.ts`
- AI interaction logging — `apps/backend/prisma/schema.prisma:452-483`

## Guardrails

- Validation: Zod on checklist output (`visa-checklist-engine.service.ts`)
- Sanitization: `apps/backend/src/utils/input-sanitization.ts`
- Rate limits: `apps/backend/src/middleware/chat-rate-limit.ts`, `.../checklist-rate-limit.ts`
- Token caps: MAX_TOKENS default 2000 (`ai-openai.service.ts:51`)
- Fallbacks:
  - Checklist fallback to rule-based (`visa-checklist-engine.service.ts:221-294`)
  - Chat returns graceful error (`apps/backend/src/routes/chat.ts:250-258`)

## Caching Strategy

- Checklist cached per application in DB (`DocumentChecklist`), returns if status ready (`document-checklist.service.ts:180-219`)
- Redis cache for configs (`cache.service.optimized.ts`)

## Rate Limits

- Chat: see `chat-rate-limit.ts`
- Checklist: see `checklist-rate-limit.ts`
- Document validation: `middleware/checklist-rate-limit.ts:149-155`

## Cost Controls

- AIUsageMetrics model (`prisma/schema.prisma:386-401`)
- Log interactions (`ai-openai.service.ts:96-118`)

## Error Handling

- Retry/backoff inside services (checklist engine and ai-openai)
- Fallback checklist on failure
- Empty history on chat errors instead of 500 (`routes/chat.ts:328-334`)

## Code References

- `apps/backend/src/services/ai-openai.service.ts`
- `apps/backend/src/services/visa-checklist-engine.service.ts`
- `apps/backend/src/services/document-validation.service.ts`
- `apps/backend/src/routes/chat.ts`
- `apps/ai-service/services/deepseek.py`


