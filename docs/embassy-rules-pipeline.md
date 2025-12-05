# Embassy Rules Sync Pipeline

## Overview

The Embassy Rules Sync Pipeline is an automated system that continuously learns from official embassy/government websites to keep visa rules up to date. It uses GPT-4 to extract structured visa requirements from embassy pages and stores them in the database for use by the hybrid checklist generation system.

## Architecture

### Components

1. **EmbassySource** - Database model storing embassy/consulate URLs to crawl
2. **VisaRuleSet** - Database model storing structured visa rules extracted by GPT-4
3. **EmbassyCrawlerService** - Fetches and cleans HTML from embassy sources
4. **AIEmbassyExtractorService** - Uses GPT-4 to extract structured rules from page content
5. **EmbassySyncJobService** - Bull queue job that orchestrates the sync process
6. **EmbassySyncSchedulerService** - Cron scheduler that triggers syncs automatically
7. **VisaRulesService** - Manages rule sets (CRUD, approval, comparison)
8. **EmbassySourceService** - Manages embassy sources (CRUD, status tracking)

### Data Flow

```
1. Scheduler triggers (daily at 2 AM UTC by default)
   ↓
2. Get all active sources needing fetch
   ↓
3. Enqueue sync jobs for each source
   ↓
4. For each job:
   a. Crawl embassy page (fetch HTML, clean text)
   b. Extract rules using GPT-4 with JSON schema
   c. Validate extracted JSON
   d. Store as unapproved VisaRuleSet
   ↓
5. Admin reviews and approves rule sets
   ↓
6. Approved rule sets are used by hybrid checklist engine
```

## Database Models

### EmbassySource

Stores embassy/consulate URLs to crawl:

```prisma
model EmbassySource {
  id            String    @id @default(cuid())
  countryCode   String    // ISO 3166-1 alpha-2
  visaType      String    // "student" | "tourist" | "work"
  url           String    // Official embassy page URL
  name          String?   // Human-readable name
  isActive      Boolean   @default(true)
  lastFetchedAt DateTime?
  lastStatus    String?   // "success" | "failed" | "pending"
  lastError     String?
  fetchInterval Int       @default(86400) // 24 hours
  priority      Int       @default(0)
  metadata      String?   // JSON with selectors, headers, etc.
}
```

### VisaRuleSet

Stores structured visa rules extracted by GPT-4:

```prisma
model VisaRuleSet {
  id            String   @id @default(cuid())
  countryCode   String
  visaType      String
  data          Json     // Structured visa rules (VisaRuleSetData)
  version       Int      @default(1)
  createdBy     String   @default("system")
  sourceSummary String?
  isApproved    Boolean  @default(false) // Only approved sets are used
  approvedAt    DateTime?
  approvedBy    String?  // Admin user ID
  sourceId      String?  // Link to EmbassySource
  extractionMetadata Json? // GPT-4 extraction metadata
}
```

### VisaRuleVersion

Stores version history for rule sets:

```prisma
model VisaRuleVersion {
  id          String   @id @default(cuid())
  ruleSetId  String
  data       Json     // Snapshot of rule set
  version    Int
  changeLog  String?
  createdAt  DateTime @default(now())
}
```

## API Endpoints

### Admin Endpoints (require admin authentication)

#### Visa Rules Management

- `GET /api/admin/visa-rules` - List rule sets (filter by countryCode, visaType, isApproved)
- `GET /api/admin/visa-rules/:id` - Get rule set by ID
- `POST /api/admin/visa-rules/:id/approve` - Approve a rule set
- `POST /api/admin/visa-rules/:id/reject` - Reject a rule set (with reason)
- `GET /api/admin/visa-rules/:id1/compare/:id2` - Compare two rule sets

#### Embassy Sources Management

- `GET /api/admin/embassy-sources` - List sources (filter by countryCode, visaType, isActive)
- `POST /api/admin/embassy-sources` - Add a new source
- `POST /api/admin/embassy-sources/:id/sync` - Manually trigger sync for a source

#### Sync Control

- `POST /api/admin/embassy-sync/trigger` - Manually trigger sync for all pending sources
- `GET /api/admin/embassy-sync/queue-stats` - Get queue statistics

## Usage

### 1. Add Embassy Sources

```bash
POST /api/admin/embassy-sources
{
  "countryCode": "US",
  "visaType": "student",
  "url": "https://uz.usembassy.gov/visas/student-visas/",
  "name": "US Embassy Tashkent - Student Visa",
  "priority": 10,
  "fetchInterval": 86400
}
```

### 2. Automatic Sync

The scheduler runs daily at 2 AM UTC (configurable via `EMBASSY_SYNC_CRON` env var).

To disable automatic sync:
```bash
ENABLE_EMBASSY_SYNC=false
```

### 3. Manual Sync

```bash
POST /api/admin/embassy-sync/trigger
```

### 4. Review and Approve Rule Sets

```bash
# List pending rule sets
GET /api/admin/visa-rules?isApproved=false

# Compare with previous approved version
GET /api/admin/visa-rules/:newId/compare/:oldId

# Approve
POST /api/admin/visa-rules/:id/approve
```

## Integration with Checklist System

The hybrid checklist engine automatically uses approved rule sets:

1. `checklist-rules.service.ts` calls `VisaRulesService.getActiveRuleSet()`
2. If approved rule set exists → use it as base
3. GPT-4 enriches with names/descriptions (EN/UZ/RU)
4. If no approved rule set → fall back to `fallback-checklists.ts`

## JSON Schema

The extracted rule set must match this structure:

```typescript
{
  requiredDocuments: [
    {
      documentType: "passport",
      category: "required" | "highly_recommended" | "optional",
      description?: string,
      validityRequirements?: string,
      formatRequirements?: string
    }
  ],
  financialRequirements?: {
    minimumBalance?: number,
    currency?: string,
    bankStatementMonths?: number,
    sponsorRequirements?: {
      allowed: boolean,
      requiredDocuments?: string[]
    }
  },
  processingInfo?: {
    processingDays?: number,
    appointmentRequired?: boolean,
    interviewRequired?: boolean,
    biometricsRequired?: boolean
  },
  fees?: {
    visaFee?: number,
    serviceFee?: number,
    currency?: string,
    paymentMethods?: string[]
  },
  additionalRequirements?: {
    travelInsurance?: {
      required: boolean,
      minimumCoverage?: number,
      currency?: string
    },
    accommodationProof?: {
      required: boolean,
      types?: string[]
    },
    returnTicket?: {
      required: boolean,
      refundable?: boolean
    }
  }
}
```

## Safety & Validation

1. **JSON Schema Validation** - All GPT-4 responses are validated using Zod schema
2. **Approval Workflow** - Rule sets require admin approval before use
3. **Version History** - All changes are tracked in `VisaRuleVersion`
4. **Error Handling** - Failed extractions are logged and source status is updated
5. **Fallback** - If no approved rule set exists, system falls back to static checklists

## Configuration

### Environment Variables

- `ENABLE_EMBASSY_SYNC` - Enable/disable automatic sync (default: true)
- `EMBASSY_SYNC_CRON` - Cron expression for sync schedule (default: "0 2 * * *" - daily at 2 AM UTC)
- `OPENAI_API_KEY` - Required for GPT-4 extraction
- `REDIS_URL` - Required for Bull queue

### Example Cron Expressions

- `0 2 * * *` - Daily at 2 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight

## Monitoring

### Queue Statistics

```bash
GET /api/admin/embassy-sync/queue-stats
```

Returns:
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 100,
  "failed": 3,
  "total": 110
}
```

### Source Status

Check `EmbassySource.lastStatus` and `lastError` fields to monitor sync health.

## Troubleshooting

### Sync Jobs Failing

1. Check `EmbassySource.lastError` for error messages
2. Verify URL is accessible and returns HTML
3. Check GPT-4 API key and quota
4. Review logs for extraction errors

### Rule Sets Not Being Used

1. Verify rule set is approved (`isApproved = true`)
2. Check `countryCode` and `visaType` match exactly
3. Ensure only one approved rule set per country/visa type

### JSON Validation Errors

1. Check GPT-4 response in logs
2. Review extraction metadata for confidence scores
3. Manually fix and re-approve if needed

## Future Enhancements

1. **Multi-source aggregation** - Combine rules from multiple sources
2. **Change detection** - Alert when rules change significantly
3. **Confidence scoring** - Auto-approve high-confidence extractions
4. **Source health monitoring** - Track source reliability over time
5. **A/B testing** - Compare rule set versions in production







