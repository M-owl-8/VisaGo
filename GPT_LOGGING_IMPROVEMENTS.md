# GPT Logging Improvements

## Summary

Improved logging for GPT interactions in checklist generation and document verification. All logs are now structured with applicationId for easy searching and aggregation.

## Changes Made

### 1. Structured Logging Utility

**File**: `apps/backend/src/utils/gpt-logging.ts`

Created a centralized logging utility that provides:

- **`logChecklistGeneration()`**: Structured logging for checklist generation
  - Logs: applicationId, country, countryCode, visaType, mode, JSON validation status, retries, item count, warnings, tokens, response time
  - Automatically uses appropriate log level (info/warn/error) based on context

- **`logDocumentVerification()`**: Structured logging for document verification
  - Logs: applicationId, documentId, documentType, country, countryCode, visaType, status, risk level, JSON validation status, retries, tokens, response time

- **`extractApplicationId()`**: Helper to extract applicationId from context

### 2. Checklist Generation Logging

**Updated Files**:

- `apps/backend/src/services/visa-checklist-engine.service.ts`
- `apps/backend/src/services/document-checklist.service.ts`

**What's Logged**:

- ✅ Country and countryCode
- ✅ VisaType
- ✅ Mode (rules/legacy/fallback)
- ✅ JSON validation passed on first try or required retry
- ✅ Number of checklist items
- ✅ Condition evaluation warnings (from rule evaluation)
- ✅ Rule evaluation warnings
- ✅ Token usage
- ✅ Response time
- ✅ ApplicationId (for easy searching)

**Example Log Entry**:

```json
{
  "applicationId": "app_123",
  "country": "Germany",
  "countryCode": "DE",
  "visaType": "tourist",
  "mode": "rules",
  "jsonValidation": {
    "passed": true,
    "retries": 0
  },
  "itemCount": 12,
  "tokensUsed": 1500,
  "responseTimeMs": 2300
}
```

### 3. Document Verification Logging

**Updated File**: `apps/backend/src/services/visa-doc-checker.service.ts`

**What's Logged**:

- ✅ ApplicationId
- ✅ DocumentId (if available)
- ✅ DocumentType
- ✅ Country and countryCode
- ✅ VisaType
- ✅ Status (APPROVED/NEED_FIX/REJECTED)
- ✅ Embassy risk level (LOW/MEDIUM/HIGH)
- ✅ JSON validation passed on first try or required retry
- ✅ Token usage
- ✅ Response time

**Example Log Entry**:

```json
{
  "applicationId": "app_123",
  "documentType": "bank_statement",
  "country": "Germany",
  "countryCode": "DE",
  "visaType": "tourist",
  "status": "APPROVED",
  "embassyRiskLevel": "LOW",
  "jsonValidation": {
    "passed": true,
    "retries": 0
  },
  "tokensUsed": 450,
  "responseTimeMs": 1200
}
```

### 4. Admin Statistics Endpoint

**File**: `apps/backend/src/routes/admin.ts`

**Endpoint**: `GET /api/admin/checklist-stats`

**Returns**:

- Statistics by country:
  - Total checklists generated
  - Count using rules mode
  - Count using legacy mode
  - Count using fallback mode
  - Percentage using fallback
  - Average item count per checklist
- Overall statistics:
  - Total checklists
  - Total by mode
  - Overall fallback percentage
  - Overall average items

**Response Format**:

```json
{
  "success": true,
  "data": {
    "byCountry": [
      {
        "country": "Germany",
        "countryCode": "DE",
        "total": 150,
        "rulesMode": 120,
        "legacyMode": 25,
        "fallbackMode": 5,
        "averageItems": 12.5,
        "fallbackPercentage": 3.3,
        "rulesPercentage": 80.0,
        "legacyPercentage": 16.7
      }
    ],
    "overall": {
      "totalChecklists": 500,
      "totalRulesMode": 400,
      "totalLegacyMode": 80,
      "totalFallbackMode": 20,
      "overallFallbackPercentage": 4.0,
      "overallAverageItems": 11.8
    },
    "period": {
      "from": "2024-01-01T00:00:00.000Z",
      "to": "2024-01-31T23:59:59.999Z",
      "days": 30
    }
  }
}
```

### 5. Admin Statistics Page

**File**: `apps/web/app/(dashboard)/admin/checklist-stats/page.tsx`

A simple admin page that displays:

- Overall statistics (total, by mode, percentages, average items)
- Statistics by country in a table format
- Refresh button to reload data

**Features**:

- Color-coded mode indicators (blue for rules, yellow for legacy, red for fallback)
- Percentage calculations
- Responsive table layout
- Error handling and loading states

## Log Search Examples

### Search by Application ID

```bash
# All logs for a specific application
grep "applicationId.*app_123" logs/*.log
```

### Search by Country

```bash
# All checklist generations for Germany
grep "countryCode.*DE" logs/*.log | grep "\[GPT\]\[Checklist\]"
```

### Search for Fallback Usage

```bash
# All fallback mode checklists
grep "mode.*fallback" logs/*.log
```

### Search for JSON Validation Issues

```bash
# All checklists that required retries
grep "retries.*[1-9]" logs/*.log
```

### Search for Document Verification

```bash
# All document verifications
grep "\[GPT\]\[DocVerification\]" logs/*.log
```

## Benefits

1. **Easy Debugging**: All logs include applicationId, making it easy to trace issues for specific applications
2. **Performance Monitoring**: Token usage and response time logged for cost and performance analysis
3. **Quality Metrics**: Track JSON validation retries, fallback usage, and mode distribution
4. **Country Analysis**: See which countries have higher fallback rates or different item counts
5. **Admin Dashboard**: Quick overview of system health and mode distribution

## Future Improvements

1. **Log Aggregation**: Store logs in a searchable database (e.g., Elasticsearch, PostgreSQL)
2. **Real-time Dashboard**: WebSocket updates for live statistics
3. **Alerting**: Alert when fallback percentage exceeds threshold
4. **Historical Trends**: Track statistics over time (daily/weekly/monthly)
5. **Export**: CSV/JSON export of statistics
6. **Filtering**: Filter statistics by date range, country, visa type
