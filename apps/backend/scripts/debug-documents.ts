import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also try loading from root .env if it exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback to default dotenv behavior
dotenv.config();

// Determine which database to use
let databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const isProduction = databaseUrl.includes('postgres') || databaseUrl.includes('railway') || databaseUrl.includes('gondola');

// Add SSL parameters for Railway/PostgreSQL connections if not already present
if (isProduction && !databaseUrl.includes('?') && !databaseUrl.includes('sslmode')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${separator}sslmode=require`;
}

console.log('\n📊 Database Configuration:');
console.log(`   Type: ${isProduction ? 'PostgreSQL (Production)' : 'SQLite (Local)'}`);
console.log(`   URL: ${databaseUrl.substring(0, 50)}${databaseUrl.length > 50 ? '...' : ''}`);

if (!isProduction) {
  console.log('\n⚠️  WARNING: Using local SQLite database.');
  console.log('   To debug production data, set DATABASE_URL to your Railway PostgreSQL URL:');
  console.log('   $env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
  console.log('   Or add it to apps/backend/.env file\n');
}

// Create Prisma client with datasource override to handle both SQLite and PostgreSQL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  const applicationId = 'cmipymhi800019p85dg3w9whe';

  console.log('🔍 Debugging Documents for Application:', applicationId);
  console.log('='.repeat(60));

  try {
    // Fetch all UserDocument rows for this application
    const userDocuments = await prisma.userDocument.findMany({
      where: {
        applicationId,
      },
      select: {
        id: true,
        documentType: true,
        status: true,
        verifiedByAI: true,
        aiConfidence: true,
        aiNotesUz: true,
        aiNotesRu: true,
        aiNotesEn: true,
        fileName: true,
        fileUrl: true,
        uploadedAt: true,
        createdAt: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    console.log('\n📄 UserDocuments found:', userDocuments.length);
    userDocuments.forEach((doc, i) => {
      console.log(`\n  Document ${i + 1}:`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    documentType: "${doc.documentType}" (length: ${doc.documentType.length})`);
      console.log(`    status: ${doc.status}`);
      console.log(`    verifiedByAI: ${doc.verifiedByAI}`);
      console.log(`    aiConfidence: ${doc.aiConfidence}`);
      console.log(`    fileName: ${doc.fileName}`);
      console.log(`    uploadedAt: ${doc.uploadedAt?.toISOString()}`);
      if (doc.aiNotesUz) console.log(`    aiNotesUz: ${doc.aiNotesUz.substring(0, 100)}...`);
      if (doc.aiNotesRu) console.log(`    aiNotesRu: ${doc.aiNotesRu.substring(0, 100)}...`);
      if (doc.aiNotesEn) console.log(`    aiNotesEn: ${doc.aiNotesEn.substring(0, 100)}...`);
      
      // Show character codes to detect hidden characters
      const charCodes = doc.documentType.split('').map((c, idx) => ({
        char: c,
        code: c.charCodeAt(0),
        pos: idx,
      }));
      console.log(`    documentType char codes:`, charCodes);
    });

    // Fetch DocumentChecklist for this application
    const checklist = await prisma.documentChecklist.findUnique({
      where: {
        applicationId,
      },
    });

    if (!checklist) {
      console.log('\n❌ No DocumentChecklist found for this application');
      return;
    }

    console.log('\n📋 DocumentChecklist found:');
    console.log(`    Status: ${checklist.status}`);
    console.log(`    AI Generated: ${checklist.aiGenerated}`);
    console.log(`    Generated At: ${checklist.generatedAt?.toISOString()}`);

    // Parse checklistData
    let checklistItems: any[] = [];
    if (checklist.checklistData) {
      try {
        const parsed = JSON.parse(checklist.checklistData);
        checklistItems = Array.isArray(parsed) ? parsed : parsed.items || parsed.checklist || [];
      } catch (e) {
        console.log('\n❌ Error parsing checklistData:', e);
        return;
      }
    }

    console.log(`\n📝 Checklist Items found: ${checklistItems.length}`);
    checklistItems.forEach((item, i) => {
      const docType = item.documentType || item.document;
      console.log(`\n  Item ${i + 1}:`);
      console.log(`    documentType: "${docType}" (length: ${docType?.length || 0})`);
      console.log(`    name: ${item.name || 'N/A'}`);
      console.log(`    status: ${item.status || 'N/A'}`);
      
      if (docType) {
        const charCodes = docType.split('').map((c: string, idx: number) => ({
          char: c,
          code: c.charCodeAt(0),
          pos: idx,
        }));
        console.log(`    documentType char codes:`, charCodes);
      }
    });

    // Create comparison report
    const documentTypes = userDocuments.map(d => d.documentType);
    const checklistItemTypes = checklistItems.map(i => i.documentType || i.document).filter(Boolean);

    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARISON REPORT');
    console.log('='.repeat(60));
    console.log('\nUserDocument documentTypes:');
    documentTypes.forEach((dt, i) => {
      console.log(`  ${i + 1}. "${dt}"`);
    });

    console.log('\nChecklist Item documentTypes:');
    checklistItemTypes.forEach((dt, i) => {
      console.log(`  ${i + 1}. "${dt}"`);
    });

    console.log('\n🔍 Matching Analysis:');
    documentTypes.forEach((docType) => {
      const found = checklistItemTypes.find((itemType) => itemType === docType);
      if (found) {
        console.log(`  ✅ "${docType}" - MATCHED`);
      } else {
        console.log(`  ❌ "${docType}" - NOT FOUND in checklist items`);
        // Try to find similar ones
        const similar = checklistItemTypes.filter((itemType) => 
          itemType.toLowerCase() === docType.toLowerCase() ||
          itemType.replace(/\s+/g, '_') === docType ||
          docType.replace(/\s+/g, '_') === itemType
        );
        if (similar.length > 0) {
          console.log(`     Similar items found: ${similar.map(s => `"${s}"`).join(', ')}`);
        }
      }
    });

    // JSON report
    const report = {
      applicationId,
      userDocuments: userDocuments.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        status: doc.status,
        verifiedByAI: doc.verifiedByAI,
        aiConfidence: doc.aiConfidence,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt?.toISOString(),
      })),
      checklistItemTypes: checklistItems.map(item => ({
        documentType: item.documentType || item.document,
        status: item.status,
        name: item.name,
      })),
      comparison: {
        documentTypesInDB: documentTypes,
        documentTypesInChecklist: checklistItemTypes,
        matches: documentTypes.map(dt => ({
          documentType: dt,
          found: checklistItemTypes.includes(dt),
          similar: checklistItemTypes.filter((it) => 
            it.toLowerCase() === dt.toLowerCase() ||
            it.replace(/\s+/g, '_') === dt ||
            dt.replace(/\s+/g, '_') === it
          ),
        })),
      },
    };

    console.log('\n' + '='.repeat(60));
    console.log('📋 JSON REPORT');
    console.log('='.repeat(60));
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

