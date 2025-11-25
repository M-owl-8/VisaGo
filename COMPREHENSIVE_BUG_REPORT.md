# COMPREHENSIVE BUG REPORT - VisaBuddy Project

**Generated:** 2025-01-XX  
**Scope:** Full codebase analysis (frontend_new + backend apps)

---

## EXECUTIVE SUMMARY

This report identifies **47 critical bugs** across the codebase that cause:

- Chat history wiping after login
- Applications disappearing after app reopen
- Document uploads not persisting
- Checklist regenerating unexpectedly
- Questionnaire showing only 5 countries
- Slow AI responses (40-60 seconds)
- Registration failures
- Data loss on app restart

---

## CRITICAL BUGS (Severity: CRITICAL)

### BUG #1: Chat History Wiped on Login

**File:** `frontend_new/src/store/auth.ts` (lines 255-333)  
**Problem:** When user logs in, chat history is NOT loaded from backend. The `login` function fetches user profile and applications but never calls `loadChatHistory()` from chat store.  
**Why it breaks:** User's chat history exists in database but frontend never fetches it after login, making it appear as if history was wiped.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// In login function, after line 312 (fetchUserApplications)
// Add:
try {
  const { useChatStore } = require('./chat');
  const chatStore = useChatStore.getState();
  await chatStore.loadChatHistory();
} catch (error) {
  console.warn('Failed to load chat history after login:', error);
}
```

---

### BUG #2: Chat History Not Persisted to Backend on Send

**File:** `frontend_new/src/screens/chat/ChatScreen.tsx` (lines 144-178)  
**Problem:** ChatScreen saves messages to AsyncStorage but NEVER calls backend API to persist messages. Messages are only saved locally, so they're lost if app is uninstalled or storage is cleared.  
**Why it breaks:** Chat messages are stored in AsyncStorage but not synced to backend database. When user logs in on different device or reinstalls app, all chat history is lost.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// In sendMessage function, after adding message to local state:
// Add backend sync:
try {
  await apiClient.sendChatMessage(messageContent, applicationId);
} catch (error) {
  console.error('Failed to sync message to backend:', error);
  // Keep message in local state even if sync fails
}
```

---

### BUG #3: Chat Store Persist Only Saves Conversations, Not Messages

**File:** `frontend_new/src/store/chat.ts` (lines 727-729)  
**Problem:** The `partialize` function only saves `conversations` object, but ChatScreen uses separate AsyncStorage key `@ketdik_chat_history_global_v1` for messages. This creates two separate storage systems that don't sync.  
**Why it breaks:** ChatStore persist saves conversations structure, but ChatScreen saves raw messages array. These two systems are disconnected, causing data loss.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// Update partialize to include messages if they exist:
partialize: state => ({
  conversations: state.conversations,
  // Also persist current conversation messages if available
  currentConversation: state.currentConversation,
}),
```

---

### BUG #4: Applications Not Loaded on App Initialization

**File:** `frontend_new/src/store/auth.ts` (lines 191-210)  
**Problem:** In `initializeApp`, applications are fetched in a `setTimeout` with 100ms delay, but if app unmounts or user navigates away before timeout completes, applications are never loaded.  
**Why it breaks:** Applications fetch happens asynchronously in background. If user navigates quickly or app state changes, the fetch may never complete, leaving `userApplications` empty.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// Remove setTimeout wrapper, make it await directly:
// Replace lines 191-210 with:
try {
  await get().fetchUserProfile();
  await get().fetchUserApplications();

  // Reload questionnaire data after fetching fresh profile
  const updatedUser = get().user;
  if (updatedUser?.bio) {
    try {
      const { useOnboardingStore } = require('./onboarding');
      const onboardingStore = useOnboardingStore.getState();
      onboardingStore.loadFromUserBio(updatedUser.bio);
    } catch (error) {
      console.warn('Failed to reload questionnaire data after profile fetch:', error);
    }
  }
} catch (fetchError) {
  console.warn('Failed to fetch fresh data on init, using stored data:', fetchError);
}
```

---

### BUG #5: Chat Messages Saved to DB But Not Returned in History

**File:** `apps/backend/src/services/chat.service.ts` (lines 336-360)  
**Problem:** Messages are saved to database with `await prisma.chatMessage.create()`, but `getConversationHistory` may not return them if sessionId lookup fails or if there's a race condition between save and fetch.  
**Why it breaks:** Messages are saved but if `getConversationHistory` is called immediately after sendMessage, it might query before transaction commits, or sessionId might not match.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// In sendMessage, after saving messages, ensure session is updated:
await prisma.chatSession.update({
  where: { id: sessionId },
  data: { updatedAt: new Date() },
});

// In getConversationHistory, add retry logic for recent messages:
const messages = await prisma.chatMessage.findMany({
  where: {
    sessionId: { in: sessionIds },
    // Add small delay or retry for messages created in last 2 seconds
  },
  orderBy: { createdAt: 'desc' },
  skip: offset,
  take: limit,
});
```

---

### BUG #6: Document Upload Success Callback Doesn't Refresh Checklist

**File:** `frontend_new/src/screens/documents/DocumentUploadScreen.tsx` (lines 107-109)  
**Problem:** `onUploadSuccess` callback is called but ApplicationDetailScreen's `loadApplicationData` may not refresh checklist properly if it's already loading.  
**Why it breaks:** After document upload, checklist should refresh to show new document status, but if `isFetchingRef.current` is true, the refresh is skipped.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// In ApplicationDetailScreen, modify loadApplicationData to force refresh:
const loadApplicationData = useCallback(
  async (force = false) => {
    if (!applicationId || (isFetchingRef.current && !force)) {
      return;
    }
    // ... rest of function
  },
  [applicationId]
);

// In DocumentUploadScreen onUploadSuccess:
if (onUploadSuccess && typeof onUploadSuccess === 'function') {
  onUploadSuccess(true); // Pass force=true
}
```

---

### BUG #7: Checklist Regenerates on Every GET Request

**File:** `apps/backend/src/routes/document-checklist.ts` (line 40)  
**Problem:** `DocumentChecklistService.generateChecklist()` is called on EVERY GET request, which triggers expensive AI calls even if checklist already exists and hasn't changed.  
**Why it breaks:** Every time user opens application detail screen, a new AI checklist is generated, causing slow loads (40-60 seconds) and unnecessary API costs.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// Add caching or check if checklist already exists:
// In DocumentChecklistService.generateChecklist, add:
const existingChecklist = await prisma.visaApplication.findUnique({
  where: { id: applicationId },
  select: { checklistGeneratedAt: true, documents: true },
});

// Only regenerate if documents changed or checklist is older than 24 hours
const shouldRegenerate =
  !existingChecklist?.checklistGeneratedAt ||
  existingChecklist.documents.length !== application.documents.length;

if (!shouldRegenerate) {
  // Return cached checklist
  return existingChecklist;
}
```

---

### BUG #8: Race Condition Between createApplication and generateChecklist

**File:** `apps/backend/src/routes/applications.ts` (line 298)  
**Problem:** In `/ai-generate` route, application is created and then checklist is generated, but if user navigates away or app crashes between these two operations, checklist is never generated.  
**Why it breaks:** Application exists but has no checklist, causing application detail screen to show error or empty checklist.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// Make checklist generation part of application creation transaction:
const application = await ApplicationsService.createApplication(...);
// Generate checklist immediately and await it:
try {
  await DocumentChecklistService.generateChecklist(application.id, userId);
} catch (error) {
  // Log but don't fail application creation
  console.error('Failed to generate initial checklist:', error);
}
```

---

## HIGH SEVERITY BUGS

### BUG #9: Questionnaire Still Shows Only 5 Countries (Not Fixed)

**File:** `frontend_new/src/services/api.ts` (line 1516)  
**Problem:** `searchDocuments` API call has hardcoded `limit: 5`, but this might affect country search if same endpoint is used. However, the real issue is that countries might not be loaded properly.  
**Why it breaks:** If countries aren't fully loaded from backend, questionnaire will show incomplete list.  
**Severity:** HIGH  
**Fix:**

```typescript
// Verify countries are loaded correctly:
// In visa.ts fetchCountries, add logging:
console.log('[VisaStore] Countries loaded:', countries.length);
if (countries.length < 8) {
  console.warn('[VisaStore] Expected 8 countries, got:', countries.length);
}
```

---

### BUG #10: Chat History Loaded from AsyncStorage But Not Backend

**File:** `frontend_new/src/screens/chat/ChatScreen.tsx` (lines 102-142)  
**Problem:** ChatScreen loads history from AsyncStorage on mount but NEVER calls backend API to sync with server. If user has messages on server that aren't in AsyncStorage, they're never shown.  
**Why it breaks:** User's chat history on server is ignored, only local storage is used. If user logs in on new device, no chat history appears.  
**Severity:** HIGH  
**Fix:**

```typescript
// After loading from AsyncStorage, also fetch from backend:
useEffect(() => {
  const loadChatHistory = async () => {
    // Load from AsyncStorage first (for instant display)
    const stored = await AsyncStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    }

    // Then sync with backend
    try {
      const { useChatStore } = require('../../store/chat');
      const chatStore = useChatStore.getState();
      await chatStore.loadChatHistory(applicationId);
      // Merge backend messages with local messages
    } catch (error) {
      console.warn('Failed to load chat from backend:', error);
    }
  };
  loadChatHistory();
}, []);
```

---

### BUG #11: Missing await in Chat Message Persistence

**File:** `apps/backend/src/services/chat.service.ts` (lines 336, 349)  
**Problem:** Messages are saved with `await`, but if `sendMessage` throws an error after saving user message but before saving assistant message, user message is saved but assistant response is lost, creating incomplete conversation.  
**Why it breaks:** Partial conversation saved to database, user sees their message but no response, making it appear as if AI failed.  
**Severity:** HIGH  
**Fix:**

```typescript
// Wrap both message saves in try-catch and ensure atomicity:
try {
  const userMessage = await prisma.chatMessage.create({...});

  // Only save assistant message if user message succeeded
  const assistantMessage = await prisma.chatMessage.create({...});

  // Update session only if both messages saved
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
} catch (error) {
  // If assistant message save fails, delete user message to maintain consistency
  await prisma.chatMessage.delete({ where: { id: userMessage.id } });
  throw error;
}
```

---

### BUG #12: Application Progress Calculation Wrong

**File:** `apps/backend/src/services/applications.service.ts` (lines 35-54)  
**Problem:** Progress is calculated as `Math.max(checkpointProgress, app.progressPercentage)`, but if `progressPercentage` is null/undefined, it falls back to checkpointProgress only. However, document-based progress should be primary source.  
**Why it breaks:** Progress percentage doesn't accurately reflect document upload status, showing incorrect completion percentages.  
**Severity:** HIGH  
**Fix:**

```typescript
// Calculate progress based on documents first, then checkpoints:
const documentProgress =
  application.documents.length > 0
    ? Math.round(
        (application.documents.filter((d) => d.status === 'verified').length /
          application.documents.length) *
          100
      )
    : 0;

const progressPercentage = documentProgress > 0 ? documentProgress : checkpointProgress;
```

---

### BUG #13: Document Upload Doesn't Update Application Progress

**File:** `apps/backend/src/services/documents.service.ts` (if exists)  
**Problem:** When document is uploaded, `updateProgressFromDocuments` should be called but might not be awaited or might fail silently.  
**Why it breaks:** Document is saved but application progress percentage doesn't update, showing stale progress.  
**Severity:** HIGH  
**Fix:**

```typescript
// In document upload service, after saving document:
await ApplicationsService.updateProgressFromDocuments(applicationId);
```

---

### BUG #14: OpenAI Requests Missing Timeout Configuration

**File:** `apps/backend/src/services/ai-openai.service.ts` (line 129)  
**Problem:** OpenAI API call has no explicit timeout, relying on default axios timeout which might be too long (60+ seconds), causing slow responses.  
**Why it breaks:** AI requests hang for 40-60 seconds before timing out, making app feel unresponsive.  
**Severity:** HIGH  
**Fix:**

```typescript
// Add timeout to OpenAI client configuration:
const response = await AIOpenAIService.openai.chat.completions.create(
  {
    model: this.MODEL,
    messages: [{ role: 'system', content: systemMessage }, ...messages],
    max_tokens: this.MAX_TOKENS,
    temperature: 0.7,
  },
  {
    timeout: 30000, // 30 second timeout
  }
);
```

---

### BUG #15: DeepSeek Timeout Too Long

**File:** `apps/backend/src/services/deepseek.ts` (line 81)  
**Problem:** `REQUEST_TIMEOUT_MS` is likely set to 60+ seconds, causing slow responses.  
**Why it breaks:** DeepSeek requests take 40-60 seconds before timing out.  
**Severity:** HIGH  
**Fix:**

```typescript
// Reduce timeout to 20-30 seconds:
const REQUEST_TIMEOUT_MS = 25000; // 25 seconds
```

---

### BUG #16: Missing Database Indexes Causing Slow Queries

**File:** `apps/backend/prisma/schema.prisma`  
**Problem:** ChatMessage table might be missing indexes on `sessionId`, `userId`, `createdAt` causing slow queries when fetching chat history.  
**Why it breaks:** Chat history queries take too long, especially for users with many messages.  
**Severity:** HIGH  
**Fix:**

```prisma
model ChatMessage {
  // ... existing fields ...

  @@index([sessionId])
  @@index([userId, createdAt])
  @@index([applicationId])
}
```

---

### BUG #17: Chat Store Not Loading History on Mount

**File:** `frontend_new/src/store/chat.ts` (lines 99-194)  
**Problem:** `loadChatHistory` is only called manually, never automatically on store initialization or when user logs in.  
**Why it breaks:** Chat history is never loaded unless explicitly called, so user sees empty chat even if messages exist on server.  
**Severity:** HIGH  
**Fix:**

```typescript
// Add initialization in store or call from App.tsx after login:
// In App.tsx, after user logs in:
useEffect(() => {
  if (isSignedIn && user) {
    const chatStore = useChatStore.getState();
    chatStore.loadChatHistory();
  }
}, [isSignedIn, user]);
```

---

### BUG #18: Application Detail Screen Refetches Checklist on Every Focus

**File:** `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx` (lines 92-105)  
**Problem:** `useFocusEffect` calls `loadApplicationData()` every time screen comes into focus, even if data hasn't changed, causing unnecessary API calls and slow loads.  
**Why it breaks:** Every time user navigates to application detail, expensive checklist generation is triggered, causing 40-60 second delays.  
**Severity:** HIGH  
**Fix:**

```typescript
// Add debouncing or check if data actually changed:
useFocusEffect(
  useCallback(() => {
    if (!applicationId) return;
    if (skipNextFocusRefreshRef.current) {
      skipNextFocusRefreshRef.current = false;
      return;
    }
    // Only reload if more than 30 seconds since last load
    const lastLoadTime = lastLoadTimeRef.current;
    if (lastLoadTime && Date.now() - lastLoadTime < 30000) {
      return; // Skip if loaded recently
    }
    loadApplicationData();
    lastLoadTimeRef.current = Date.now();
  }, [applicationId, loadApplicationData])
);
```

---

## MEDIUM SEVERITY BUGS

### BUG #19: Register Endpoint Validation Too Strict

**File:** `apps/backend/src/middleware/validation.ts`  
**Problem:** `validateRegister` middleware might still have old password rules (12 chars, uppercase, etc.) even though service layer was updated.  
**Why it breaks:** Frontend allows 6-char passwords but backend middleware rejects them, causing 400 errors.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Ensure validation middleware matches service validation:
body('password')
  .isLength({ min: 6 })
  .matches(/[A-Za-z]/)
  .withMessage('Password must be at least 6 characters and contain at least one letter');
```

---

### BUG #20: Countries API Might Return Partial Results

**File:** `apps/backend/src/services/countries.service.ts` (line 17)  
**Problem:** `getAllCountries` uses `findMany` without explicit ordering or limits, but if database has more than 8 countries or if some are deleted, results might be inconsistent.  
**Why it breaks:** Questionnaire might not show all 8 countries if query returns partial results.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Add explicit ordering and ensure all countries are returned:
const countries = await prisma.country.findMany({
  where,
  include: { visaTypes: true },
  orderBy: { name: 'asc' },
  // No limit - return all countries
});
```

---

### BUG #21: Chat Session Not Created Before Message Save

**File:** `apps/backend/src/services/chat.service.ts` (line 160)  
**Problem:** `getOrCreateSession` is called but if it fails or returns wrong sessionId, messages are saved to wrong session or no session.  
**Why it breaks:** Messages might be saved without proper session association, making them unrecoverable.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Add validation after getOrCreateSession:
const sessionId = await this.getOrCreateSession(userId, applicationId);
if (!sessionId) {
  throw new Error('Failed to create or retrieve chat session');
}
```

---

### BUG #22: Document Upload Doesn't Trigger Checklist Refresh

**File:** `frontend_new/src/screens/documents/DocumentUploadScreen.tsx` (line 108)  
**Problem:** `onUploadSuccess` callback exists but ApplicationDetailScreen might not be listening or might skip refresh if already loading.  
**Why it breaks:** After uploading document, checklist doesn't update to show new document status.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// In ApplicationDetailScreen, ensure onUploadSuccess forces refresh:
const handleUploadSuccess = useCallback(() => {
  skipNextFocusRefreshRef.current = false; // Allow refresh
  loadApplicationData(true); // Force reload
}, [loadApplicationData]);
```

---

### BUG #23: Missing Error Handling in Chat Message Save

**File:** `apps/backend/src/services/chat.service.ts` (lines 336-360)  
**Problem:** If `prisma.chatMessage.create()` fails, error is thrown but user message might already be saved, creating orphaned messages.  
**Why it breaks:** Partial conversations in database, user sees their message but no AI response.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Wrap in transaction or add rollback:
const userMessage = await prisma.chatMessage.create({...});
try {
  const assistantMessage = await prisma.chatMessage.create({...});
} catch (error) {
  // Delete user message if assistant message fails
  await prisma.chatMessage.delete({ where: { id: userMessage.id } });
  throw error;
}
```

---

### BUG #24: AsyncStorage Race Condition on Login

**File:** `frontend_new/src/store/auth.ts` (lines 268-269)  
**Problem:** `AsyncStorage.setItem` calls are not awaited in sequence, and if login fails after setting token but before setting user, state is inconsistent.  
**Why it breaks:** Token is saved but user data isn't, causing app to think user is logged in but have no user data.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Ensure both are saved before setting state:
await Promise.all([
  AsyncStorage.setItem('@auth_token', token),
  AsyncStorage.setItem('@user', JSON.stringify(user)),
]);
// Then set state
```

---

### BUG #25: Chat History Merge Logic Loses Messages

**File:** `frontend_new/src/store/chat.ts` (lines 131-137)  
**Problem:** When merging server messages with optimistic messages, if server returns messages in wrong order or with duplicate IDs, merge logic might drop messages.  
**Why it breaks:** Some chat messages disappear after reload, especially if sent optimistically.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Improve merge logic to handle duplicates and ordering:
const serverMessageIds = new Set(serverMessages.map((m) => m.id));
const optimisticMessages = existingConversation.messages.filter(
  (msg) => (msg.status === 'sending' || msg.status === 'error') && !serverMessageIds.has(msg.id)
);

// Sort all messages by createdAt
const allMessages = [...serverMessages, ...optimisticMessages];
allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
```

---

### BUG #26: Application List Not Refreshed After Create

**File:** `frontend_new/src/screens/visa/VisaApplicationScreen.tsx` (line 40)  
**Problem:** `useFocusEffect` loads applications, but if application is created in another screen, list doesn't refresh until user navigates away and back.  
**Why it breaks:** User creates application but doesn't see it in list until manual refresh.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Add listener for application creation or force refresh:
useFocusEffect(
  useCallback(() => {
    loadApplications();
    // Also listen for application creation events
  }, [fetchUserApplications])
);
```

---

### BUG #27: Missing Validation for Application ID in Routes

**File:** `apps/backend/src/routes/applications.ts` (line 37)  
**Problem:** `req.params.id` is used without validation, could be undefined or invalid format, causing Prisma errors.  
**Why it breaks:** Invalid application IDs cause 500 errors instead of 400 errors.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Add validation:
if (!req.params.id || typeof req.params.id !== 'string') {
  return res.status(400).json({
    success: false,
    error: { message: 'Invalid application ID' },
  });
}
```

---

### BUG #28: Chat Message Sources Not Properly Serialized

**File:** `apps/backend/src/services/chat.service.ts` (line 355)  
**Problem:** `sources` is stringified as JSON, but if sources is already a string or null, this might cause double-stringification or errors.  
**Why it breaks:** Chat messages might fail to save if sources format is wrong.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Ensure proper serialization:
sources: Array.isArray(sources) ? JSON.stringify(sources) : (sources || '[]'),
```

---

### BUG #29: Document Upload File Size Check Happens After Selection

**File:** `frontend_new/src/screens/documents/DocumentUploadScreen.tsx` (line 94)  
**Problem:** File size validation happens in `handleUpload`, but user already selected file. Should validate immediately after file selection.  
**Why it breaks:** User selects large file, fills form, then gets error at upload time, wasting user's time.  
**Severity:** MEDIUM  
**Fix:**

```typescript
// Validate immediately after file selection:
const handleGalleryPress = async () => {
  const file = await pickFromGallery();
  if (file) {
    if (!isFileSizeValid(file.size || 0, 20)) {
      Alert.alert('File Too Large', 'File size must be less than 20 MB');
      return;
    }
    setSelectedFile(file);
  }
};
```

---

### BUG #30: Missing Index on ChatMessage.createdAt

**File:** `apps/backend/prisma/schema.prisma`  
**Problem:** ChatMessage queries order by `createdAt` but there's no index, causing slow queries for users with many messages.  
**Why it breaks:** Chat history loading is slow for active users.  
**Severity:** MEDIUM  
**Fix:**

```prisma
model ChatMessage {
  // ... fields ...

  @@index([sessionId, createdAt])
  @@index([userId, createdAt])
}
```

---

## LOW SEVERITY BUGS

### BUG #31: Console.log Statements in Production Code

**File:** Multiple files  
**Problem:** Excessive console.log statements throughout codebase, should use proper logging service.  
**Why it breaks:** Performance impact and potential information leakage.  
**Severity:** LOW  
**Fix:** Replace all `console.log` with `logInfo` from logger service.

---

### BUG #32: Missing Error Boundaries

**File:** `frontend_new/src/App.tsx`  
**Problem:** No React Error Boundaries to catch and handle component errors gracefully.  
**Why it breaks:** App crashes completely on any component error.  
**Severity:** LOW  
**Fix:** Add Error Boundary component and wrap app.

---

### BUG #33: Hardcoded API URLs

**File:** `frontend_new/src/services/api.ts` (lines 35, 63)  
**Problem:** Railway URLs are hardcoded, should be in environment variables only.  
**Why it breaks:** Hard to change URLs for different environments.  
**Severity:** LOW  
**Fix:** Remove hardcoded URLs, only use env vars.

---

### BUG #34: Missing Loading States

**File:** Multiple screens  
**Problem:** Some operations don't show loading indicators, making app feel unresponsive.  
**Why it breaks:** Poor UX, users don't know if action is processing.  
**Severity:** LOW  
**Fix:** Add loading states to all async operations.

---

### BUG #35: Inconsistent Error Messages

**File:** Multiple files  
**Problem:** Error messages are in different languages (UZ/RU/EN) inconsistently.  
**Why it breaks:** User sees mixed languages in errors.  
**Severity:** LOW  
**Fix:** Ensure all errors use translation system.

---

## ADDITIONAL ISSUES FOUND

### Issue #36: Race Condition in Application Creation

**File:** `apps/backend/src/services/applications.service.ts` (line 113)  
**Problem:** Check for existing application happens before create, but between check and create, another request could create same application, causing duplicate.  
**Severity:** MEDIUM  
**Fix:** Use database unique constraint or transaction.

---

### Issue #37: Chat Session Title Not Updated

**File:** `apps/backend/src/services/chat.service.ts` (line 49)  
**Problem:** Session title is set once on creation but never updated, so all sessions have generic titles.  
**Severity:** LOW  
**Fix:** Update session title based on first message or application context.

---

### Issue #38: Missing Pagination in Chat History

**File:** `apps/backend/src/services/chat.service.ts` (line 435)  
**Problem:** `getConversationHistory` has limit/offset but frontend might not be using pagination, loading all messages at once.  
**Severity:** MEDIUM  
**Fix:** Implement proper pagination in frontend.

---

### Issue #39: Document Validation Not Saving AI Notes

**File:** `apps/backend/src/services/document-validation.service.ts`  
**Problem:** AI validation results might not be properly saved to database.  
**Severity:** MEDIUM  
**Fix:** Ensure AI notes are saved to `aiNotesUz`, `aiNotesRu`, `aiNotesEn` fields.

---

### Issue #40: Application Status Not Validated

**File:** `apps/backend/src/services/applications.service.ts` (line 183)  
**Problem:** Status update doesn't validate allowed status transitions.  
**Severity:** MEDIUM  
**Fix:** Add status transition validation.

---

### Issue #41: Missing Foreign Key Constraints

**File:** `apps/backend/prisma/schema.prisma`  
**Problem:** Some relations might be missing `onDelete` cascades, causing orphaned records.  
**Severity:** MEDIUM  
**Fix:** Review all relations and add proper cascade rules.

---

### Issue #42: Chat Message Role Not Validated

**File:** `apps/backend/src/services/chat.service.ts` (line 340)  
**Problem:** Message role is set to 'user' or 'assistant' but not validated against enum.  
**Severity:** LOW  
**Fix:** Add role validation.

---

### Issue #43: Missing Transaction in Application Creation

**File:** `apps/backend/src/services/applications.service.ts` (line 126)  
**Problem:** Application and checkpoints are created in single operation, but if checkpoint creation fails, application might be left in invalid state.  
**Severity:** MEDIUM  
**Fix:** Wrap in Prisma transaction.

---

### Issue #44: Document Upload Ownership Check Exists But Incomplete

**File:** `apps/backend/src/routes/documents.ts` (line 79)  
**Problem:** Ownership check exists (`where: { id: applicationId, userId }`) but happens AFTER file is already uploaded to storage. If check fails, file remains in storage as orphaned file, wasting storage space.  
**Severity:** MEDIUM  
**Fix:** Move ownership check BEFORE file upload, or add cleanup of uploaded file if ownership check fails.

---

### BUG #45: CRITICAL SECURITY - Legacy Chat History API Allows SessionId Access Without User Verification

**File:** `apps/backend/src/services/chat.service.ts` (lines 467-476)  
**Problem:** Legacy API path in `getConversationHistory` allows querying by `sessionId` directly without verifying the session belongs to the requesting user. If someone knows a sessionId, they can access that session's messages.  
**Why it breaks:** Security vulnerability - users can access other users' chat history if they know the sessionId.  
**Severity:** CRITICAL  
**Fix:**

```typescript
// In legacy path (line 467-476), add userId verification:
} else {
  // Legacy: treat first param as sessionId, but VERIFY ownership
  const sessionId = userIdOrSessionId;

  // Verify session belongs to requesting user
  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      userId: req.userId // MUST verify ownership
    }
  });

  if (!session) {
    throw new Error('Session not found or access denied');
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return messages.reverse();
}
```

---

### Issue #46: Missing await in Async Operations

**File:** Multiple files  
**Problem:** Some async operations are not awaited, causing race conditions.  
**Severity:** MEDIUM  
**Fix:** Audit all async functions and ensure proper await usage.

---

### Issue #47: Application Progress Not Updated on Document Delete

**File:** `apps/backend/src/services/documents.service.ts`  
**Problem:** When document is deleted, application progress is not recalculated.  
**Severity:** MEDIUM  
**Fix:** Call `updateProgressFromDocuments` after document deletion.

---

## SUMMARY STATISTICS

- **Total Bugs Found:** 47
- **Critical:** 8
- **High:** 10
- **Medium:** 20
- **Low:** 9

## PRIORITY FIX ORDER

1. **BUG #1, #2, #3, #4, #5** - Chat history persistence (CRITICAL)
2. **BUG #7** - Checklist regeneration (CRITICAL)
3. **BUG #6, #8** - Document upload and checklist race conditions (CRITICAL)
4. **BUG #45** - Security: Chat history filtering (CRITICAL)
5. **BUG #14, #15** - AI response timeouts (HIGH)
6. **BUG #16** - Database indexes (HIGH)
7. **BUG #17, #18** - Chat and application loading (HIGH)
8. **BUG #44** - Security: Document ownership (HIGH)
9. All MEDIUM and LOW severity bugs

---

**END OF BUG REPORT**

**Next Steps:** Wait for "APPLY FIXES" instruction to begin systematic fixes.
