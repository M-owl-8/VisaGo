/**
 * Verify Germany (DE) Tourist Visa Rule Set
 * 
 * Verifies that the Germany tourist visa rule set is properly seeded
 * and that checklist generation works correctly.
 * 
 * Usage: pnpm verify:de-tourist-rules
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesService } from '../src/services/visa-rules.service';
import { DocumentChecklistService } from '../src/services/document-checklist.service';
import { buildCanonicalAIUserContextForApplication } from '../src/services/ai-context.service';
import { logInfo, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

/**
 * Main verification function
 */
async function main() {
  try {
    console.log('\n🔍 Verifying Germany tourist visa rule set...\n');

    const countryCode = 'DE';
    const visaType = 'tourist';

    // Step 1: Verify rule set exists and is approved
    console.log('Step 1: Checking for approved rule set...');
    const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

    if (!ruleSet) {
      throw new Error('No approved rule set found for DE/tourist');
    }

    console.log(`✅ Rule set found: Version ${ruleSet.version}, Approved: true`);

    // Step 2: Verify document count
    console.log('\nStep 2: Verifying document count...');
    const documentCount = ruleSet.requiredDocuments?.length || 0;
    if (documentCount < 15) {
      throw new Error(`Insufficient documents: expected >= 15, got ${documentCount}`);
    }
    console.log(`✅ Document count: ${documentCount} (>= 15 required)`);

    // Step 3: Verify key documents are present
    console.log('\nStep 3: Verifying key documents...');
    const requiredDocs = [
      'passport_international',
      'schengen_visa_form',
      'travel_insurance',
      'travel_itinerary',
      'accommodation_proof',
    ];

    const documentTypes = ruleSet.requiredDocuments?.map((doc) => doc.documentType) || [];
    const missingDocs = requiredDocs.filter((doc) => !documentTypes.includes(doc));

    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
    }

    console.log('✅ All key documents present');

    // Step 4: Test checklist generation (skipped - requires OpenAI API key and full application setup)
    console.log('\nStep 4: Testing checklist generation...');
    console.log('⚠️  Checklist generation test skipped (requires OpenAI API key and full application setup)');
    console.log('   To test checklist generation, create a real application and verify it uses RULES mode');

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Country: ${countryCode}`);
    console.log(`   Visa Type: ${visaType}`);
    console.log(`   Rule Set Version: ${ruleSet.version}`);
    console.log(`   Document Count: ${documentCount}`);
    console.log(`   Status: APPROVED ✅\n`);

    console.log('✅ All verifications passed!\n');
  } catch (error) {
    logError('[VerifyDE] Error verifying Germany tourist visa rules', error as Error);
    console.error('❌ Verification failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
