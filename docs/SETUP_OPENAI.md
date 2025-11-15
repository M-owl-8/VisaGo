# 🤖 OpenAI API Setup Guide

**Service**: OpenAI GPT-4 API  
**Required For**: AI chat assistant (RAG system)  
**Difficulty**: Easy  
**Time**: 10-15 minutes

---

## 📋 Overview

OpenAI API powers the AI chat feature in VisaBuddy, providing intelligent responses about visa requirements and application processes.

---

## 🚀 Step-by-Step Setup

### Step 1: Create OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Click **"Sign up"** or **"Log in"**
3. Complete account creation:
   - Email verification
   - Phone verification (required for API access)

---

### Step 2: Add Payment Method

1. Go to **"Settings"** > **"Billing"**
2. Click **"Add payment method"**
3. Add your credit card or payment method
4. **Important**: Set up usage limits to prevent unexpected charges

---

### Step 3: Create API Key

1. Go to **"API Keys"** in the left menu
2. Click **"Create new secret key"**
3. Enter a name: `VisaBuddy Production` (or `VisaBuddy Development`)
4. Click **"Create secret key"**
5. **CRITICAL**: Copy the key immediately!
   - You won't be able to see it again
   - Format: `sk-...`

---

### Step 4: Set Usage Limits

**IMPORTANT**: Set limits to prevent unexpected costs!

1. Go to **"Settings"** > **"Limits"**
2. Set **"Hard limit"**: Recommended starting limit: `$50/month`
3. Set **"Soft limit"**: `$40/month` (you'll get a warning)
4. Enable **"Email notifications"** for limit warnings

**Usage Estimates**:
- Average chat message: ~$0.01-0.05
- 1000 messages/month: ~$10-50
- Adjust limits based on expected usage

---

### Step 5: Configure Environment Variables

Add to `apps/backend/.env`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**For AI Service** (`apps/ai-service/.env`):

```env
OPENAI_API_KEY=sk-your-api-key-here
AI_SERVICE_PORT=8001
RAG_MODEL=gpt-4
EMBEDDING_MODEL=text-embedding-3-small
MAX_TOKENS=2000
TEMPERATURE=0.7
```

**⚠️ IMPORTANT**:
- Never commit API keys to git
- Use different keys for development and production
- Rotate keys if exposed

---

## ✅ Verification

### Test the Setup:

1. **Start Backend**:
   ```bash
   cd apps/backend
   npm run dev
   ```
   Check console for: `✅ OpenAI Service initialized`

2. **Start AI Service**:
   ```bash
   cd apps/ai-service
   python -m uvicorn main:app --reload --port 8001
   ```
   Check for successful startup

3. **Test Chat**:
   - Send a test message through the chat endpoint
   - Verify you get a response
   - Check OpenAI dashboard for usage

---

## 🔧 Troubleshooting

### Error: "Invalid API key"

**Problem**: API key is incorrect or expired.

**Solution**:
1. Verify key starts with `sk-`
2. Check for extra spaces or characters
3. Regenerate key if needed
4. Ensure key is active in OpenAI dashboard

### Error: "Insufficient quota"

**Problem**: You've exceeded your usage limit or haven't added payment method.

**Solution**:
1. Check usage in OpenAI dashboard
2. Add payment method if not added
3. Increase limits if needed
4. Wait for monthly reset

### Error: "Rate limit exceeded"

**Problem**: Too many requests in a short time.

**Solution**:
1. Implement request throttling
2. Use caching for common queries
3. Upgrade to higher tier if needed
4. Check rate limits in dashboard

---

## 🚀 Production Setup

### Additional Steps for Production:

1. **Create Production API Key**:
   - Create separate key for production
   - Use different key than development
   - Name it clearly: `VisaBuddy Production`

2. **Set Production Limits**:
   - Set appropriate limits based on expected traffic
   - Enable email alerts
   - Monitor usage regularly

3. **Optimize Costs**:
   - Use `gpt-3.5-turbo` for simple queries (cheaper)
   - Use `gpt-4` for complex queries (more expensive)
   - Implement caching to reduce API calls
   - Set user rate limits (already implemented: 50 messages/day)

4. **Monitoring**:
   - Set up usage alerts
   - Monitor response times
   - Track costs per user
   - Review usage patterns monthly

---

## 💰 Pricing Information

**Current Pricing** (as of 2025):

- **GPT-4**:
  - Input: $0.03 per 1K tokens
  - Output: $0.06 per 1K tokens

- **GPT-3.5 Turbo**:
  - Input: $0.0015 per 1K tokens
  - Output: $0.002 per 1K tokens

- **Embeddings** (text-embedding-3-small):
  - $0.02 per 1M tokens

**Cost Optimization Tips**:
- Use GPT-3.5 for simple questions
- Cache common responses
- Limit message length
- Use embeddings for similarity search (cheaper than full GPT)

---

## 🔒 Security Best Practices

1. **Never Expose API Keys**:
   - Store in environment variables only
   - Never in code or git
   - Use secrets management in production

2. **Rotate Keys Regularly**:
   - Rotate every 90 days
   - Immediately if exposed
   - Use different keys per environment

3. **Monitor Usage**:
   - Set up alerts for unusual activity
   - Review usage logs regularly
   - Detect potential abuse

4. **Rate Limiting**:
   - Already implemented: 50 messages/day per user
   - Prevents abuse and controls costs

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Pricing Information](https://openai.com/pricing)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

---

## ✅ Checklist

- [ ] OpenAI account created
- [ ] Payment method added
- [ ] API key created
- [ ] Usage limits set
- [ ] API key added to backend .env
- [ ] API key added to ai-service .env
- [ ] Test chat works
- [ ] Production key created (if deploying)
- [ ] Monitoring alerts configured

---

## 🎯 Model Selection

**Recommended Models**:

- **GPT-4**: Best quality, higher cost
  - Use for: Complex visa questions, detailed explanations
  - Cost: ~$0.03-0.06 per 1K tokens

- **GPT-3.5 Turbo**: Good quality, lower cost
  - Use for: Simple questions, quick responses
  - Cost: ~$0.0015-0.002 per 1K tokens

- **Embeddings**: For similarity search
  - Use for: Finding relevant visa information
  - Cost: ~$0.02 per 1M tokens

**Current Configuration**: Uses GPT-4 for best quality. Consider adding model selection based on query complexity.

---

**Last Updated**: January 2025  
**Status**: ✅ Ready for use








