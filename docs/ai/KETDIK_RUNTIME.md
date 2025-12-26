# Ketdik (DeepSeek-R1 fine-tune) Runtime Guide

## Responsibility

- ONLY answers “how/where to obtain or prepare” documents in Uzbekistan.
- Refuses approval chances, eligibility/risk, and checklist/requirements questions.
- If unsure, tells the user to check official embassy/VFS/government sources and what to search for.

## Routing Rules

- Intent classifier (`isKetdikInstructionIntent`) chooses Ketdik for obtain/prepare/notarize/translate/bank statement/sponsor/police clearance/employment letter/insurance/kadastr queries.
- Disallowed intents (approval, eligibility, checklist) bypass Ketdik.
- Route: `POST /api/assistant/ketdik` (auth + chat rate limit).
- Chat orchestrator also routes Ketdik when intent matches.

## Env Vars

- `TOGETHER_API_KEY` (required for Ketdik)
- `TOGETHER_BASE_URL` default `https://api.together.ai/v1`
- `KETDIK_MODEL_ID` default `murodbekshamsid_9585/DeepSeek-R1-ketdik-r1-v1-9cf6dce1`
- `KETDIK_TIMEOUT_MS` default `20000`

## Client

- Endpoint: `{TOGETHER_BASE_URL}/chat/completions`
- Model: `KETDIK_MODEL_ID`
- Temp: `0.3`, Max tokens: `700`, Timeout: `20s`, Retry: 1 on 5xx/timeout.

## Guardrails

- Response validator blocks approval promises, checklists, and risky embassy claims without official-source cues.
- If unsafe or Together fails: fallback to OpenAI (gpt-4o-mini) with the same scoped prompt.

## Curl Examples

```bash
curl -X POST https://api.example.com/api/assistant/ketdik \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I get a bank statement in Tashkent?",
    "country": "ES",
    "visaType": "tourist",
    "language": "en"
  }'
```

## Troubleshooting

- 401: missing/invalid auth token.
- 400: intent not a document-instruction question.
- 500: Together failure; check `TOGETHER_API_KEY`, network, or `KETDIK_MODEL_ID`.
- Slow/timeout: adjust `KETDIK_TIMEOUT_MS`, verify Together status.

## Verification Checklist

- [ ] `POST /api/assistant/ketdik` returns instruction-style answer.
- [ ] Non-instruction questions are rejected or routed away.
- [ ] Fallback triggers when Together is disabled or returns unsafe content.
- [ ] Logs show Ketdik selection, latency, and fallback reasons.


