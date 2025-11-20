# How to Run AI Service

This guide explains how to run the VisaBuddy AI Service, a FastAPI-based service that provides AI chat with RAG (Retrieval-Augmented Generation) capabilities.

---

## 📋 Prerequisites

Before running the AI service, ensure you have:

- **Python 3.10+** installed
- **pip** (Python package manager)
- **OpenAI API Key** (optional but recommended)
- **Pinecone API Key** (optional - for vector database)

---

## 🚀 Quick Start (5 minutes)

### Step 1: Navigate to AI Service Directory

```bash
cd apps/ai-service
```

### Step 2: Create Virtual Environment (Recommended)

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create a `.env` file in `apps/ai-service/`:

```env
# OpenAI API Key (Required for AI chat)
OPENAI_API_KEY=sk-your-api-key-here

# Pinecone (Optional - for vector database)
PINECONE_API_KEY=pcsk-your-key-here
PINECONE_INDEX_NAME=visabuddy-visa-kb
PINECONE_ENVIRONMENT=gcp-starter

# Service Configuration
PORT=8001
CORS_ORIGINS=http://localhost:3000,http://localhost:19006
LOG_LEVEL=INFO

# RAG Configuration
RAG_ENABLED=true
USE_LOCAL_EMBEDDINGS_FALLBACK=true
```

**Note**: If you don't have an OpenAI API key, the service will use fallback responses (less intelligent but functional).

### Step 5: Initialize RAG System (Optional but Recommended)

This step processes the knowledge base and sets up the RAG system:

```bash
python ingest_rag.py
```

This will:
- Load the visa knowledge base
- Chunk documents into searchable pieces
- Generate embeddings
- Index in Pinecone (if configured) or local cache
- Run validation tests

### Step 6: Start the Service

**Option A: Using uvicorn directly**
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

**Option B: Using Python directly**
```bash
python main.py
```

**Option C: Using Docker**
```bash
# From project root
docker-compose up ai-service
```

The service will start on **http://localhost:8001**

---

## ✅ Verify the Service is Running

### Health Check

```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "VisaBuddy AI Service",
  "version": "1.0.0"
}
```

### API Status

```bash
curl http://localhost:8001/api/status
```

### RAG Status

```bash
curl http://localhost:8001/api/rag/status
```

---

## 🧪 Test the AI Service

### Test Chat Endpoint

```bash
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What documents do I need for a UK tourist visa?",
    "user_id": "test_user",
    "language": "en"
  }'
```

### Test Search Endpoint

```bash
curl "http://localhost:8001/api/chat/search?query=How%20much%20does%20a%20US%20visa%20cost"
```

### Test RAG Validation

```bash
curl -X POST http://localhost:8001/api/rag/validate
```

---

## 🐳 Running with Docker

### Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up ai-service
```

Or to run in detached mode:

```bash
docker-compose up -d ai-service
```

### Using Dockerfile Directly

```bash
cd apps/ai-service
docker build -t visabuddy-ai .
docker run -p 8001:8001 \
  -e OPENAI_API_KEY=sk-your-key \
  visabuddy-ai
```

---

## 🔧 Development Mode

For development with auto-reload:

```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

The `--reload` flag enables automatic reloading when code changes.

---

## 📊 Available Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /api/status` - API status
- `GET /api/rag/status` - RAG system status
- `GET /api/rag/diagnostics` - Detailed diagnostics

### Chat & Search
- `POST /api/chat` - Chat with AI (main endpoint)
- `POST /api/chat/search` - Search knowledge base
- `POST /api/rag/validate` - Validate RAG system

### Usage & Rate Limits
- `GET /api/rate-limit/{user_id}` - Check rate limit status
- `GET /api/usage` - Get usage statistics
- `POST /api/usage/reset` - Reset usage log (admin)

---

## 🔍 Troubleshooting

### Issue: "Module not found" errors

**Solution**: Make sure you've activated the virtual environment and installed dependencies:
```bash
pip install -r requirements.txt
```

### Issue: "DLL load failed while importing _multiarray_umath" (Windows)

**Problem**: Numpy cannot load its DLL files on Windows. This is a common Windows-specific issue, especially with Python 3.14.

**Solution**:

1. **Run the fix script** (Easiest):
   ```powershell
   .\fix-numpy-windows.ps1
   ```

2. **Manual fix - Install Visual C++ Redistributables** (Most reliable):
   - Download and install [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
   - Restart your terminal/PowerShell
   - Reinstall numpy:
     ```powershell
     pip uninstall numpy -y
     pip install numpy==2.3.2 --only-binary :all:
     ```

3. **Alternative: Use Docker** (No Windows DLL issues):
   ```powershell
   docker-compose up ai-service
   ```

4. **If still failing, try**:
   ```powershell
   # Upgrade pip first
   python -m pip install --upgrade pip setuptools wheel
   
   # Then reinstall numpy
   pip uninstall numpy -y
   pip install numpy==2.3.2 --only-binary :all:
   ```

**Note**: This is a known issue with numpy on Windows, especially with newer Python versions. The Visual C++ Redistributables are required for numpy's compiled extensions to work.

### Issue: "OpenAI API key not configured"

**Solution**: 
1. Create `.env` file in `apps/ai-service/`
2. Add `OPENAI_API_KEY=sk-your-key`
3. Restart the service

**Note**: The service will work with fallback responses if OpenAI is not configured, but responses will be less intelligent.

### Issue: "Port 8001 already in use"

**Solution**: 
1. Change the port in `.env`: `PORT=8002`
2. Or stop the process using port 8001:
   ```bash
   # Windows
   netstat -ano | findstr :8001
   taskkill /PID <PID> /F
   
   # Linux/macOS
   lsof -ti:8001 | xargs kill
   ```

### Issue: "RAG service not initialized"

**Solution**: Run the ingestion script:
```bash
python ingest_rag.py
```

This will set up the knowledge base and embeddings.

### Issue: "Pinecone connection failed"

**Solution**: 
1. Pinecone is optional - the service will use local cache fallback
2. If you want Pinecone, add to `.env`:
   ```env
   PINECONE_API_KEY=pcsk-your-key
   PINECONE_INDEX_NAME=visabuddy-visa-kb
   PINECONE_ENVIRONMENT=gcp-starter
   ```
3. Create the index in Pinecone dashboard (dimension: 1536)

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No* | - | OpenAI API key for AI chat |
| `PINECONE_API_KEY` | No | - | Pinecone API key for vector DB |
| `PINECONE_INDEX_NAME` | No | `visabuddy-visa-kb` | Pinecone index name |
| `PINECONE_ENVIRONMENT` | No | `gcp-starter` | Pinecone environment |
| `PORT` | No | `8001` | Service port |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `RAG_ENABLED` | No | `true` | Enable/disable RAG |
| `USE_LOCAL_EMBEDDINGS_FALLBACK` | No | `true` | Use local embeddings fallback |

*Required for full AI functionality, but service will work with fallback responses if not set.

---

## 🚀 Production Deployment

### Using Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d ai-service
```

### Using Railway/Heroku

The service includes `nixpacks.toml` for automatic deployment on Railway or Heroku.

### Environment Variables for Production

Make sure to set:
- `OPENAI_API_KEY` - Production OpenAI key
- `PINECONE_API_KEY` - Production Pinecone key (if using)
- `CORS_ORIGINS` - Your production frontend URL
- `LOG_LEVEL` - `INFO` or `WARNING` (not `DEBUG`)

---

## 📚 Additional Resources

- [RAG Setup Guide](RAG_SETUP_GUIDE.md) - Detailed RAG configuration
- [OpenAI Setup Guide](../../docs/SETUP_OPENAI.md) - OpenAI API setup
- [Main README](../../README.md) - Project overview

---

## 🎯 Quick Command Reference

```bash
# Start service
python -m uvicorn main:app --reload --port 8001

# Initialize RAG
python ingest_rag.py

# Test health
curl http://localhost:8001/health

# Test chat
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello", "user_id": "test"}'

# View logs
# Logs are printed to console by default
```

---

**Status**: ✅ Ready to run  
**Last Updated**: January 2025

