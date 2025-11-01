# 🚀 VisaBuddy - Start Here

Welcome to **VisaBuddy**, an AI-powered visa application management system!

## 📋 What is VisaBuddy?

VisaBuddy helps users navigate visa applications across multiple countries with:
- 🌍 Visa requirements for different countries
- 📄 Document tracking and management (Checkpoint system)
- 🤖 AI chatbot with RAG (Retrieval-Augmented Generation)
- 💰 Payment integration for premium features
- 🌐 Multi-language support (English, Uzbek, Russian)

---

## ⚡ Quick Setup (5 minutes)

### 1. **Install Dependencies**

```bash
# Install monorepo dependencies
npm install

# Install backend dependencies
cd apps/backend
npm install

# Install AI service dependencies
cd ../ai-service
pip install -r requirements.txt

cd ../..
```

### 2. **Set Up Environment**

```bash
# Copy example env file
cp apps/backend/.env.example apps/backend/.env

# Edit .env with your configuration
# See docs/SETUP.md for detailed environment setup
```

### 3. **Set Up Database**

```bash
# PostgreSQL must be running
# Update DATABASE_URL in .env

# Generate Prisma client
cd apps/backend
npm run db:generate

# Run migrations
npm run db:migrate

cd ../..
```

### 4. **Start Development Services**

**Terminal 1 - Backend (Node.js/Express)**
```bash
cd apps/backend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - AI Service (FastAPI)**
```bash
cd apps/ai-service
python -m uvicorn main:app --reload --port 8001
# Runs on http://localhost:8001
```

**Terminal 3 - Frontend (React Native)**
```bash
cd apps/frontend
npm start
# Follow prompts to run on Android/iOS/Web
```

---

## 📁 Project Structure

```
VisaBuddy/
├── apps/
│   ├── frontend/              # React Native (Bare) mobile app
│   │   ├── src/screens/      # UI screens
│   │   ├── src/store/        # Zustand state management
│   │   ├── src/services/     # API client
│   │   └── src/utils/        # Utilities
│   │
│   ├── backend/               # Node.js/Express REST API
│   │   ├── src/routes/       # API endpoints
│   │   ├── src/services/     # Business logic
│   │   ├── prisma/           # Database schema
│   │   └── .env.example      # Environment template
│   │
│   └── ai-service/            # FastAPI Python service
│       ├── main.py           # FastAPI app
│       └── requirements.txt   # Python dependencies
│
├── docs/
│   ├── SETUP.md              # Detailed setup guide
│   └── ARCHITECTURE.md       # System architecture
│
└── .zencoder/rules/repo.md   # Project standards
```

---

## 🔑 Key Files to Know

| File | Purpose |
|------|---------|
| `README.md` | Full project overview |
| `QUICK_START.md` | Quick reference commands |
| `docs/SETUP.md` | Detailed environment setup |
| `.zencoder/rules/repo.md` | Project standards & guidelines |
| `apps/backend/prisma/schema.prisma` | Database schema |

---

## 🛠️ Common Commands

### Frontend
```bash
cd apps/frontend
npm start                    # Start Metro bundler
npm run android             # Run on Android
npm run ios                 # Run on iOS
```

### Backend
```bash
cd apps/backend
npm run dev                 # Start with hot reload
npm run build               # Build production
npm run db:studio           # Open Prisma Studio
npm run db:migrate          # Run migrations
```

### AI Service
```bash
cd apps/ai-service
python -m uvicorn main:app --reload --port 8001
python -m pytest            # Run tests
```

---

## 📚 Documentation Map

1. **START_HERE.md** ← You are here
2. **README.md** - Full project documentation
3. **docs/SETUP.md** - Environment & database setup
4. **QUICK_START.md** - Common commands reference
5. **.zencoder/rules/repo.md** - Development standards

---

## 🎯 Development Roadmap

### Phase 1: MVP (Weeks 1-4)
- [ ] User authentication (email + Google OAuth)
- [ ] Country & visa type browsing
- [ ] Document checkpoint tracking
- [ ] User profile management

### Phase 2: AI & Payments (Weeks 5-8)
- [ ] AI chat with RAG
- [ ] Payment integration
- [ ] $50 unlock for premium AI

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Admin panel
- [ ] Analytics dashboard

### Phase 4: Production (Weeks 13+)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] App store submission

---

## 🚨 Important Notes

### Database Schema
- Never modify `prisma/schema.prisma` without understanding relationships
- Always create a migration before applying changes
- All tables have cascading deletes where applicable

### API Communication
- Frontend ↔ Backend: REST API on port 3000
- Backend ↔ AI Service: HTTP on port 8001
- Both services must be running for full functionality

### Environment Variables
- Copy `.env.example` to `.env`
- Never commit `.env` file to version control
- Required variables are marked in `.env.example`

---

## 📞 Need Help?

1. **Setup Issues?** → See `docs/SETUP.md`
2. **Commands?** → See `QUICK_START.md`
3. **Standards?** → See `.zencoder/rules/repo.md`
4. **Architecture?** → Ask the team or check `docs/ARCHITECTURE.md`

---

## ✅ Checklist Before Starting Development

- [ ] Node.js 20+ installed
- [ ] Python 3.10+ installed
- [ ] PostgreSQL installed and running
- [ ] Environment file created (`.env`)
- [ ] Database migrations completed
- [ ] All services start without errors
- [ ] You can navigate to all three services

---

**Ready to code?** Start with Phase 1 features in the backend! 🎉

See `docs/SETUP.md` for detailed environment configuration.