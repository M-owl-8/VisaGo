# Document Verification System

## Overview

The document verification system uses GPT-4 to automatically validate uploaded documents against visa application requirements. Documents are processed asynchronously in a background queue, and users receive clear feedback about document correctness.

## Document Lifecycle

```
1. User Uploads Document
   ↓
2. POST /api/documents/upload
   - File stored (Firebase or local)
   - UserDocument record created (status: 'pending')
   - Job enqueued to Bull queue
   ↓
3. Background Queue Processing
   - DocumentProcessingQueueService processes job
   - OCR text extraction (if available)
   - AI validation called
   ↓
4. AI Validation
   - VisaDocCheckerService (if VisaRuleSet exists)
   - OR unified GPT-4 validation (fallback)
   - Returns DocumentValidationResultAI
   ↓
5. Database Update
   - saveValidationResultToDocument() called
   - Status mapped: verified/rejected/pending
   - Verification notes generated
   - UserDocument updated
   ↓
6. UI Display
   - Web/Mobile apps poll or refresh
   - Status badge shown
   - Explanation displayed (if rejected)
```

## Status Meanings

### `pending`

- **Meaning**: Document is waiting for AI to process, or AI was uncertain
- **User sees**: Yellow/neutral "Pending" badge
- **verifiedByAI**: `false`
- **When**:
  - Document just uploaded (not yet processed)
  - AI returned `'uncertain'` status
  - AI validation failed or returned unexpected status

### `verified`

- **Meaning**: Document is correct and meets requirements
- **User sees**: Green "Verified" badge (or "Verified by AI ✅" if `aiVerified === true`)
- **verifiedByAI**: `true`
- **When**: AI returned `'verified'` status

### `rejected`

- **Meaning**: Document has issues and needs to be fixed
- **User sees**: Red "Needs fix" badge + explanation box
- **verifiedByAI**: `true`
- **When**: AI returned `'rejected'` or `'needs_review'` status
- **Explanation**: Shows numbered list of problems or English notes

## Status Mapping Logic

The `mapAIStatusToDbStatus()` function maps AI status to database status:

| AI Status        | DB Status    | verifiedByAI |
| ---------------- | ------------ | ------------ |
| `'verified'`     | `'verified'` | `true`       |
| `'rejected'`     | `'rejected'` | `true`       |
| `'needs_review'` | `'rejected'` | `true`       |
| `'uncertain'`    | `'pending'`  | `false`      |
| `undefined`      | `'pending'`  | `false`      |

## Verification Notes Generation

The `buildVerificationNotes()` function generates user-facing explanations:

1. **If problems exist**: Creates numbered list using `userMessage` (fallback to `message`)
   - Example: `"1) The document needs a signature. 2) The date format is incorrect."`

2. **If no problems but English notes exist**: Returns trimmed `notes.en`

3. **Otherwise**: Returns `null`

The generated notes are stored in `UserDocument.verificationNotes` and displayed in the UI for rejected documents.

## Key Functions

### `mapAIStatusToDbStatus(aiStatus)`

Maps AI validation status to database status. Handles `undefined` and unexpected values safely.

### `buildVerificationNotes(result)`

Generates human-readable explanation from AI validation result. Null-safe, handles missing fields.

### `saveValidationResultToDocument(documentId, validationResult)`

Saves AI validation result to database. Ensures:

- Status is always one of: `'pending' | 'verified' | 'rejected'`
- All fields are null-safe
- Errors are logged and re-thrown

## Database Schema

### UserDocument Fields

- `status`: `'pending' | 'verified' | 'rejected'`
- `verifiedByAI`: `boolean` - `true` when AI has made a decision
- `aiConfidence`: `number | null` - AI confidence score (0-1)
- `aiNotesUz`: `string | null` - Uzbek notes from AI
- `aiNotesRu`: `string | null` - Russian notes from AI
- `aiNotesEn`: `string | null` - English notes from AI
- `verificationNotes`: `string | null` - User-facing explanation (generated from problems or notes)

## API Endpoints

### POST /api/documents/upload

- Uploads document file
- Creates UserDocument record
- Enqueues background processing job
- Returns immediately (processing happens async)

### GET /api/documents/application/:applicationId

- Returns all documents for an application
- Includes status, verificationNotes, aiConfidence, etc.

## Testing

Unit tests are located in `src/__tests__/services/document-validation.service.test.ts`:

- Tests for `mapAIStatusToDbStatus()` - all status mappings
- Tests for `buildVerificationNotes()` - problems, notes, edge cases
- Tests for `saveValidationResultToDocument()` - database persistence

Run tests:

```bash
npm test -- document-validation.service.test.ts
```

## Error Handling

- **OCR extraction failures**: Logged as warnings, validation continues without text
- **AI validation failures**: Document status remains `'pending'`, `verifiedByAI = false`
- **Database update failures**: Error logged and re-thrown (queue will retry)

## AIInteraction / latencyMs Migration

The `AIInteraction` table stores logs of all GPT-4 API calls for analytics and debugging. The `latencyMs` column was added in migration `20251209151448_add_ai_interaction_model`.

### Migration Status

To check if migrations have been applied:

```bash
cd apps/backend
npx prisma migrate status
```

### Deploying Migrations

**For Production (Railway):**

Migrations should run automatically via `startup.js` on service start. If they don't, run manually:

```bash
# From Railway CLI or SSH
railway run --service backend npx prisma migrate deploy
```

**For Local Development:**

```bash
cd apps/backend
npx prisma migrate deploy
```

Or use the helper script:

```bash
npm run deploy:migrations
```

### Troubleshooting

If you see errors like `"The column 'latencyMs' does not exist in the current database"`:

1. **Check migration status**: `npx prisma migrate status`
2. **Apply pending migrations**: `npx prisma migrate deploy`
3. **Verify column exists**:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'AIInteraction' AND column_name = 'latencyMs';
   ```

### AI Interaction Logging

The `AIOpenAIService.recordAIInteraction()` method is **non-fatal**:

- If logging fails (e.g., missing column), it logs a warning but does not throw
- Document verification continues normally even if AI interaction logging fails
- This ensures production stability while migrations are being applied

## Future Improvements

- Real-time status updates via WebSocket
- Retry mechanism for failed verifications
- Caching of extracted OCR text
- Analytics dashboard for verification metrics
