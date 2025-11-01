# VisaBuddy Document Requirements Management Guide
**Purpose**: Make it easy to update visa requirements for different countries and visa types

---

## 🎯 The Problem

Currently, document requirements are stored as JSON strings in the database:
```
VisaType.documentTypes = '[{"name":"passport"},{"name":"bank_statement"}]'
```

**Issues**:
- ❌ Hard to update (raw JSON editing)
- ❌ No validation (can insert invalid data)
- ❌ Can't query efficiently ("which visa types need passports?")
- ❌ No versioning (can't see what changed)

---

## ✅ The Solution: VisaRequirement Table

### Option 1: Simple (Recommended for MVP) - 2 hours

Keep JSON structure but add admin UI:

**API Endpoint**: `POST /api/admin/requirements/bulk-update`

```json
{
  "countryCode": "US",
  "visaType": "Student Visa",
  "requirements": [
    {
      "order": 1,
      "docType": "passport",
      "isRequired": true,
      "formats": "pdf,jpg",
      "instructions": "Valid for 6+ months",
      "notes": "Biometric passport required"
    },
    {
      "order": 2,
      "docType": "bank_statement",
      "isRequired": true,
      "formats": "pdf",
      "instructions": "Last 3 months showing $45k+ balance",
      "notes": "Any FDIC-insured bank"
    },
    {
      "order": 3,
      "docType": "i20_form",
      "isRequired": true,
      "formats": "pdf",
      "instructions": "From SEVIS"
    }
  ]
}
```

**Response**: Success or error with details

---

### Option 2: Normalized (Recommended for scale) - 3-4 hours

Create separate `VisaRequirement` table:

#### Step 1: Update Prisma Schema
```prisma
// File: apps/backend/prisma/schema.prisma

model VisaRequirement {
  id            String    @id @default(cuid())
  visaTypeId    String
  
  // Core fields
  docType       String    // Unique ID: "passport", "bank_statement", etc.
  displayName   String    // User-facing: "Passport", "Bank Statement"
  description   String?   // "A valid passport with..."
  isRequired    Boolean   @default(true)
  
  // Format & size constraints
  formats       String    @default("pdf,jpg,png")  // Supported formats
  maxFileSize   Int       @default(10)             // MB
  
  // Local market info (for countries with regional advice)
  costUSD       Float?    // Estimated cost to obtain
  processingDays Int?     // Days needed to obtain
  whereToGet    String?   // JSON with local options
  
  // Display & ordering
  order         Int       @default(0)  // Sort order
  tips          String?   // Pro tips as JSON array
  templates     String?   // Links to sample documents
  
  // Audit trail
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  updatedBy     String?   // Admin user ID

  visaType      VisaType  @relation(fields: [visaTypeId], references: [id], onDelete: Cascade)

  @@unique([visaTypeId, docType])
  @@index([visaTypeId])
  @@index([docType])
}

// Update VisaType to include requirements
model VisaType {
  id                String    @id @default(cuid())
  countryId         String
  name              String
  description       String?
  processingDays    Int
  validity          String
  fee               Float
  requirements      String    // Keep for backwards compatibility
  documentTypes     String    // Keep for backwards compatibility
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  country           Country   @relation(fields: [countryId], references: [id], onDelete: Cascade)
  applications      VisaApplication[]
  visaRequirements  VisaRequirement[]  // Add this relation

  @@unique([countryId, name])
  @@index([countryId])
}
```

#### Step 2: Create Migration
```bash
npx prisma migrate dev --name add_visa_requirements_table
```

#### Step 3: Create Admin Service
```typescript
// File: apps/backend/src/services/requirements.service.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RequirementData {
  docType: string;
  displayName: string;
  isRequired: boolean;
  formats: string;
  costUSD?: number;
  processingDays?: number;
  whereToGet?: any;
  description?: string;
  tips?: string[];
  order?: number;
}

export class RequirementsService {
  /**
   * Bulk update requirements for a visa type
   */
  static async updateRequirements(
    countryCode: string,
    visaTypeName: string,
    requirements: RequirementData[],
    adminId: string
  ) {
    // Find country
    const country = await prisma.country.findUnique({
      where: { code: countryCode.toUpperCase() },
    });

    if (!country) {
      throw new Error(`Country not found: ${countryCode}`);
    }

    // Find visa type
    const visaType = await prisma.visaType.findFirst({
      where: {
        countryId: country.id,
        name: visaTypeName,
      },
    });

    if (!visaType) {
      throw new Error(`Visa type not found: ${visaTypeName}`);
    }

    // Delete existing requirements
    await prisma.visaRequirement.deleteMany({
      where: { visaTypeId: visaType.id },
    });

    // Create new requirements
    const created = await Promise.all(
      requirements.map((req, index) =>
        prisma.visaRequirement.create({
          data: {
            visaTypeId: visaType.id,
            docType: req.docType.toLowerCase(),
            displayName: req.displayName,
            description: req.description,
            isRequired: req.isRequired,
            formats: req.formats || "pdf,jpg,png",
            costUSD: req.costUSD,
            processingDays: req.processingDays,
            whereToGet: JSON.stringify(req.whereToGet || {}),
            tips: JSON.stringify(req.tips || []),
            order: req.order ?? index,
            updatedBy: adminId,
          },
        })
      )
    );

    return created;
  }

  /**
   * Get all requirements for a visa type
   */
  static async getRequirements(visaTypeId: string) {
    const requirements = await prisma.visaRequirement.findMany({
      where: { visaTypeId },
      orderBy: { order: "asc" },
    });

    return requirements.map(req => ({
      ...req,
      whereToGet: req.whereToGet ? JSON.parse(req.whereToGet) : {},
      tips: req.tips ? JSON.parse(req.tips) : [],
    }));
  }

  /**
   * Update single requirement
   */
  static async updateRequirement(
    requirementId: string,
    data: Partial<RequirementData>,
    adminId: string
  ) {
    const updated = await prisma.visaRequirement.update({
      where: { id: requirementId },
      data: {
        ...data,
        updatedBy: adminId,
      },
    });

    return updated;
  }

  /**
   * Get requirements that changed recently
   */
  static async getRecentChanges(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const changes = await prisma.visaRequirement.findMany({
      where: {
        updatedAt: {
          gte: since,
        },
      },
      include: {
        visaType: {
          include: {
            country: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return changes;
  }
}
```

#### Step 4: Create Admin API Endpoints
```typescript
// File: apps/backend/src/routes/admin.ts

import { Router, Request, Response } from "express";
import { RequirementsService } from "../services/requirements.service";
import { authMiddleware } from "../middleware/auth"; // Protect with auth

const router = Router();

// Middleware to check admin role
const adminOnly = async (req: Request, res: Response, next: any) => {
  // Add admin check logic
  const user = (req as any).user;
  if (user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

router.use(authMiddleware, adminOnly);

/**
 * POST /api/admin/requirements/bulk-update
 * Update requirements for multiple visa types
 */
router.post("/requirements/bulk-update", async (req: Request, res: Response) => {
  try {
    const updates = req.body.updates; // Array of updates
    const adminId = (req as any).user.id;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "updates must be an array" });
    }

    const results = [];

    for (const update of updates) {
      try {
        const result = await RequirementsService.updateRequirements(
          update.countryCode,
          update.visaType,
          update.requirements,
          adminId
        );

        results.push({
          countryCode: update.countryCode,
          visaType: update.visaType,
          status: "success",
          count: result.length,
        });
      } catch (error: any) {
        results.push({
          countryCode: update.countryCode,
          visaType: update.visaType,
          status: "error",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/requirements/changes
 * Get recent requirement changes
 */
router.get("/requirements/changes", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const changes = await RequirementsService.getRecentChanges(days);

    res.json({
      count: changes.length,
      changes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/requirements/visa/:visaTypeId
 * Get all requirements for a visa type
 */
router.get("/requirements/visa/:visaTypeId", async (req: Request, res: Response) => {
  try {
    const requirements = await RequirementsService.getRequirements(
      req.params.visaTypeId
    );

    res.json({
      count: requirements.length,
      requirements,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin/requirements/:requirementId
 * Update single requirement
 */
router.patch(
  "/requirements/:requirementId",
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const updated = await RequirementsService.updateRequirement(
        req.params.requirementId,
        req.body,
        adminId
      );

      res.json({
        success: true,
        requirement: updated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

---

## 📝 Data Import/Export Scripts

### Import from CSV
```typescript
// File: apps/backend/src/scripts/import-requirements.ts

import * as fs from "fs";
import * as csv from "csv-parse";
import { RequirementsService } from "../services/requirements.service";

/**
 * CSV Format:
 * CountryCode,VisaType,DocType,DisplayName,IsRequired,Formats,Cost,ProcessingDays
 * US,Student Visa,passport,Passport,true,pdf;jpg,0,0
 * US,Student Visa,bank_statement,Bank Statement,true,pdf,0,0
 */
async function importRequirementsFromCSV(
  filePath: string,
  adminId: string
) {
  const fileStream = fs.createReadStream(filePath);

  const records: any[] = [];

  const parser = fileStream
    .pipe(csv.parse({ columns: true }))
    .on("data", (row) => records.push(row));

  await new Promise((resolve, reject) => {
    parser.on("end", resolve);
    parser.on("error", reject);
  });

  // Group by country and visa type
  const grouped = records.reduce((acc: any, record: any) => {
    const key = `${record.CountryCode}|${record.VisaType}`;

    if (!acc[key]) {
      acc[key] = {
        countryCode: record.CountryCode,
        visaType: record.VisaType,
        requirements: [],
      };
    }

    acc[key].requirements.push({
      docType: record.DocType,
      displayName: record.DisplayName,
      isRequired: record.IsRequired === "true",
      formats: record.Formats.split(";").join(","),
      costUSD: record.Cost ? parseFloat(record.Cost) : undefined,
      processingDays: record.ProcessingDays
        ? parseInt(record.ProcessingDays)
        : undefined,
    });

    return acc;
  }, {});

  // Import each group
  for (const key in grouped) {
    const group = grouped[key];
    console.log(
      `Importing ${group.countryCode} - ${group.visaType}...`
    );

    try {
      await RequirementsService.updateRequirements(
        group.countryCode,
        group.visaType,
        group.requirements,
        adminId
      );
      console.log(`✓ Success`);
    } catch (error: any) {
      console.log(`✗ Error: ${error.message}`);
    }
  }
}

// Usage:
// importRequirementsFromCSV("requirements.csv", "admin-user-id")
```

### Export to JSON
```typescript
// Get all requirements
async function exportAllRequirements() {
  const countries = await prisma.country.findMany({
    include: {
      visaTypes: {
        include: {
          visaRequirements: true,
        },
      },
    },
  });

  const exported = countries.map(country => ({
    countryCode: country.code,
    countryName: country.name,
    visaTypes: country.visaTypes.map(vt => ({
      name: vt.name,
      fee: vt.fee,
      processingDays: vt.processingDays,
      requirements: vt.visaRequirements.map(req => ({
        docType: req.docType,
        displayName: req.displayName,
        isRequired: req.isRequired,
        formats: req.formats,
        cost: req.costUSD,
        processingDays: req.processingDays,
      })),
    })),
  }));

  fs.writeFileSync(
    "visa-requirements-export.json",
    JSON.stringify(exported, null, 2)
  );

  console.log("Exported to visa-requirements-export.json");
}
```

---

## 🎨 Admin Dashboard Mock-up

What the admin should see:

```
┌─────────────────────────────────────────┐
│ VisaBuddy Admin - Requirements Manager   │
├─────────────────────────────────────────┤
│                                         │
│ [Import CSV] [Export JSON] [Add New]   │
│                                         │
│ Filters:                                │
│ [Country ▼] [Visa Type ▼] [Status ▼]  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ ✓ USA - Student Visa (7 requirements)   │
│   Updated: 2024-11-01 by Admin         │
│                                         │
│   1. Passport                           │
│      Required ✓ | PDF, JPG, PNG        │
│      [Edit] [Delete]                   │
│                                         │
│   2. Bank Statement                     │
│      Required ✓ | PDF only             │
│      Cost: $0 | Processing: 1 day      │
│      [Edit] [Delete]                   │
│                                         │
│   [+ Add Requirement]                   │
│                                         │
│ ✓ UK - Student Visa (6 requirements)    │
│   [Expand] [Delete All]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 Usage Example: Full Workflow

### For Admin Adding New Visa Type:

```bash
# 1. Add country (already exists)

# 2. Add visa type (already exists)
POST /api/countries/{countryId}/visa-types
{
  "name": "Work Visa",
  "fee": 450,
  "processingDays": 30
}

# 3. Add requirements (new)
POST /api/admin/requirements/bulk-update
{
  "updates": [
    {
      "countryCode": "US",
      "visaType": "Work Visa",
      "requirements": [
        {
          "docType": "passport",
          "displayName": "Passport",
          "isRequired": true,
          "formats": "pdf,jpg",
          "description": "Valid for at least 6 months beyond stay"
        },
        {
          "docType": "labor_cert",
          "displayName": "Labor Certification",
          "isRequired": true,
          "formats": "pdf",
          "description": "From US Department of Labor"
        },
        {
          "docType": "offer_letter",
          "displayName": "Job Offer Letter",
          "isRequired": true,
          "formats": "pdf,doc",
          "costUSD": 0,
          "processingDays": 0
        }
      ]
    }
  ]
}
```

---

## ✅ Recommended Approach for MVP

**Use Option 1 (Simple)** for launch:
- ✅ Requires minimal code changes
- ✅ Works with existing database
- ✅ Easy to understand and maintain
- ✅ Can migrate to Option 2 later without breaking changes

**Migrate to Option 2 (Normalized)** in Phase 2:
- ✅ Better querying capability
- ✅ More flexible for complex rules
- ✅ Easier to track changes
- ✅ Can do audit trail

---

## 🔄 Migration Path (If using Option 1 first)

**Week 1**: Ship with Option 1 (JSON-based updates)
**Week 3-4**: Implement Option 2 (normalized table)
**Week 5**: Migrate existing data (automated script)
**Week 6**: Switch to new table in production

**Zero downtime migration** - both systems work in parallel during transition.

---

## 📋 Checklist for Document Management

- [ ] Choose Option 1 (Simple) or Option 2 (Normalized)
- [ ] Create admin API endpoints
- [ ] Build CSV import/export scripts
- [ ] Create admin dashboard UI
- [ ] Write tests for update logic
- [ ] Document the data format
- [ ] Create admin user guide
- [ ] Set up audit trail logging
- [ ] Deploy to production

---

## 🚀 TL;DR

**What to do NOW:**
1. **For MVP**: Use Option 1 (API endpoint + JSON)
2. **Time needed**: 1-2 hours to implement
3. **Go live with**: CSV import + manual bulk updates

**What to do LATER (Phase 2):**
1. Migrate to Option 2 (Normalized table)
2. Build admin dashboard
3. Add audit trail

This gives you flexibility for fast launch AND proper data management long-term.
