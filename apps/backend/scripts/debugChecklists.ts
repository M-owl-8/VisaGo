/**
 * Debug script to check which table contains application IDs
 * 
 * Usage:
 *   cd apps/backend
 *   DATABASE_URL="your-railway-postgres-url" ts-node --project scripts/tsconfig.json scripts/debugChecklists.ts <applicationId>
 * 
 * This script is read-only and does not modify any data.
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function debugApplication(applicationId: string) {
  console.log(`\n🔍 Debugging application ID: ${applicationId}\n`);

  try {
    // Check VisaApplication table (the one actually used by the API)
    const visaApp = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        userId: true,
        countryId: true,
        visaTypeId: true,
        status: true,
        createdAt: true,
      },
    });

    // Check Application table (the one DocumentChecklist FK currently points to)
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        userId: true,
        countryId: true,
        visaTypeId: true,
        status: true,
        createdAt: true,
      },
    });

    console.log('📊 Results:');
    console.log('─'.repeat(60));
    
    if (visaApp) {
      console.log('✅ Found in VisaApplication table:');
      console.log(`   ID: ${visaApp.id}`);
      console.log(`   User ID: ${visaApp.userId}`);
      console.log(`   Country: ${visaApp.countryId}`);
      console.log(`   Visa Type: ${visaApp.visaTypeId}`);
      console.log(`   Status: ${visaApp.status}`);
      console.log(`   Created: ${visaApp.createdAt}`);
    } else {
      console.log('❌ NOT found in VisaApplication table');
    }

    console.log('');

    if (app) {
      console.log('✅ Found in Application table:');
      console.log(`   ID: ${app.id}`);
      console.log(`   User ID: ${app.userId}`);
      console.log(`   Country: ${app.countryId}`);
      console.log(`   Visa Type: ${app.visaTypeId}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Created: ${app.createdAt}`);
    } else {
      console.log('❌ NOT found in Application table');
    }

    console.log('─'.repeat(60));
    console.log('');

    // Check DocumentChecklist
    const checklist = await prisma.documentChecklist.findUnique({
      where: { applicationId },
    });

    if (checklist) {
      console.log('📋 DocumentChecklist entry exists:');
      console.log(`   Status: ${checklist.status}`);
      console.log(`   Created: ${checklist.createdAt}`);
    } else {
      console.log('📋 No DocumentChecklist entry found');
    }

    console.log('');

    // Analysis
    if (visaApp && !app) {
      console.log('⚠️  MISMATCH DETECTED:');
      console.log('   - Application exists in VisaApplication (used by API)');
      console.log('   - Application does NOT exist in Application table');
      console.log('   - DocumentChecklist FK points to Application table');
      console.log('   - This will cause FK violation when trying to create DocumentChecklist');
    } else if (app && !visaApp) {
      console.log('⚠️  UNUSUAL: Application exists in Application but not VisaApplication');
    } else if (visaApp && app) {
      console.log('✅ Application exists in both tables (unusual but OK)');
    } else {
      console.log('❌ Application not found in either table');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get application ID from command line
const applicationId = process.argv[2];

if (!applicationId) {
  console.error('Usage: ts-node scripts/debugChecklists.ts <applicationId>');
  console.error('Example: ts-node scripts/debugChecklists.ts cmigd1tpo0001127dirrpa5tf');
  process.exit(1);
}

debugApplication(applicationId).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

