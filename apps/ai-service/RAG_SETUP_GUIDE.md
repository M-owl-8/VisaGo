# RAG Pipeline Setup Guide

## Overview

The complete RAG (Retrieval-Augmented Generation) pipeline is now implemented with:

- ✅ **Document Chunking** - Splits documents into 500-token chunks with overlap
- ✅ **Embeddings Generation** - OpenAI API or local fallback
- ✅ **Pinecone Integration** - Vector database for semantic search
- ✅ **Fallback Caching** - Local in-memory cache when Pinecone unavailable
- ✅ **Knowledge Base Ingestion** - Automated document processing
- ✅ **Validation Suite** - 10+ test queries to verify accuracy
- ✅ **Diagnostics Endpoints** - Health checks and status monitoring

---

## Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
cd apps/ai-service
pip install -r requirements.txt
```

### Step 2: Configure Environment

Create `.env` file with:

```env
# OpenAI (for embeddings)
OPENAI_API_KEY=sk_your_key_here

# Pinecone (optional - if not set, uses cache only)
PINECONE_API_KEY=pcsk_your_key_here
PINECONE_INDEX_NAME=visabuddy-visa-kb
PINECONE_ENVIRONMENT=gcp-starter

# Other settings
CORS_ORIGINS=http://localhost:3000,http://localhost:8001
LOG_LEVEL=INFO
```

### Step 3: Run Ingestion Script

```bash
python ingest_rag.py
```

This will:
1. Load the knowledge base
2. Chunk all documents
3. Generate embeddings
4. Index in Pinecone (if available)
5. Populate fallback cache
6. Run validation suite (10 test queries)

### Step 4: Start the Service

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Step 5: Test the RAG System

```bash
# Check status
curl http://localhost:8001/api/rag/status

# Run validation
curl -X POST http://localhost:8001/api/rag/validate

# Get diagnostics
curl http://localhost:8001/api/rag/diagnostics

# Test search
curl "http://localhost:8001/api/chat/search?query=How%20much%20does%20a%20US%20visa%20cost"

# Test chat with RAG
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What documents do I need for a UK tourist visa?",
    "user_id": "test_user",
    "language": "en"
  }'
```

---

## Pinecone Setup (Optional but Recommended)

### Why Pinecone?

- **Faster retrieval** - Optimized vector database
- **Scalability** - Handles millions of vectors
- **Free tier** - Starter plan available
- **Managed** - No setup/maintenance

### Setup Steps

1. **Create Account**
   - Visit https://app.pinecone.io
   - Sign up (free tier available)

2. **Create Index**
   - Click "Create Index"
   - Settings:
     - **Name**: `visabuddy-visa-kb`
     - **Dimension**: `1536` (for OpenAI embeddings)
     - **Metric**: `cosine`
     - **Pod type**: `starter`

3. **Copy API Key**
   - Go to API Keys
   - Copy your API key
   - Add to `.env`:
     ```
     PINECONE_API_KEY=pcsk_xxxxx
     ```

4. **Test Connection**
   ```bash
   python ingest_rag.py
   ```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│                   FastAPI App                        │
│           (main.py, chat, search endpoints)         │
└─────────────┬───────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    v                    v
┌──────────────┐  ┌─────────────────┐
│  RAG Service │  │ Chat Service    │
│              │  │                 │
│ - retrieve   │  │ - responses     │
│ - validate   │  │ - history       │
└──────┬───────┘  └─────────────────┘
       │
    ┌──┴──────────────────────────────┐
    │                                  │
    v                                  v
┌──────────────────────┐    ┌────────────────────┐
│  Embeddings Service  │    │  Document Chunker  │
│                      │    │                    │
│ - OpenAI embeddings  │    │ - paragraph split  │
│ - local fallback     │    │ - token counting   │
└──────┬───────────────┘    └────────────────────┘
       │
    ┌──┴──────────────────────────────┐
    │                                  │
    v                                  v
┌──────────────────────┐    ┌────────────────────┐
│  Pinecone (Primary)  │    │  Cache (Fallback)  │
│                      │    │                    │
│ - vector database    │    │ - local JSON file  │
│ - semantic search    │    │ - cosine similarity│
└──────────────────────┘    └────────────────────┘
```

### Data Flow

1. **Ingestion Phase**
   ```
   visa_kb.json 
        ↓
   KB Ingestor (extract docs)
        ↓
   Document Chunker (500-token chunks)
        ↓
   Embeddings Service (generate vectors)
        ↓
   Pinecone ← upsert → Cache
   ```

2. **Query Phase**
   ```
   User Query
        ↓
   Embeddings Service (embed query)
        ↓
   Pinecone Query (if available)
        ↓
   Cache Search (if Pinecone fails)
        ↓
   Formatted Results + Sources
   ```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (for embeddings) |
| `PINECONE_API_KEY` | - | Pinecone API key |
| `PINECONE_INDEX_NAME` | `visabuddy-visa-kb` | Pinecone index name |
| `PINECONE_ENVIRONMENT` | `gcp-starter` | Pinecone environment |
| `RAG_ENABLED` | `true` | Enable/disable RAG system |
| `USE_LOCAL_EMBEDDINGS_FALLBACK` | `true` | Use local embeddings if OpenAI fails |
| `LOG_LEVEL` | `INFO` | Logging level |

### Chunking Parameters

Edit in `services/chunker.py`:

```python
# Default: 500 tokens per chunk with 100 token overlap
DocumentChunker(chunk_size=500, overlap=100)
```

### Caching Parameters

Edit in `services/cache_fallback.py`:

```python
# Cache file location
cache_file = ".cache/rag_cache.json"

# TTL settings (in LocalCache)
# Updates on every ingestion
```

---

## Testing

### Manual Testing

1. **Health Check**
   ```bash
   curl http://localhost:8001/api/rag/status
   ```

2. **Search Query**
   ```bash
   curl "http://localhost:8001/api/chat/search?query=spanish+work+visa"
   ```

3. **Chat with RAG**
   ```bash
   curl -X POST http://localhost:8001/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "content": "I want to work in Spain, what do I need?",
       "user_id": "test"
     }'
   ```

### Automated Validation

```bash
# Run validation suite (10 test queries)
python ingest_rag.py

# Or via API
curl -X POST http://localhost:8001/api/rag/validate
```

### Test Coverage

The validation suite tests:

1. **Cost Queries** - "How much does a US visa cost?"
2. **Document Requirements** - "What documents do I need?"
3. **Processing Time** - "How long does it take?"
4. **Work Visas** - "Requirements for working in Spain?"
5. **Stay Duration** - "How long can I stay?"
6. **Visa Refusal** - "What if my visa is rejected?"
7. **Country-Specific** - Canada, Australia, Schengen
8. **Financial Requirements** - Proof of funds
9. **General Questions** - Open-ended queries
10. **FAQ-like** - Common questions

---

## Troubleshooting

### Issue: "Pinecone API key not configured"

**Solution**: Add to `.env`:
```env
PINECONE_API_KEY=pcsk_your_key
```

Then run:
```bash
python ingest_rag.py
```

### Issue: "Pinecone index not found"

**Solution**:
1. Log into https://app.pinecone.io
2. Create index `visabuddy-visa-kb` with dimension 1536
3. Copy API key to `.env`

### Issue: "OpenAI API key not configured"

**Solution**: Add to `.env`:
```env
OPENAI_API_KEY=sk_your_key
```

**Note**: If not set, the system uses local fallback embeddings (less accurate but functional)

### Issue: "Low validation pass rate"

**Solution**:
1. Check if embeddings are being generated correctly
2. Verify knowledge base is loaded: `curl http://localhost:8001/api/rag/status`
3. Review cache status in diagnostics
4. Increase `top_k` parameter for more results

### Issue: "Cache file too large"

**Solution**: Cache grows with each ingestion. To reset:
```bash
# In Python
from services.cache_fallback import get_cache_fallback_service
cache_service = get_cache_fallback_service()
cache_service.cache.clear()
```

Or delete the file:
```bash
rm .cache/rag_cache.json
```

---

## Performance Monitoring

### Check Status

```bash
curl http://localhost:8001/api/rag/diagnostics | python -m json.tool
```

Expected output:
```json
{
  "status": "operational",
  "diagnostics": {
    "initialized": true,
    "pinecone_available": true,
    "cache_populated": true,
    "documents_indexed": 120,
    "using_openai_embeddings": true,
    "cache_stats": {
      "total_documents": 120,
      "total_embeddings": 120
    }
  }
}
```

### Metrics to Monitor

- **Documents Indexed**: Total document chunks
- **Pinecone Available**: Vector database connectivity
- **Cache Populated**: Fallback availability
- **Using OpenAI Embeddings**: Embedding quality (true is better)
- **Validation Pass Rate**: Accuracy of retrieval

---

## Advanced Usage

### Custom Knowledge Base

1. **Edit** `data/visa_kb.json`
2. Add your visa requirements/FAQs
3. Run `python ingest_rag.py`

### Adding Documents via API

```bash
curl -X POST http://localhost:8001/api/documents/upload \
  -H "Content-Type: application/json" \
  -d '{
    "file_content": "Your document text here",
    "document_type": "visa_requirements"
  }'
```

### Filter by Country

```bash
curl "http://localhost:8001/api/chat/search?query=work%20visa&country=Spain"
```

### Filter by Visa Type

```bash
curl "http://localhost:8001/api/chat/search?query=requirements&visa_type=Tourist"
```

---

## Endpoints Reference

### Status & Health

- `GET /api/rag/status` - RAG service status
- `GET /api/rag/diagnostics` - Detailed diagnostics
- `POST /api/rag/validate` - Run validation suite

### Search & Retrieval

- `POST /api/chat/search` - Search knowledge base
  - Query params: `query`, `country`, `visa_type`

### Chat

- `POST /api/chat` - Chat with RAG context
  - Body: `content`, `user_id`, `language`, `temperature`

---

## Next Steps

1. ✅ **RAG Pipeline Complete** - All components implemented
2. 🔜 **Phase 2**: AI Chat System Completion
   - Message persistence
   - Conversation context
   - Cost tracking
   - Rate limiting

3. 🔜 **Phase 3**: Payment System Hardening
   - Webhook verification tests
   - Idempotency testing
   - Reconciliation jobs

4. 🔜 **Phase 4**: Database & Performance
   - Redis caching
   - Connection pooling
   - Query optimization

---

## Support

For issues or questions:

1. Check logs: `LOG_LEVEL=DEBUG python ingest_rag.py`
2. Run validation: `curl -X POST http://localhost:8001/api/rag/validate`
3. Check diagnostics: `curl http://localhost:8001/api/rag/diagnostics`

---

**Status**: ✅ RAG Pipeline Complete - 12 hours implemented