# Embassy Sync Pipeline Implementation - Phase 2 Complete

## Summary

The embassy sync pipeline has been fully implemented and enhanced. All components are working together to automatically fetch, extract, and store visa rules from embassy sources.

## Changes Made

### 1. Fixed `getSourcesNeedingFetch()` Method

**File:** `apps/backend/src/services/embassy-source.service.ts`

**Problem:** The method was using a hardcoded 24-hour check instead of respecting each source's `fetchInterval`.

**Solution:**

- Now fetches all active sources first
- Filters sources based on their individual `fetchInterval` (in seconds)
- Properly checks if `lastFetchedAt` is NULL or older than `fetchInterval`
- Also includes sources with `lastStatus = 'failed'` for retry

**Key Changes:**

- Added `fetchInterval` to the return type
- Implemented per-source interval checking
- Enhanced logging to show total vs needing fetch counts

### 2. Enhanced Job Processor Error Handling

**File:** `apps/backend/src/services/embassy-sync-job.service.ts`

**Problem:** Error handling was too generic, making debugging difficult.

**Solution:**

- Added granular error handling for each step (crawl, AI extraction, database save)
- Each step now has its own try-catch with specific error messages
- Enhanced logging at each step with relevant metrics
- Error messages are now more descriptive (e.g., "Failed to crawl URL: ..." vs generic error)
- Added job duration tracking
- Error messages are truncated to 1000 chars to prevent database issues

**Key Changes:**

- Step-by-step logging with progress indicators
- Specific error messages for each failure point
- Better error context (job ID, attempt number, duration)
- Graceful handling of previous rules fetch failure (doesn't fail the job)

### 3. Enhanced Admin Routes for Visa Rules

**File:** `apps/backend/src/routes/admin.ts`

**Problem:** Admin routes returned raw database data without summary fields needed for admin panel.

**Solution:**

- `GET /api/admin/visa-rules` now returns formatted data with summary fields:
  - `requiredDocumentsCount`
  - `hasFinancialRequirements`
  - `hasProcessingInfo`
  - `hasFees`
- `GET /api/admin/visa-rules/:id` now returns:
  - Full rule set data
  - Summary fields
  - Formatted version history
  - Source information
  - Extraction metadata

**Key Changes:**

- Added summary extraction logic
- Properly handles both SQLite (string) and PostgreSQL (JSON) data types
- Returns admin-friendly formatted responses

### 4. Queue Processing in Production

**File:** `apps/backend/src/index.ts`

**Status:** ✅ Already properly configured

The queue is initialized during server startup:

- Queue is initialized via `EmbassySyncJobService.initialize()`
- Scheduler starts automatically if `ENABLE_EMBASSY_SYNC !== 'false'`
- Default cron: `0 2 * * *` (daily at 2 AM UTC)
- Queue processor runs in the same process as the backend

## How It Works

### Manual Trigger Flow

1. **Admin calls:** `POST /api/admin/embassy-sync/trigger`
2. **Scheduler calls:** `EmbassySyncSchedulerService.triggerManualSync()`
3. **Service calls:** `EmbassySyncJobService.enqueueAllPendingSyncs()`
4. **Source service:** `EmbassySourceService.getSourcesNeedingFetch()` finds sources due for refresh
5. **Jobs enqueued:** One job per source added to Bull queue
6. **Queue processor:** Processes each job:
   - Updates source status to "pending"
   - Fetches HTML from embassy URL
   - Extracts visa rules using GPT-4
   - Saves VisaRuleSet + VisaRuleVersion
   - Updates source status to "success" or "failed"

### Automatic Scheduled Sync

- Runs daily at 2 AM UTC (configurable via `EMBASSY_SYNC_CRON`)
- Same flow as manual trigger
- Can be disabled by setting `ENABLE_EMBASSY_SYNC=false`

## API Endpoints

### Embassy Sources

- `GET /api/admin/embassy-sources` - List all sources
- `POST /api/admin/embassy-sources` - Add new source
- `POST /api/admin/embassy-sources/:id/sync` - Trigger sync for specific source

### Sync Control

- `POST /api/admin/embassy-sync/trigger` - Manually trigger sync for all pending sources
- `GET /api/admin/embassy-sync/queue-stats` - Get queue statistics (waiting, active, completed, failed)

### Visa Rules

- `GET /api/admin/visa-rules` - List rule sets (with summary fields)
- `GET /api/admin/visa-rules/:id` - Get rule set details (with summary fields)
- `POST /api/admin/visa-rules/:id/approve` - Approve a rule set
- `POST /api/admin/visa-rules/:id/reject` - Reject a rule set
- `GET /api/admin/visa-rules/:id1/compare/:id2` - Compare two rule sets

## Database Models

### EmbassySource

- `id`, `countryCode`, `visaType`, `url`
- `fetchInterval` (seconds, default: 86400 = 24 hours)
- `lastFetchedAt`, `lastStatus`, `lastError`
- `isActive`, `priority`, `metadata`

### VisaRuleSet

- `id`, `countryCode`, `visaType`, `version`
- `data` (JSON: VisaRuleSetData)
- `isApproved`, `approvedAt`, `approvedBy`
- `sourceId`, `sourceSummary`, `extractionMetadata`

### VisaRuleVersion

- `id`, `ruleSetId`, `version`
- `data` (JSON snapshot)
- `changeLog`, `createdAt`

## Error Handling

All errors are:

1. Logged with full context (sourceId, countryCode, visaType, url, jobId, attempt)
2. Stored in `EmbassySource.lastError` (truncated to 1000 chars)
3. Source status updated to "failed"
4. Job retries up to 3 times with exponential backoff

## Logging

Enhanced logging includes:

- Job start/end with duration
- Each step progress (Step 1-6)
- Metrics (tokens used, confidence, extraction time)
- Error context (stack traces, attempt numbers)
- Queue statistics

## Testing

To test the pipeline:

1. **Seed embassy sources:**

   ```bash
   npm run seed:embassy-sources
   ```

2. **Trigger manual sync:**

   ```bash
   curl -X POST https://your-backend.com/api/admin/embassy-sync/trigger \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. **Check queue stats:**

   ```bash
   curl https://your-backend.com/api/admin/embassy-sync/queue-stats \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

4. **View visa rules:**
   ```bash
   curl https://your-backend.com/api/admin/visa-rules \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

## Production Considerations

1. **Redis Required:** Queue uses Redis (Bull). Ensure `REDIS_URL` is set.
2. **OpenAI API Key:** Required for AI extraction. Ensure `OPENAI_API_KEY` is set.
3. **Rate Limiting:** Consider rate limiting embassy URL fetches to avoid being blocked.
4. **Monitoring:** Monitor queue stats and failed jobs regularly.
5. **Error Alerts:** Set up alerts for high failure rates or stuck jobs.

## Future Enhancements

- [ ] Add webhook notifications when rule sets are updated
- [ ] Add admin UI for viewing and approving rule sets
- [ ] Add diff visualization for rule set changes
- [ ] Add retry logic for specific error types (network vs. parsing)
- [ ] Add metrics dashboard for sync success rates
- [ ] Add support for multiple embassy sources per country/visa type
