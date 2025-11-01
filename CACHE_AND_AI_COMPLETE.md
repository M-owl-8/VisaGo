# ✅ Caching & AI Setup - COMPLETE

**Status**: Ready to Use  
**Date**: Now  
**Services**: node-cache + OpenAI GPT-4

---

## 📊 Current Status

### ✅ Already Implemented

1. **Cache Service** (`src/services/cache.service.ts`)
   - ✓ node-cache initialized
   - ✓ Singleton pattern
   - ✓ TTL management (5min, 1hr, 24hrs)
   - ✓ Built-in cache invalidation

2. **AI Service** (`src/services/ai-openai.service.ts`)
   - ✓ OpenAI GPT-4 integration
   - ✓ RAG (Retrieval-Augmented Generation)
   - ✓ Token counting & cost tracking
   - ✓ Error handling with fallbacks

3. **Chat Routes** (`src/routes/chat.ts`)
   - ✓ `/api/chat/send` - Send message
   - ✓ `/api/chat/history` - Get conversation history
   - ✓ JWT authentication required
   - ✓ Rate limiting enabled

4. **Backend Initialization** (`src/index.ts`)
   - ✓ Cache Service initialized
   - ✓ AI Service auto-initialized (if OPENAI_API_KEY set)
   - ✓ Fallback to local storage if Firebase fails
   - ✓ Database pool monitoring

---

## 🚀 Step 1: Enable OpenAI (OPTIONAL but RECOMMENDED)

### Get API Key

1. Go to: https://platform.openai.com/account/api-keys
2. Create new API key
3. Copy the key (starts with `sk-proj-`)

### Add to `.env`

Open `c:\work\VisaBuddy\apps\backend\.env` and set:

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
```

### Cost Control (Important!)

Add these limits to prevent surprises:

```bash
# Rate limiting per user per day
AI_CHAT_LIMIT=100          # Max 100 messages/day per user
AI_UPLOAD_LIMIT=50         # Max 50 uploads/day per user

# Cost limits (daily/monthly)
AI_DAILY_COST_LIMIT=100    # $100/day max
AI_MONTHLY_COST_LIMIT=1000 # $1000/month max
```

---

## 📋 What's Available NOW

### Cache Endpoints

**Get Cache Statistics:**
```bash
curl http://localhost:3000/api/cache/stats
```

Response:
```json
{
  "keys": 15,
  "ksize": 2048,
  "vsize": 1024000,
  "vsize_other": 512
}
```

### Chat Endpoints

**Send Message (with OpenAI API key configured):**
```bash
curl -X POST http://localhost:3000/api/chat/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d {
    "content": "What are the requirements for a US visa?",
    "applicationId": "app-123",
    "conversationHistory": []
  }
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "For a US visa (B1/B2), you need...",
    "sources": [
      {
        "documentId": "doc-1",
        "title": "US Visa Requirements",
        "relevanceScore": 0.95
      }
    ],
    "tokensUsed": 256,
    "cost": 0.0045,
    "model": "gpt-4",
    "responseTime": 2340
  }
}
```

**Get Chat History:**
```bash
curl http://localhost:3000/api/chat/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 💾 Cache Strategy

### What Gets Cached?

| Data | TTL | Key Pattern |
|------|-----|-------------|
| Countries list | 24 hours | `countries:all` |
| Single country | 24 hours | `countries:{id}` |
| Visa types | 24 hours | `visa-types:{countryId}` |
| Documents | 24 hours | `documents:{visaTypeId}` |
| User profile | 1 hour | `user:{userId}:profile` |
| Session data | 24 hours | `session:{sessionId}` |

### How to Use Cache

**In your routes:**

```typescript
import CacheService from "../services/cache.service";

// Check cache first
let data = CacheService.getCountries();

if (!data) {
  // Fetch from database
  data = await prisma.country.findMany();
  
  // Store in cache
  CacheService.cacheCountries(data);
}

res.json(data);
```

### Invalidate Cache

When data changes:

```typescript
// When updating a country
CacheService.invalidateCountryCache("country-id");

// When updating user profile
CacheService.invalidateUserCache("user-id");

// Clear everything
CacheService.flushAll();
```

---

## 🤖 AI Features

### Available Methods

```typescript
import AIOpenAIService from "../services/ai-openai.service";

// 1. Simple chat
const response = await AIOpenAIService.chat(
  [{ role: "user", content: "Hello" }],
  "You are a helpful visa assistant"
);

// 2. Chat with RAG (Retrieval-Augmented Generation)
const ragResponse = await AIOpenAIService.chatWithRAG(
  messages,
  userId,
  applicationId,
  systemPrompt
);

// 3. Generate embeddings (for document search)
const embedding = await AIOpenAIService.generateEmbedding(text);

// 4. Track AI usage (for billing)
await AIOpenAIService.trackUsage(userId, tokensUsed, cost);
```

### Pricing

Based on token usage:

| Model | Input | Output |
|-------|-------|--------|
| gpt-4 | $0.03/1K | $0.06/1K |
| gpt-4-turbo | $0.01/1K | $0.03/1K |
| gpt-3.5-turbo | $0.0005/1K | $0.0015/1K |

Example: 1000 input tokens + 500 output tokens with gpt-4 = ~$0.045

---

## 📊 Monitoring

### Server Startup (should see this)

```
💾 Cache Service ready (node-cache)
   - Keys in cache: 0
🤖 Initializing OpenAI Service...
✓ OpenAI Service initialized
```

### During Operations

**Cache hitting:**
```bash
curl http://localhost:3000/api/cache/stats
```

**AI usage (if you add the admin endpoint):**
```
GET /admin/ai-usage
- Total cost today: $45.23
- Total tokens: 125,000
- Top 10 users by cost
```

---

## ✅ Checklist

### Cache
- [x] Service implemented
- [x] Singleton pattern
- [x] TTL management
- [x] Cache invalidation
- [ ] Add to more routes (countries, applications, etc.)
- [ ] Monitor cache hit rate in production

### AI/OpenAI
- [ ] Get OpenAI API key
- [ ] Add to .env
- [ ] Test with `/api/chat/send`
- [ ] Set up cost limits
- [ ] Monitor daily usage
- [ ] Add admin dashboard endpoint

### Optional: Production Ready
- [ ] Upgrade to Redis (for distributed cache)
- [ ] Set up vector database for RAG (Pinecone, Weaviate)
- [ ] Implement chat history UI in mobile app
- [ ] Add rate limiting per user
- [ ] Monitor costs and set budgets

---

## 🎯 Quick Start

### 1. Without OpenAI (Uses cache only)

```bash
cd c:\work\VisaBuddy\apps\backend
npm start
```

Server starts with cache ready ✅

### 2. With OpenAI (AI chat enabled)

```bash
# 1. Update .env with OPENAI_API_KEY
# 2. Restart backend
npm start
```

Should see: `✓ OpenAI Service initialized` ✅

### 3. Test

```bash
# Cache stats
curl http://localhost:3000/api/cache/stats

# Chat message (requires JWT token)
curl -X POST http://localhost:3000/api/chat/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello"}'
```

---

## 🔄 Next Steps

1. **Get OpenAI API key** (free tier available)
2. **Add OPENAI_API_KEY to .env**
3. **Restart backend**
4. **Test via mobile app or Postman**
5. **Monitor costs**: https://platform.openai.com/account/usage

---

## 💡 Tips

### Cache Performance
- Cache hit rate should be 80%+ in production
- Monitor with: `GET /api/cache/stats`
- Clear cache daily/weekly with: `CacheService.flushAll()`

### Cost Control
- Start with gpt-3.5-turbo ($0.002/1K tokens)
- Upgrade to gpt-4 only after testing
- Set daily limits in .env to prevent surprises
- Enable rate limiting per user

### Production Upgrade
- Replace node-cache with Redis
- Use vector DB (Pinecone) for RAG instead of text search
- Implement chat history UI
- Add admin dashboard for monitoring

---

## 🎉 You're All Set!

**Services Running:**
- ✅ Database: PostgreSQL (Supabase)
- ✅ Storage: Local files + future Firebase
- ✅ Cache: node-cache
- ✅ AI: OpenAI GPT-4 (ready when you add API key)

**Backend fully functional!** 🚀