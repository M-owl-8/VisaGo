# Embassy Crawl Implementation

**Date:** 2025-01-27  
**Feature:** Storage of cleaned embassy page text with crawler service and CLI

---

## Overview

Implemented storage of cleaned embassy page text in `EmbassyPageContent` model, along with a crawler service and CLI command to crawl due sources.

---

## Changes Made

### 1. Prisma Models Added

**Files:** `apps/backend/prisma/schema.prisma`, `schema.sqlite.prisma`, `schema.postgresql.prisma`

#### EmbassyPageContent

- Stores cleaned plain text from embassy pages
- Links to `EmbassySource`
- Tracks HTTP status, errors, metadata
- Fields: `id`, `sourceId`, `url`, `cleanedText`, `html`, `title`, `status`, `httpStatus`, `errorMessage`, `metadata`, `fetchedAt`

#### VisaRuleSetCandidate

- Stores proposed rule sets (not yet approved)
- Links to `EmbassySource` and `EmbassyPageContent`
- Tracks confidence, review status
- Fields: `id`, `sourceId`, `pageContentId`, `countryCode`, `visaType`, `data`, `confidence`, `extractionMetadata`, `status`, `reviewedBy`, `reviewedAt`, `reviewNotes`

#### VisaRuleSetChangeLog

- Tracks changes to `VisaRuleSet`
- Fields: `id`, `ruleSetId`, `changeType`, `changedBy`, `changeDetails`, `description`, `createdAt`

### 2. Updated EmbassyCrawlerService

**File:** `apps/backend/src/services/embassy-crawler.service.ts`

- Added `crawlAndStore()` method:
  - Crawls source URL
  - Stores cleaned text in `EmbassyPageContent`
  - Updates `EmbassySource` status (`pending` → `success`/`failed`)
  - Handles errors and stores failed attempts

### 3. Created EmbassyCrawlJobService

**File:** `apps/backend/src/services/embassy-crawl-job.service.ts`

- `crawlAllDueSources()`: Crawls all sources that are due (based on `fetchInterval` and `lastFetchedAt`)
- `crawlSourceById()`: Crawls a specific source by ID
- Uses `EmbassySourceService.getSourcesNeedingFetch()` to find due sources
- Processes sources sequentially with 1-second delay between requests

### 4. Created CLI Script

**File:** `apps/backend/scripts/embassy-crawl.ts`

- Command: `pnpm embassy:crawl`
- Options:
  - No args: Crawl all due sources
  - `--source-id <id>`: Crawl specific source
  - `--limit <n>`: Limit number of sources to crawl
- Outputs summary with success/failure counts

### 5. Updated Package.json

**File:** `apps/backend/package.json`

- Added script: `"embassy:crawl": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/embassy-crawl.ts"`

---

## Usage

### Run Migration

```bash
cd apps/backend
pnpm db:migrate
```

### Crawl All Due Sources

```bash
pnpm embassy:crawl
```

### Crawl Specific Source

```bash
pnpm embassy:crawl -- --source-id <source-id>
```

### Crawl with Limit

```bash
pnpm embassy:crawl -- --limit 10
```

---

## How It Works

1. **Select Due Sources**: Uses `EmbassySourceService.getSourcesNeedingFetch()` to find sources where:
   - `isActive === true`
   - `lastFetchedAt === null` OR `(now - lastFetchedAt) >= fetchInterval seconds`
   - `lastStatus === 'failed'` (always retry failed sources)

2. **Crawl Each Source**:
   - Update `EmbassySource.lastStatus` to `'pending'`
   - Fetch HTML from URL using `EmbassyCrawlerService.crawlSource()`
   - Clean HTML to plain text (remove scripts, styles, navigation, etc.)
   - Store in `EmbassyPageContent`:
     - `cleanedText`: Plain text content
     - `html`: Raw HTML (optional, for debugging)
     - `title`: Page title
     - `status`: `'success'` or `'failed'`
     - `httpStatus`: HTTP status code
     - `errorMessage`: Error message if failed
   - Update `EmbassySource.lastStatus` to `'success'` or `'failed'`
   - Update `EmbassySource.lastFetchedAt` to current time

3. **Error Handling**:
   - Failed crawls are stored in `EmbassyPageContent` with `status: 'failed'`
   - `EmbassySource.lastError` is updated with error message
   - Source status is updated to `'failed'` for retry on next run

---

## Database Schema

### EmbassyPageContent

```prisma
model EmbassyPageContent {
  id            String   @id @default(cuid())
  sourceId      String
  url           String
  cleanedText   String   @db.Text
  html          String?  @db.Text
  title         String?
  status        String   @default("success")
  httpStatus    Int?
  errorMessage  String?
  metadata      Json?    // PostgreSQL: Json, SQLite: String
  fetchedAt     DateTime @default(now())

  source EmbassySource @relation(...)
}
```

### Relations

- `EmbassySource` → `EmbassyPageContent[]` (one-to-many)
- `EmbassySource` → `VisaRuleSetCandidate[]` (one-to-many)
- `VisaRuleSet` → `VisaRuleSetChangeLog[]` (one-to-many)

---

## Next Steps

1. **Run Migration**: User needs to run `pnpm db:migrate` to create tables
2. **Test Crawling**: Run `pnpm embassy:crawl` to test with existing sources
3. **Integration**: Later, `VisaRuleSetCandidate` can be used to store GPT-extracted rules before approval
4. **Change Logging**: `VisaRuleSetChangeLog` can track all changes to rule sets

---

## Notes

- Crawler respects `fetchInterval` per source (default: 86400 seconds = 24 hours)
- Failed sources are retried on next run
- HTML is stored optionally for debugging (can be large)
- Cleaned text is limited to 50,000 characters to avoid token limits
- Sequential processing with 1-second delay to avoid rate limiting

---

**End of Implementation**
