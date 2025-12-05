# Checklist Polling Implementation

## Summary

Implemented automatic polling for checklist generation to handle the async nature of checklist creation. The application workspace page now shows proper loading states instead of "Ro'yxat mavjud emas" (no list) when the checklist is still being generated.

## Problem

- After creating an application and triggering AI checklist generation, the workspace page initially showed "Ro'yxat mavjud emas" (no list)
- Checklist only appeared after manual page reload
- Backend logs showed checklist was generated successfully, but first GET request happened while status was still "in progress"

## Solution

Implemented polling logic that:

1. Detects when checklist is still processing
2. Automatically polls the checklist endpoint every 4 seconds
3. Shows clear loading states during polling
4. Stops polling when checklist is ready or after timeout (40 seconds)
5. Shows timeout warning if checklist takes too long

## Files Modified

### 1. `apps/web/lib/hooks/useApplication.ts`

**Changes:**

- Added polling configuration constants:
  - `CHECKLIST_POLL_INTERVAL`: 4000ms (4 seconds)
  - `CHECKLIST_MAX_POLL_ATTEMPTS`: 10 attempts
  - `CHECKLIST_POLL_TIMEOUT`: 40000ms (40 seconds)

- Added new state variables:
  - `isPollingChecklist`: Indicates if we're currently polling
  - `checklistPollTimeout`: Indicates if polling timed out

- Added `fetchChecklist()` function:
  - Fetches only the checklist (used during polling)
  - Returns `true` if checklist is ready, `false` if still processing
  - Handles API response parsing

- Added `startChecklistPolling()` function:
  - Starts polling interval (every 4 seconds)
  - Sets timeout to stop after 40 seconds
  - Stops polling when checklist is ready
  - Cleans up intervals/timeouts on unmount

- Updated `fetchApplication()`:
  - Detects when checklist is processing (status === 'processing' or items.length === 0)
  - Automatically starts polling if checklist is not ready
  - Sets placeholder checklist with processing status

- Added cleanup logic:
  - Clears intervals and timeouts on component unmount
  - Prevents memory leaks

**Polling Logic:**

```typescript
// Polling behavior:
// - Polls every 4 seconds while checklist status is 'processing' or items.length === 0
// - Stops polling when checklist status === 'ready' AND items.length > 0
// - Stops polling after 10 attempts or 40 seconds timeout
// - Sets checklistPollTimeout flag if polling times out
```

### 2. `apps/web/app/(dashboard)/applications/[id]/page.tsx`

**Changes:**

- Updated `useApplication` hook destructuring to include:
  - `isPollingChecklist`
  - `checklistPollTimeout`

- Added polling state UI:
  - **Loading state**: Shows spinner + message "Checklist is being prepared, this usually takes 10–20 seconds"
  - **Timeout state**: Shows warning message with refresh button if polling times out

- Updated checklist rendering:
  - Shows polling indicator while `isPollingChecklist === true`
  - Shows timeout warning if `checklistPollTimeout === true` and no items
  - Passes polling state to `DocumentChecklist` component

**UI States:**

1. **Loading (Polling)**: Spinner + "Checklist is being prepared, this usually takes 10–20 seconds"
2. **Ready**: Normal checklist rendering
3. **Timeout**: Warning message + refresh button

### 3. `apps/web/components/checklist/DocumentChecklist.tsx`

**Changes:**

- Added new props:
  - `isPolling?: boolean` - Indicates if we're polling
  - `pollTimeout?: boolean` - Indicates if polling timed out

- Updated empty state logic:
  - Only shows "Ro'yxat mavjud emas" if NOT polling and NOT timed out
  - Returns `null` if polling or timed out (parent handles the UI)

**Behavior:**

- If `items.length === 0` and `isPolling === true`: Returns `null` (parent shows loading)
- If `items.length === 0` and `pollTimeout === true`: Returns `null` (parent shows timeout warning)
- If `items.length === 0` and neither polling nor timeout: Shows empty state message

### 4. `apps/web/locales/en.json`, `apps/web/locales/uz.json`, `apps/web/locales/ru.json`

**Added translation keys:**

- `checklistGenerating`: "Checklist is being prepared, this usually takes 10–20 seconds"
- `checklistGeneratingSubtext`: "Please wait while we generate your personalized document list..."
- `checklistTimeout`: "Checklist generation is taking longer than usual"
- `checklistTimeoutSubtext`: "Please refresh after a minute or contact support if the issue persists."
- `refreshChecklist`: "Refresh Checklist"

## API Response Handling

The polling logic handles two response formats:

1. **Processing state** (from backend):

```json
{
  "success": true,
  "data": {
    "status": "processing",
    "items": []
  }
}
```

2. **Ready state** (from backend):

```json
{
  "success": true,
  "data": {
    "items": [...],
    "summary": {...},
    "progress": 0-100
  }
}
```

## Polling Flow

1. **Initial fetch**: `fetchApplication()` is called when component mounts
2. **Check status**: If checklist status is 'processing' or items.length === 0, start polling
3. **Poll loop**: Every 4 seconds, call `fetchChecklist()`
4. **Check ready**: If items.length > 0, stop polling and render checklist
5. **Timeout**: After 40 seconds or 10 attempts, stop polling and show timeout warning
6. **Cleanup**: Clear intervals/timeouts on unmount

## User Experience

### Before:

- User sees "Ro'yxat mavjud emas" immediately
- Must manually refresh to see checklist
- No indication that checklist is being generated

### After:

- User sees loading spinner with message "Checklist is being prepared..."
- Checklist automatically appears when ready (usually 10-20 seconds)
- If timeout occurs, user sees warning with refresh button
- No manual refresh needed in most cases

## Testing Recommendations

1. **Test normal flow**: Create application → should see loading → checklist appears automatically
2. **Test timeout**: Simulate slow generation → should see timeout warning after 40 seconds
3. **Test refresh**: Click refresh button after timeout → should restart polling
4. **Test cleanup**: Navigate away during polling → should not cause memory leaks

## Notes

- Polling stops automatically when checklist is ready
- No backend changes required - only frontend polling logic
- Polling is efficient (4 second intervals, max 10 attempts)
- All cleanup handled properly to prevent memory leaks
- Supports all three languages (EN/UZ/RU)
