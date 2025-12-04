/**
 * Approve All Rulesets Script
 * Automatically approves all unapproved rulesets for the 10 countries × 2 visa types
 * 
 * Usage:
 *   npm run approve:all-rulesets              # Preview only
 *   npm run approve:all-rulesets -- --approve # Actually approve
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUNTRIES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'JP', 'AE'];
const VISA_TYPES = ['tourist', 'student'];

async function approveAllRulesets(actuallyApprove: boolean = false) {
  console.log('🔍 Finding all unapproved rulesets...\n');
  
  const results: Array<{
    country: string;
    visaType: string;
    found: boolean;
    approved: boolean;
    version?: number;
    id?: string;
  }> = [];

  for (const country of COUNTRIES) {
    for (const visaType of VISA_TYPES) {
      try {
        // Find the latest unapproved ruleset
        const latestUnapproved = await prisma.visaRuleSet.findFirst({
          where: {
            countryCode: country.toUpperCase(),
            visaType: visaType.toLowerCase(),
            isApproved: false,
          },
          orderBy: {
            version: 'desc',
          },
        });

        if (latestUnapproved) {
          if (actuallyApprove) {
            // Unapprove all other versions
            await prisma.visaRuleSet.updateMany({
              where: {
                countryCode: country.toUpperCase(),
                visaType: visaType.toLowerCase(),
                isApproved: true,
              },
              data: {
                isApproved: false,
                approvedAt: null,
                approvedBy: null,
              },
            });

            // Approve this version
            await prisma.visaRuleSet.update({
              where: { id: latestUnapproved.id },
              data: {
                isApproved: true,
                approvedAt: new Date(),
                approvedBy: 'system',
              },
            });

            results.push({
              country,
              visaType,
              found: true,
              approved: true,
              version: latestUnapproved.version,
              id: latestUnapproved.id,
            });
            console.log(`✅ Approved: ${country} ${visaType} (v${latestUnapproved.version})`);
          } else {
            results.push({
              country,
              visaType,
              found: true,
              approved: false,
              version: latestUnapproved.version,
              id: latestUnapproved.id,
            });
            console.log(`⚠️  Found (not approved): ${country} ${visaType} (v${latestUnapproved.version})`);
          }
        } else {
          // Check if there's an approved one
          const approved = await prisma.visaRuleSet.findFirst({
            where: {
              countryCode: country.toUpperCase(),
              visaType: visaType.toLowerCase(),
              isApproved: true,
            },
          });

          results.push({
            country,
            visaType,
            found: !!approved,
            approved: !!approved,
          });

          if (approved) {
            console.log(`✅ Already approved: ${country} ${visaType}`);
          } else {
            console.log(`❌ No ruleset found: ${country} ${visaType}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${country} ${visaType}:`, error.message);
        results.push({
          country,
          visaType,
          found: false,
          approved: false,
        });
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log('='.repeat(60));
  const found = results.filter(r => r.found).length;
  const approved = results.filter(r => r.approved).length;
  const missing = results.filter(r => !r.found).length;
  
  console.log(`Found rulesets: ${found}/20`);
  console.log(`Approved: ${approved}/20`);
  console.log(`Missing: ${missing}/20`);

  if (actuallyApprove) {
    console.log('\n✅ Approval complete!');
  } else {
    console.log('\n⚠️  DRY RUN - No changes made');
    console.log('   Run with --approve to actually approve rulesets');
  }

  await prisma.$disconnect();
}

// Parse command line arguments
const args = process.argv.slice(2);
const actuallyApprove = args.includes('--approve');

if (actuallyApprove) {
  console.log('⚠️  APPROVING ALL RULESETS...\n');
} else {
  console.log('🔍 DRY RUN MODE - Preview only\n');
}

approveAllRulesets(actuallyApprove).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

