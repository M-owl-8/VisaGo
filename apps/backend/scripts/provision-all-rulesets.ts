/**
 * Provision VisaRuleSet entries for all Country + VisaType combinations
 * 
 * This script creates generic, approved VisaRuleSet entries for every
 * country and visa type combination in the database.
 * 
 * Usage:
 *   npm run provision:all-rulesets
 *   or
 *   ts-node --project scripts/tsconfig.json scripts/provision-all-rulesets.ts
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_GENERIC_RULESET_DATA } from '../src/data/generic-ruleset';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { normalizeCountryCode } from '../src/config/country-registry';
import { normalizeVisaTypeForRules } from '../src/utils/visa-type-aliases';

const prisma = new PrismaClient();

async function provisionAllRuleSets() {
  console.log('🚀 Starting VisaRuleSet provisioning for all countries and visa types...\n');

  try {
    // Get all countries
    const countries = await prisma.country.findMany({
      orderBy: { code: 'asc' },
    });

    console.log(`📋 Found ${countries.length} countries\n`);

    let totalRuleSets = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    // Process each country
    for (const country of countries) {
      const normalizedCountryCode = normalizeCountryCode(country.code) || country.code.toUpperCase();

      // Get all visa types for this country
      const visaTypes = await prisma.visaType.findMany({
        where: { countryId: country.id },
        orderBy: { name: 'asc' },
      });

      if (visaTypes.length === 0) {
        console.log(`⚠️  ${country.name} (${normalizedCountryCode}): No visa types found, skipping`);
        continue;
      }

      console.log(`\n🌍 ${country.name} (${normalizedCountryCode}): ${visaTypes.length} visa types`);

      // Process each visa type
      for (const visaType of visaTypes) {
        totalRuleSets++;
        const normalizedVisaType = normalizeVisaTypeForRules(normalizedCountryCode, visaType.name);

        try {
          // Check if rule set already exists
          const existing = await prisma.visaRuleSet.findFirst({
            where: {
              countryCode: normalizedCountryCode,
              visaType: normalizedVisaType,
              isApproved: true,
            },
            orderBy: { version: 'desc' },
          });

          if (existing) {
            skipped++;
            continue; // Skip if already exists
          }

          // Create new rule set
          const serializedData = JSON.stringify(DEFAULT_GENERIC_RULESET_DATA);

          const createdRuleSet = await prisma.visaRuleSet.create({
            data: {
              countryCode: normalizedCountryCode,
              visaType: normalizedVisaType,
              data: serializedData as any,
              version: 1,
              createdBy: 'system',
              sourceSummary: 'Auto-provisioned generic ruleset (editable)',
              isApproved: true,
              approvedAt: new Date(),
              approvedBy: 'system',
            },
          });

          // Create version record
          await prisma.visaRuleVersion.create({
            data: {
              ruleSetId: createdRuleSet.id,
              version: 1,
              data: serializedData as any,
              changeLog: 'Auto-provisioned generic ruleset',
            },
          });

          created++;
          if (created % 50 === 0) {
            console.log(`   ✅ Created ${created} rule sets so far...`);
          }
        } catch (error: any) {
          errors++;
          console.error(`   ❌ Error creating rule set for ${normalizedCountryCode}/${normalizedVisaType}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Provisioning Summary:');
    console.log('='.repeat(60));
    console.log(`Total combinations checked: ${totalRuleSets}`);
    console.log(`✅ Created: ${created}`);
    console.log(`⏭️  Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Verify final count
    const totalRuleSetsInDb = await prisma.visaRuleSet.count({
      where: { isApproved: true },
    });

    console.log(`\n📈 Total approved rule sets in database: ${totalRuleSetsInDb}`);
    console.log(`📈 Expected: ~${countries.length} countries × 6 visa types = ~${countries.length * 6} rule sets\n`);

    if (totalRuleSetsInDb >= countries.length * 5) {
      console.log('✅ Success! All rule sets have been provisioned.');
    } else {
      console.log('⚠️  Warning: Expected more rule sets. Some combinations may be missing.');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
provisionAllRuleSets()
  .then(() => {
    console.log('\n✨ Provisioning complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Provisioning failed:', error);
    process.exit(1);
  });

