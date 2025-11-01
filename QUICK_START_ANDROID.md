# VisaBuddy - Quick Start Guide for Android Testing

## Prerequisites

✅ **Check you have:**
- Node.js v20+ (run: `node --version`)
- npm v10+ (run: `npm --version`)
- Python 3.9+ (run: `python --version`)
- Android Studio with emulator
- PostgreSQL running locally (default: localhost:5432)

## Quick Setup (5 minutes)

### Step 1: Install Dependencies
```powershell
Set-Location "c:\work\VisaBuddy"
powershell -ExecutionPolicy Bypass -File .\RUN_ANDROID.ps1
```

This will:
- Check prerequisites
- Install backend dependencies
- Install frontend dependencies
- Show you what to do next

### Step 2: Start Services (in 3 separate terminals)

**Terminal 1 - Backend API Server (Port 3000)**
```powershell
Set-Location "c:\work\VisaBuddy\apps\backend"
npm run dev
```
Wait until you see: `✓ Server running on port 3000`

**Terminal 2 - AI Service (Port 8001)**
```powershell
Set-Location "c:\work\VisaBuddy\apps\ai-service"
python -m uvicorn main:app --reload --port 8001
```
Wait until you see: `Uvicorn running on http://127.0.0.1:8001`

**Terminal 3 - React Native on Android Emulator**
```powershell
Set-Location "c:\work\VisaBuddy\apps\frontend"
npm run android
```
This will:
1. Build the React Native app
2. Deploy to running Android emulator
3. Auto-reload on file changes

## Before Running Terminal 3

⚠️ **IMPORTANT:** Start Android emulator FIRST!

### To Start Android Emulator:
1. Open **Android Studio**
2. Go to **Device Manager** (or AVD Manager)
3. Click **Launch** on any emulator
4. Wait for it to fully boot (2-3 min)
5. Then run Terminal 3 command

## Testing the App

### First Time User:
1. App opens with Login screen
2. Click "Don't have an account?" → Register
3. Enter any email and password (e.g., test@example.com / password123)
4. Click Register
5. You're logged in!

### Main Screens to Test:
- **Home:** Shows welcome + quick stats
- **Visa Selection:** Browse countries and visa types
- **Documents:** Upload and track documents (PDF/JPG/PNG)
- **Chat:** AI assistant for visa questions
- **Profile:** View account details

### Sample Test Flows:

**Test 1: Create Visa Application**
1. Home → "New Application" button
2. Search for "Japan"
3. Select "Tourist Visa"
4. Click "Continue"
5. See estimated fee and processing time

**Test 2: Upload Document**
1. Go to "My Visas"
2. Select an application
3. Upload a document (JPG/PDF)
4. Watch the status change

**Test 3: Chat with AI**
1. Go to "Chat" tab
2. Ask: "What documents do I need for Japan?"
3. Get instant AI response

**Test 4: Language Switching**
1. Go to Profile
2. Select language (English, Uzbek, Russian)
3. All screens update immediately

## API Testing (Optional)

While the app is running, test API endpoints with Postman or curl:

### Register User
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Get Countries
```bash
GET http://localhost:3000/api/countries
```

### Send Chat Message
```bash
POST http://localhost:3000/api/chat/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "How much is a tourist visa to Japan?"
}
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify port 3000 is not in use
- Check `.env` file settings

### Frontend build hangs
- This is normal on first build (2-3 min)
- Watch for "Building..." progress
- Check emulator is running

### App crashes
- Check Terminal 1 (backend) for errors
- Try: `npm start` instead of `npm run android`
- Rebuild: `npm run android --reset-cache`

### Database connection error
- Install PostgreSQL locally
- Create database: `visabuddy_dev`
- Create user: `user` with password `password`
- Or modify DATABASE_URL in `.env`

### Emulator won't start
- Open Android Studio → Device Manager
- Select emulator → Click "Launch"
- Wait 3-5 minutes for full boot

## Next Steps

Once everything is running:

1. ✅ Test all screens
2. ✅ Create test applications
3. ✅ Upload documents
4. ✅ Test AI chat
5. ✅ Switch languages
6. ✅ Make payments (test mode)
7. 📝 Document any bugs/issues
8. 🚀 Ready for production!

## Useful Commands

```powershell
# Kill all Node processes
taskkill /F /IM node.exe

# Clear Android emulator data
cd %ANDROID_HOME%\tools
emulator -avd <your_avd_name> -wipe-data

# View logs
# Terminal 1: Already showing
# Terminal 2: Already showing  
# Terminal 3: Tap 'D' in terminal to toggle debug menu

# Stop all services
# Press Ctrl+C in each terminal
```

## Performance Notes

| Task | Time |
|------|------|
| Setup (first time) | 5 minutes |
| Start backend | 15 seconds |
| Start AI service | 10 seconds |
| Build for Android | 2-3 minutes (first) <br> 30-60 sec (subsequent) |
| Deploy to emulator | 30-60 seconds |
| **Total startup time** | ~5 minutes |

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Android Emulator                │
│  ┌──────────────────────────────────┐   │
│  │   React Native Frontend App      │   │
│  │  (Port: localhost:8081)          │   │
│  └──────────────────────────────────┘   │
└─────────┬──────────────────────────────┘
          │ HTTP/REST API calls
          ▼
┌─────────────────────────────────────────┐
│      Backend Express Server             │
│  (Port: localhost:3000)                 │
│  ├─ Auth endpoints                      │
│  ├─ Countries/Visa endpoints            │
│  ├─ Documents endpoints                 │
│  ├─ Chat endpoints                      │
│  └─ Payments endpoints                  │
└──────┬──────────────────┬───────────────┘
       │                  │
       ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  PostgreSQL DB  │  │  AI Service      │
│ (localhost:5432)│  │(localhost:8001)  │
│  visabuddy_dev  │  │  Python/FastAPI  │
└─────────────────┘  └──────────────────┘
```

## What Gets Tested

- ✅ User authentication (register/login)
- ✅ Visa application workflow
- ✅ Document upload & verification
- ✅ Payment processing
- ✅ AI chat functionality
- ✅ Multilingual UI (EN/UZ/RU)
- ✅ Data persistence (offline mode)
- ✅ Real-time updates

## Success Criteria

You've successfully set up the app when:

1. ✅ Terminal 1 shows: `Server running on port 3000`
2. ✅ Terminal 2 shows: `Uvicorn running on http://127.0.0.1:8001`
3. ✅ Terminal 3 shows app loading on emulator
4. ✅ Login screen appears after ~1 minute
5. ✅ You can register and see Home screen
6. ✅ All tabs work (Home, Visas, Chat, Profile)

---

**Estimated Total Time: 5-10 minutes** ⏱️

Questions? Check the `/work/VisaBuddy/docs` folder or refer to other guides!