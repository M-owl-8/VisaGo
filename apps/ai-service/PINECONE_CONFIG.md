# Pinecone Configuration Guide

## Step 1: Add to your `.env` file

Open `apps/ai-service/.env` and add these lines:

```env
# Pinecone Configuration
PINECONE_API_KEY=pcsk_5wZjKa_94AaqNHta1KST7Li3s5kfA6qMa6WWa8LKF5XVvE91MSafAjrgaPFEApKPeRfcrH
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=visabuddy-visa-kb

# Optional: OpenAI API Key (for embeddings)
# OPENAI_API_KEY=sk-your-key-here

# Service settings
PORT=8001
CORS_ORIGINS=http://localhost:3000,http://localhost:19006
LOG_LEVEL=INFO
RAG_ENABLED=true
USE_LOCAL_EMBEDDINGS_FALLBACK=true
```

## Step 2: Create Pinecone Index

You need to create an index in Pinecone dashboard:

1. Go to https://app.pinecone.io/
2. Click "Create Index"
3. Fill in:
   - **Name**: `visabuddy-visa-kb`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
   - **Cloud & Region**: AWS / us-east-1 (or your preferred region)
   - **Plan**: Starter (free tier)
4. Click "Create Index"

## Step 3: Verify Configuration

Run this command:

```bash
python setup-pinecone.py
```

This will verify the index exists and show stats.

## Step 4: Ingest Knowledge Base

Run the ingestion script to populate the index:

```bash
python ingest_rag.py
```

This will:
- Load visa knowledge base
- Generate embeddings
- Upload to Pinecone

## Step 5: Start AI Service

```bash
python main.py
```

You should see:
```
✅ Pinecone connected successfully
✅ RAG Service initialized with 27 documents
✅ VisaBuddy AI Service ready!
```

---

## Current Status

✅ Pinecone SDK installed (`pinecone-client==5.0.1`)
✅ API key provided
⏳ Need to: Add to `.env` file
⏳ Need to: Create index in Pinecone dashboard

---

## If You Want to Skip Pinecone (Optional)

The AI service works **without** Pinecone using local cache fallback. If you don't want to configure Pinecone:

1. Don't add `PINECONE_API_KEY` to `.env`
2. The service will use local `.cache/rag_cache.json` instead
3. It will show a warning but work perfectly fine

---

**Your choice:** Configure Pinecone for production-grade vector search, or skip it and use local cache (simpler, works great for development).




