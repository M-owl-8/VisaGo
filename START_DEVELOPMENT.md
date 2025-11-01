# 🚀 Start VisaBuddy Development Environment

After running `.\SETUP.ps1`, follow these steps to start the app.

## Prerequisites
- Setup completed successfully (all dependencies installed)
- PostgreSQL running locally or accessible
- Terminal/PowerShell ready

## Option 1: Start All Services (Recommended)

**Terminal 1 - Backend API:**
```powershell
cd c:\work\VisaBuddy\apps\backend
npm run dev
```
✓ Runs on `http://localhost:3000`
✓ API endpoints available at `http://localhost:3000/api/*`
✓ Health check: `http://localhost:3000/api/health`

**Terminal 2 - AI Service:**
```powershell
cd c:\work\VisaBuddy\apps\ai-service
python -m uvicorn main:app --reload --port 8001
```
✓ Runs on `http://localhost:8001`
✓ Swagger docs: `http://localhost:8001/docs`
✓ OpenAPI schema: `http://localhost:8001/openapi.json`

**Terminal 3 - Frontend App:**
```powershell
cd c:\work\VisaBuddy\apps\frontend
npm start
```
✓ Development server starts
✓ Metro bundler runs
✓ Follow on-screen instructions for web/Android/iOS

---

## Testing the Full Stack

### 1. Check Backend Health
```bash
curl http://localhost:3000/api/health
```
Expected response:
```json
{"status": "ok"}
```

### 2. Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "name": "Test User"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

### 4. Test AI Service
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What documents do I need for a US visa?"
  }'
```

---

## Frontend Testing

### Web Platform
After `npm start`, press `w` to open web version in browser
- Access at: `http://localhost:19006` (or shown in terminal)
- Test flows: Register → Create Application → Upload Document → Chat with AI

### Android Emulator
After `npm start`, press `a` to launch Android
- Requires Android Studio and configured emulator
- Loads app on emulator automatically

### iOS Simulator
After `npm start`, press `i` to launch iOS (macOS only)
- Requires Xcode
- Opens app in iOS simulator

---

## Environment Variables

### Backend (.env)
Required variables in `c:\work\VisaBuddy\apps\backend\.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/visabuddy
JWT_SECRET=your-secret-key-here
PAYME_MERCHANT_ID=your-merchant-id
PAYME_ACCOUNT=your-account
AI_SERVICE_URL=http://localhost:8001
```

### AI Service (.env)
Optional in `c:\work\VisaBuddy\apps\ai-service`:
```
OPENAI_API_KEY=sk-...  # Leave blank for fallback responses
```

---

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 3000
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Find process using port 8001
Get-Process | Where-Object {$_.ProcessName -eq "python"} | Stop-Process -Force
```

### Database Connection Error
```powershell
# Check PostgreSQL is running
psql -U postgres -d postgres -c "SELECT 1"

# Reset database
cd c:\work\VisaBuddy\apps\backend
npx prisma migrate reset
```

### npm install fails
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Python dependency issues
```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

---

## Next Steps

1. ✓ Start all three services (backend, AI, frontend)
2. ✓ Test user registration and login
3. ✓ Upload documents for an application
4. ✓ Make a payment via Payme
5. ✓ Chat with the AI assistant
6. ✓ Ready for production build!

---

## Production Build

When ready to build for production:
```powershell
# Web build
cd c:\work\VisaBuddy\apps\frontend
npm run build:web
# Output in: c:\work\VisaBuddy\apps\frontend\build

# Android APK (requires EAS)
eas build --platform android

# iOS IPA (requires EAS and macOS)
eas build --platform ios
```

See `PHASE_3_BUILD_GUIDE.md` for detailed production instructions.