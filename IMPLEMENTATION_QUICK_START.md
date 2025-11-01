# VisaBuddy Implementation Quick Start
**Purpose**: Step-by-step fixes to reach production readiness

---

## 🔥 THE 3 CRITICAL FIXES (Do These First)

### FIX #1: Database Migration (SQLite → PostgreSQL) ⏱️ 4 hours

#### Step 1: Update schema.prisma
```prisma
// File: apps/backend/prisma/schema.prisma
// Change line 4-7 from:
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// To:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Step 2: Create .env
```bash
# apps/backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/visabuddy"
JWT_SECRET="your-secret-key-here"
NODE_ENV="production"
PORT=3000
```

#### Step 3: Deploy database
Choose ONE provider:

**Option A: Supabase (Recommended for MVP)**
```bash
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Copy connection string
# 4. Paste into DATABASE_URL
```

**Option B: Railway**
```bash
# 1. Create account at railway.app
# 2. Create PostgreSQL service
# 3. Copy DATABASE_URL
```

#### Step 4: Run migration
```bash
cd apps/backend
npm run db:generate
npx prisma migrate deploy
npx prisma db seed  # Optional: seed test data
```

#### Step 5: Update connection pooling
```typescript
// apps/backend/src/index.ts
// Replace PrismaClient initialization (line 12) with:

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" 
    ? ["query", "error", "warn"]
    : ["error"],
});

// This enables connection pooling in production
```

---

### FIX #2: File Storage Setup ⏱️ 2 hours

#### Step 1: Install Firebase Admin SDK
```bash
cd apps/backend
npm install firebase-admin
```

#### Step 2: Create Firebase Storage Service
Create: `apps/backend/src/services/storage.service.ts`

```typescript
import * as admin from "firebase-admin";
import { config } from "dotenv";

config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export class StorageService {
  static async uploadDocument(
    file: Buffer,
    fileName: string,
    userId: string,
    applicationId: string
  ) {
    try {
      const bucket = admin.storage().bucket();
      const path = `documents/${userId}/${applicationId}/${fileName}`;
      const fileRef = bucket.file(path);

      await fileRef.save(file, {
        metadata: {
          contentType: "application/pdf",
        },
      });

      // Generate public URL (valid for 30 days)
      const [url] = await fileRef.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      return { url, path };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

  static async deleteDocument(path: string) {
    try {
      const bucket = admin.storage().bucket();
      await bucket.file(path).delete();
    } catch (error) {
      console.error("Delete error:", error);
      throw error;
    }
  }
}
```

#### Step 3: Update .env with Firebase credentials
```bash
# apps/backend/.env (add these)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
```

Get these from Firebase Console → Project Settings → Service Account

#### Step 4: Update documents route to use storage service
```typescript
// apps/backend/src/routes/documents.ts
// Add import at top:
import { StorageService } from "../services/storage.service";

// In upload endpoint:
router.post("/:applicationId/upload", async (req, res) => {
  try {
    const { userId, applicationId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Upload to Firebase
    const { url, path } = await StorageService.uploadDocument(
      file.buffer,
      file.originalname,
      userId,
      applicationId
    );

    // Save to database
    const document = await prisma.userDocument.create({
      data: {
        userId,
        applicationId,
        documentName: file.originalname,
        documentType: req.body.documentType,
        fileUrl: url,
        fileName: file.originalname,
        fileSize: file.size,
      },
    });

    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### FIX #3: Add Caching Layer ⏱️ 3 hours

#### Step 1: Create cache service
Create: `apps/backend/src/services/cache.service.ts`

```typescript
import NodeCache from "node-cache";

// TTL = 1 hour for countries/visas, 5 minutes for user data
export const countryCache = new NodeCache({ stdTTL: 3600 });
export const userCache = new NodeCache({ stdTTL: 300 });

export class CacheService {
  static getKey(...parts: string[]): string {
    return parts.join("::");
  }

  static set(key: string, value: any, ttl?: number) {
    countryCache.set(key, value, ttl);
  }

  static get(key: string) {
    return countryCache.get(key);
  }

  static del(key: string) {
    countryCache.del(key);
  }

  static invalidateCountryCache() {
    countryCache.flushAll();
  }
}
```

#### Step 2: Update CountriesService to use cache
```typescript
// apps/backend/src/services/countries.service.ts
import { CacheService } from "./cache.service";

export class CountriesService {
  static async getAllCountries(search?: string) {
    // Check cache first
    const cacheKey = CacheService.getKey("countries", search || "all");
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

    const where: Prisma.CountryWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const countries = await prisma.country.findMany({
      where,
      include: { visaTypes: true },
      orderBy: { name: "asc" },
    });

    // Cache for 1 hour
    CacheService.set(cacheKey, countries, 3600);
    return countries;
  }

  static async getPopularCountries() {
    const cacheKey = CacheService.getKey("countries", "popular");
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

    const countries = await prisma.country.findMany({
      take: 10,
      include: { visaTypes: { take: 3 } },
      orderBy: { name: "asc" },
    });

    CacheService.set(cacheKey, countries, 3600);
    return countries;
  }
}
```

---

## 🧩 ENHANCED DOCUMENT REQUIREMENTS (Optional but Recommended)

### Add VisaRequirement model for flexible data updates

#### Step 1: Update Prisma schema
```prisma
// Add to apps/backend/prisma/schema.prisma

model VisaRequirement {
  id            String    @id @default(cuid())
  visaTypeId    String
  docType       String    // e.g., "passport", "bank_statement"
  isRequired    Boolean   @default(true)
  maxFileSize   Int       @default(10)  // MB
  formats       String    @default("pdf,jpg,png")
  instructions  String?   // "Valid 6+ months showing balance"
  costUSD       Float?    // Cost to obtain in home country
  processingDays Int?     // Time to obtain
  order         Int       @default(0)   // Display order
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  visaType      VisaType  @relation(fields: [visaTypeId], references: [id], onDelete: Cascade)

  @@unique([visaTypeId, docType])
  @@index([visaTypeId])
}

// Update VisaType relation
model VisaType {
  // ... existing fields ...
  requirements   VisaRequirement[]  // Add this line
}
```

#### Step 2: Run migration
```bash
cd apps/backend
npx prisma migrate dev --name add_visa_requirements
```

#### Step 3: Create admin import endpoint
```typescript
// apps/backend/src/routes/admin.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

interface RequirementImport {
  countryCode: string;
  visaType: string;
  requirements: Array<{
    docType: string;
    isRequired: boolean;
    formats?: string;
    instructions?: string;
    costUSD?: number;
    processingDays?: number;
  }>;
}

router.post("/visas/import-requirements", async (req, res) => {
  try {
    const updates: RequirementImport[] = req.body.updates;

    for (const update of updates) {
      // Find country
      const country = await prisma.country.findUnique({
        where: { code: update.countryCode.toUpperCase() },
      });

      if (!country) {
        return res.status(404).json({
          error: `Country not found: ${update.countryCode}`,
        });
      }

      // Find visa type
      const visaType = await prisma.visaType.findFirst({
        where: {
          countryId: country.id,
          name: update.visaType,
        },
      });

      if (!visaType) {
        return res.status(404).json({
          error: `Visa type not found: ${update.visaType}`,
        });
      }

      // Delete existing requirements
      await prisma.visaRequirement.deleteMany({
        where: { visaTypeId: visaType.id },
      });

      // Create new requirements
      for (let i = 0; i < update.requirements.length; i++) {
        const req = update.requirements[i];
        await prisma.visaRequirement.create({
          data: {
            visaTypeId: visaType.id,
            docType: req.docType,
            isRequired: req.isRequired,
            formats: req.formats || "pdf,jpg,png",
            instructions: req.instructions,
            costUSD: req.costUSD,
            processingDays: req.processingDays,
            order: i,
          },
        });
      }
    }

    res.json({
      success: true,
      message: "Requirements imported successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🤖 AI/LLM INTEGRATION PHASES

### Phase 1: Enable Basic GPT-4 (MVP) ⏱️ 4 hours

#### Current Status
- ✅ FastAPI service exists
- ✅ Fallback responses work
- ⚠️ OpenAI integration incomplete

#### Step 1: Complete OpenAI Integration
```python
# apps/ai-service/main.py
# Line 126-141 already has structure, just needs testing

# Add to requirements.txt if missing:
# openai>=1.0.0
# python-dotenv
```

#### Step 2: Test locally
```bash
cd apps/ai-service

# Create .env
echo 'OPENAI_API_KEY=sk-...' > .env

# Run service
python main.py

# Test endpoint
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What documents do I need for a student visa?",
    "user_id": "test-user",
    "application_id": "test-app"
  }'
```

#### Step 3: Connect from Node.js backend
```typescript
// apps/backend/src/services/chat.service.ts
import axios from "axios";

export class ChatService {
  private static readonly AI_SERVICE_URL = 
    process.env.AI_SERVICE_URL || "http://localhost:8001";

  static async sendMessage(
    userId: string,
    content: string,
    applicationId?: string,
    history?: any[]
  ) {
    try {
      const response = await axios.post(
        `${this.AI_SERVICE_URL}/api/chat`,
        {
          content,
          user_id: userId,
          application_id: applicationId,
          conversation_history: history,
        }
      );

      return response.data;
    } catch (error) {
      console.error("AI Service error:", error);
      throw error;
    }
  }
}
```

#### Step 4: Cost estimate for Phase 1
```
Average: 500 tokens per message
Cost: $0.003 per 1K tokens (GPT-4)
10k users × 10 messages/month = 100k messages
100k × 500 tokens × $0.003 / 1k = ~$150/month

Cost: ~$150-200/month for Phase 1
```

---

### Phase 2: Add RAG (Optional) ⏱️ 2-3 weeks

**Skip for MVP, add after launch if needed**

Would require:
- LangChain integration
- Vector database (Pinecone/Supabase Vectors)
- Document embedding pipeline
- Estimated cost: +$300-500/month

---

## 📋 DEPLOYMENT CHECKLIST

### Before Deploying to Production

- [ ] Database: PostgreSQL configured
- [ ] File Storage: Firebase/S3 setup complete
- [ ] Caching: Redis or node-cache working
- [ ] Environment variables: All required vars set
- [ ] Rate limiting: Configured for 10k users
- [ ] Error tracking: Sentry or similar added
- [ ] Health checks: `/health` endpoint returning OK
- [ ] CORS: Properly configured for app domains
- [ ] SSL/TLS: HTTPS enabled everywhere
- [ ] Monitoring: Basic uptime monitoring active
- [ ] Load test: Verified 1000+ concurrent users

### Post-Deployment

- [ ] Monitor error rates (target: <0.1%)
- [ ] Check database performance
- [ ] Verify cache hit rates
- [ ] Monitor API response times
- [ ] Track OpenAI API usage (if enabled)
- [ ] Set up alerts for critical errors

---

## 💻 DEV ENVIRONMENT SETUP

```bash
# 1. Clone repo
git clone <repo>
cd VisaBuddy/apps/backend

# 2. Install dependencies
npm install

# 3. Setup PostgreSQL locally (for dev)
# Option A: Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Option B: Manual install or use Railway's free tier

# 4. Set .env
cp .env.example .env
# Edit DATABASE_URL to your local postgres

# 5. Run migrations
npm run db:migrate

# 6. Seed test data
npm run db:seed

# 7. Start backend
npm run dev

# 8. In another terminal, start AI service (optional)
cd ../ai-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py

# 9. Frontend setup
cd ../frontend
npm install
npm start
```

---

## 🎯 NEXT STEPS

1. **This Week**: Implement FIX #1, #2, #3 above
2. **Next Week**: Load test, app store submission prep
3. **Week 3**: Launch soft-beta with 100 users
4. **Week 4**: Monitor, then open to 10k users
5. **Week 5-6**: Plan Phase 2 features

Total time to production: **10-14 days** if focused
