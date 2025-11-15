# 🔧 Fix Authentication Issues

## Problems Identified:

1. **OpenAI API Key Error**: The key might be truncated or incorrectly formatted
2. **JWT Token Invalid**: Old token stored from previous session (before new JWT_SECRET)
3. **403/401 Errors**: Frontend using invalid tokens

## Solutions:

### Solution 1: Clear Old Tokens (Quick Fix)

**In your React Native app:**
1. Log out completely
2. Clear app data (or uninstall/reinstall)
3. Log back in with fresh credentials

**OR use this command to clear AsyncStorage:**

```bash
# In React Native Debugger or Metro console:
AsyncStorage.clear()
```

### Solution 2: Verify OpenAI API Key

The OpenAI key in `.env` might be incorrect. Let's verify:

1. Check `apps/ai-service/.env` - Make sure the key is on ONE line
2. Check `apps/backend/.env` - Make sure the key matches
3. The key should start with `sk-proj-` and be very long

### Solution 3: Regenerate JWT Secret (If needed)

If tokens still don't work, we might need to regenerate JWT_SECRET.

---

## Quick Fix Steps:

1. **Stop all running services** (Ctrl+C)
2. **Clear frontend storage** (uninstall app or clear data)
3. **Verify OpenAI key** in both .env files
4. **Restart backend and AI service**
5. **Reinstall/restart frontend app**
6. **Log in again** with fresh credentials

---

## Verify OpenAI Key Format:

The key should look like:
```
OPENAI_API_KEY=sk-proj-...your-actual-key-here...
```

**Important:**
- No quotes around the key
- No spaces
- All on one line
- Starts with `sk-proj-`

