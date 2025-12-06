# Embassy Rules Sync Pipeline - Implementation Summary

## ✅ Implementation Complete

All components of the Embassy Rules Sync Pipeline have been successfully implemented.

## 📋 What Was Implemented

### 1. Database Models (Prisma)

✅ **EmbassySource** - Stores embassy/consulate URLs to crawl

- Fields: countryCode, visaType, url, isActive, lastFetchedAt, lastStatus, lastError, fetchInterval, priority, metadata
- Indexes: countryCode+visaType, isActive, lastFetchedAt, priority

✅ **VisaRuleSet** - Stores structured visa rules extracted by GPT-4

- Fields: countryCode, visaType, data (Json/String), version, isApproved, approvedAt, approvedBy, sourceId, extractionMetadata
- Indexes: countryCode+visaType, isApproved, createdAt, version
- **Note**: Uses Json for PostgreSQL, String for SQLite (handled automatically)

✅ **VisaRuleVersion** - Version history for rule sets

- Fields: ruleSetId, data (Json/String), version, changeLog
- Indexes: ruleSetId, version, createdAt

### 2. Services

✅ **visa-rules.service.ts** - Manages rule sets

- `getActiveRuleSet()` - Get latest approved rule set
- `getLatestRuleSet()` - Get latest (approved or pending)
- `createOrUpdateRuleSetFromAI()` - Create new rule set from GPT-4 extraction
- `approveRuleSet()` - Admin approval
- `rejectRuleSet()` - Admin rejection
- `listRuleSets()` - List with filtering
- `getRuleSetById()` - Get by ID
- `compareRuleSets()` - Compare two rule sets

✅ **embassy-source.service.ts** - Manages embassy sources

- `listSources()` - List with filtering
- `getSourceById()` - Get by ID
- `addSource()` - Add new source
- `updateSourceStatus()` - Update fetch status
- `getSourcesNeedingFetch()` - Get sources that need to be fetched
- `deleteSource()` - Soft delete (set isActive = false)
- `updateSource()` - Update source metadata

✅ **embassy-crawler.service.ts** - Fetches and cleans HTML

- `crawlSource()` - Fetch URL with retry logic (3 attempts)
- HTML cleaning: removes scripts, styles, nav, headers, footers, ads
- Extracts main content area
- Timeout: 30 seconds
- Returns: { url, html, cleanedText, title, metadata }

✅ **ai-embassy-extractor.service.ts** - GPT-4 extraction

- `extractVisaRulesFromPage()` - Main extraction function
- Uses GPT-4o-mini with structured JSON output
- JSON schema validation using Zod
- Automatic fixing of common issues
- Confidence scoring
- Returns: { ruleSet, metadata }

✅ **embassy-sync-job.service.ts** - Bull queue job

- Processes sync jobs for each source
- Orchestrates: crawl → extract → validate → store
- Retry logic: 3 attempts with exponential backoff
- Updates source status (pending → success/failed)

✅ **embassy-sync-scheduler.service.ts** - Cron scheduler

- Default: Daily at 2 AM UTC (configurable)
- Enqueues sync jobs for all sources needing fetch
- Manual trigger support

### 3. Integration

✅ **checklist-rules.service.ts** - Updated to use VisaRuleSet

- `buildBaseChecklistFromRules()` - Builds checklist from rule set
- `getRuleSetForChecklist()` - Wrapper for VisaRulesService
- Conditional documents based on user context
- Risk-based documents for high-risk applicants

✅ **visaDocumentRules.ts** - Updated to query database

- `findVisaDocumentRuleSet()` - Queries database instead of stub
- Converts VisaRuleSetData to internal format
- Returns null if no approved rule set exists

### 4. Admin Routes

✅ **GET /api/admin/visa-rules** - List rule sets
✅ **GET /api/admin/visa-rules/:id** - Get rule set by ID
✅ **POST /api/admin/visa-rules/:id/approve** - Approve rule set
✅ **POST /api/admin/visa-rules/:id/reject** - Reject rule set
✅ **GET /api/admin/visa-rules/:id1/compare/:id2** - Compare rule sets
✅ **GET /api/admin/embassy-sources** - List sources
✅ **POST /api/admin/embassy-sources** - Add source
✅ **POST /api/admin/embassy-sources/:id/sync** - Trigger sync for source
✅ **POST /api/admin/embassy-sync/trigger** - Trigger manual sync
✅ **GET /api/admin/embassy-sync/queue-stats** - Get queue statistics

### 5. Initialization

✅ **index.ts** - Server startup

- Initializes EmbassySyncJobService queue
- Starts EmbassySyncSchedulerService (if enabled)
- Graceful shutdown handlers

### 6. Dependencies

✅ **cheerio** - Added to package.json for HTML parsing
✅ **@types/cheerio** - TypeScript types

### 7. Documentation

✅ **docs/embassy-rules-pipeline.md** - Complete documentation

- Architecture overview
- Data flow
- API endpoints
- Usage examples
- Configuration
- Troubleshooting

## 🔧 Configuration

### Environment Variables

- `ENABLE_EMBASSY_SYNC` - Enable/disable automatic sync (default: true)
- `EMBASSY_SYNC_CRON` - Cron expression (default: "0 2 \* \* \*" - daily at 2 AM UTC)
- `OPENAI_API_KEY` - Required for GPT-4 extraction
- `REDIS_URL` - Required for Bull queue

## 🚀 Next Steps

### 1. Run Database Migration

```bash
cd apps/backend
npm run db:migrate:dev
# Or for production:
npm run db:migrate:deploy
```

### 2. Add Initial Embassy Sources

Use the admin API to add sources:

```bash
POST /api/admin/embassy-sources
{
  "countryCode": "US",
  "visaType": "student",
  "url": "https://uz.usembassy.gov/visas/student-visas/",
  "name": "US Embassy Tashkent - Student Visa",
  "priority": 10
}
```

### 3. Test Manual Sync

```bash
POST /api/admin/embassy-sync/trigger
```

### 4. Review and Approve Rule Sets

```bash
# List pending rule sets
GET /api/admin/visa-rules?isApproved=false

# Approve
POST /api/admin/visa-rules/:id/approve
```

## 📝 Important Notes

1. **SQLite Compatibility**: The service handles both Json (PostgreSQL) and String (SQLite) types automatically
2. **Approval Required**: Rule sets are unapproved by default and require admin approval before use
3. **Fallback**: If no approved rule set exists, the system falls back to `fallback-checklists.ts`
4. **Error Handling**: Failed extractions are logged and source status is updated
5. **Version History**: All rule set changes are tracked in `VisaRuleVersion`

## 🎯 How It Works

1. **Scheduler** triggers daily (or on cron schedule)
2. **Gets sources** that need fetching (never fetched, old fetch, or failed)
3. **Enqueues jobs** for each source
4. **For each job**:
   - Crawls embassy page (fetches HTML, cleans text)
   - Extracts rules using GPT-4 with JSON schema
   - Validates extracted JSON
   - Stores as unapproved VisaRuleSet
5. **Admin reviews** and approves rule sets
6. **Approved rule sets** are used by hybrid checklist engine

## 🔍 Testing

To test the pipeline:

1. Add a test source via admin API
2. Trigger manual sync: `POST /api/admin/embassy-sources/:id/sync`
3. Check queue stats: `GET /api/admin/embassy-sync/queue-stats`
4. Review extracted rule set: `GET /api/admin/visa-rules/:id`
5. Approve if correct: `POST /api/admin/visa-rules/:id/approve`
6. Verify checklist generation uses the new rule set

## ✨ Features

- ✅ Automated crawling and extraction
- ✅ JSON schema validation
- ✅ Admin approval workflow
- ✅ Version history
- ✅ Error handling and retry logic
- ✅ Queue monitoring
- ✅ Manual trigger support
- ✅ SQLite and PostgreSQL compatibility
- ✅ Comprehensive logging
