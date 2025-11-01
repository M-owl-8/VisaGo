# ⚡ VisaBuddy - Quick Developer Reference

## Start Here (3 seconds)

```powershell
# Setup (one time)
cd c:\work\VisaBuddy
.\SETUP.ps1

# Then open 3 terminals:
# Terminal 1
cd c:\work\VisaBuddy\apps\backend
npm run dev

# Terminal 2
cd c:\work\VisaBuddy\apps\ai-service
python -m uvicorn main:app --reload --port 8001

# Terminal 3
cd c:\work\VisaBuddy\apps\frontend
npm start
```

---

## Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Backend | `http://localhost:3000` | API server |
| Backend Docs | `http://localhost:3000/api/docs` | Swagger UI |
| AI Service | `http://localhost:8001` | Chat API |
| AI Docs | `http://localhost:8001/docs` | API docs |
| Web App | `http://localhost:19006` | Web client |
| Database | `localhost:5432` | PostgreSQL |

---

## Key Directories

```
c:\work\VisaBuddy\
├── apps\
│   ├── backend\          # Express API
│   │   ├── src\
│   │   │   ├── services\
│   │   │   │   ├── documents.service.ts [NEW]
│   │   │   │   ├── chat.service.ts [NEW]
│   │   │   │   └── auth.service.ts
│   │   │   ├── routes\
│   │   │   │   ├── documents.ts [NEW]
│   │   │   │   ├── chat.ts [NEW]
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── prisma\
│   │   │   └── schema.prisma
│   │   └── .env
│   │
│   ├── frontend\         # React Native
│   │   ├── src\
│   │   │   ├── store\
│   │   │   │   ├── documents.ts [NEW]
│   │   │   │   ├── chat.ts [NEW]
│   │   │   │   └── ...
│   │   │   ├── screens\
│   │   │   │   ├── documents\ [NEW]
│   │   │   │   ├── chat\ [NEW]
│   │   │   │   └── ...
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── ai-service\       # Python FastAPI
│       ├── main.py [UPDATED]
│       └── requirements.txt
│
└── Documentation files...
```

---

## Common Commands

### Backend
```bash
# Development
cd apps/backend
npm install           # Install deps
npm run dev          # Start dev server
npm run build        # Build for production
npm run prisma:migrate  # Run migrations
npm run prisma:reset # Reset database

# Database
npx prisma studio   # Open Prisma Studio
npx prisma generate # Generate types
```

### Frontend
```bash
# Development
cd apps/frontend
npm install          # Install deps
npm start            # Start metro

# From metro menu:
# Press 'w' for web
# Press 'a' for Android
# Press 'i' for iOS

# Build
npm run build:web    # Web build
npm run build:android # Android build
npm run build:ios    # iOS build
```

### AI Service
```bash
# Development
cd apps/ai-service
pip install -r requirements.txt  # Install deps
python -m uvicorn main:app --reload --port 8001

# Production
gunicorn -w 4 -b 0.0.0.0:8001 main:app
```

---

## Key Files Modified/Created

### Backend [Phase 3]
```
NEW:
- src/services/documents.service.ts
- src/services/chat.service.ts
- src/routes/documents.ts
- src/routes/chat.ts

MODIFIED:
- src/index.ts (added routes)
- package.json (added multer)
```

### Frontend [Phase 3]
```
NEW:
- src/store/documents.ts
- src/store/chat.ts
- src/screens/documents/DocumentScreen.tsx
- src/screens/chat/ChatScreen.tsx

MODIFIED:
- src/services/api.ts (added 11 methods)
```

### AI Service [Phase 3]
```
MODIFIED:
- main.py (OpenAI integration)
```

---

## API Quick Test

### Insomnia/Postman Setup

1. **Register User**
   ```
   POST http://localhost:3000/api/auth/register
   
   {
     "email": "test@example.com",
     "password": "Test@1234",
     "name": "Test User"
   }
   ```

2. **Login**
   ```
   POST http://localhost:3000/api/auth/login
   
   {
     "email": "test@example.com",
     "password": "Test@1234"
   }
   
   Response contains: { token, refreshToken }
   ```

3. **Create Application**
   ```
   POST http://localhost:3000/api/applications
   Authorization: Bearer {token}
   
   {
     "destinationCountry": "USA",
     "visaType": "B1/B2",
     "applicationStatus": "draft"
   }
   ```

4. **Upload Document**
   ```
   POST http://localhost:3000/api/documents/upload
   Authorization: Bearer {token}
   
   Form Data:
   - file: (select PDF/JPG file)
   - applicationId: {applicationId}
   - documentType: passport
   ```

5. **Send Chat Message**
   ```
   POST http://localhost:3000/api/chat/send
   Authorization: Bearer {token}
   
   {
     "content": "What documents do I need for a US visa?",
     "applicationId": "{applicationId}",
     "history": []
   }
   ```

---

## Database Quick Access

### Prisma Studio
```bash
cd apps/backend
npx prisma studio
# Opens: http://localhost:5555
```

### Manual Queries
```bash
# Connect via psql
psql -U user -d visabuddy_dev

# Common queries
\dt                    # List tables
SELECT * FROM "User";  # View users
SELECT * FROM "UserDocument";  # View documents
SELECT * FROM "ChatMessage";   # View messages
```

---

## File Upload Accepted Types

| Type | Extensions | Max Size |
|------|-----------|----------|
| PDF | `.pdf` | 20MB |
| Image | `.jpg`, `.png` | 20MB |
| Document | `.docx` | 20MB |

---

## Error Responses

### 400 - Bad Request
```json
{
  "error": "Invalid request format",
  "details": "Field 'email' is required"
}
```

### 401 - Unauthorized
```json
{
  "error": "Authentication required",
  "details": "Missing or invalid token"
}
```

### 409 - Conflict
```json
{
  "error": "Email already registered",
  "details": "Try login instead"
}
```

### 500 - Server Error
```json
{
  "error": "Internal server error",
  "details": "Check server logs"
}
```

---

## State Management (Frontend)

### Document Store
```typescript
import { useDocumentStore } from '@/store/documents'

const { 
  documents,
  uploadingId,
  error,
  uploadDocument,
  deleteDocument,
  getDocumentStats
} = useDocumentStore()
```

### Chat Store
```typescript
import { useChatStore } from '@/store/chat'

const {
  messages,
  loading,
  sendMessage,
  getChatHistory,
  clearHistory
} = useChatStore()
```

---

## Environment Variables Quick Setup

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/visabuddy_dev
JWT_SECRET=dev-secret-key
AI_SERVICE_URL=http://localhost:8001
PAYME_MERCHANT_ID=test-merchant-id
OPENAI_API_KEY=  # Leave blank for fallback
```

### AI Service (optional)
```
OPENAI_API_KEY=sk-...  # Leave blank for fallback
```

---

## Debugging Tips

### Backend Logs
```bash
# Watch logs
cd apps/backend
npm run dev  # Logs show in terminal

# Common errors:
# "port 3000 in use" → Use different port or kill process
# "Database connection" → Check DATABASE_URL and PostgreSQL running
# "Cannot find module" → Run npm install again
```

### Frontend Debug Menu
```
# In app press and hold: Ctrl+M (Android) / Cmd+D (iOS)
# Available options:
# - Reload app
# - Show inspector
# - Show network responses
# - Toggle performance monitoring
```

### AI Service Debug
```bash
# Check AI service
curl http://localhost:8001/docs

# Test message
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

---

## Performance Tips

1. **Faster npm install:**
   ```bash
   npm ci  # Instead of npm install
   ```

2. **Clear cache:**
   ```bash
   npm cache clean --force
   ```

3. **Update packages safely:**
   ```bash
   npm update --save
   ```

4. **Check for vulnerabilities:**
   ```bash
   npm audit
   npm audit fix
   ```

---

## Useful Links

- 📖 [Express.js Docs](https://expressjs.com)
- 🐍 [FastAPI Docs](https://fastapi.tiangolo.com)
- ⚛️ [React Native Docs](https://reactnative.dev)
- 📊 [Prisma Docs](https://www.prisma.io/docs)
- 🔑 [JWT.io](https://jwt.io)
- 🎨 [Design System](./apps/frontend/src/theme)

---

**Ready to start?** Run `.\SETUP.ps1` and follow the 3 terminal commands! 🚀