/**
 * Fix VisaRuleSet Mismatches
 * 
 * This script fixes common mismatches in VisaRuleSet:
 * 1. Normalizes visa types (visitor → tourist for CA, AU, GB)
 * 2. Approves draft rules (if they are the latest version)
 * 3. Unapproves old versions (keeps only latest approved)
 * 
 * Usage: npx tsx scripts/fix-visa-ruleset-mismatches.ts
 */

import { PrismaClient } from '@prisma/client';
import { normalizeVisaTypeForRules } from '../src/utils/visa-type-aliases';
import { normalizeCountryCode } from '../src/config/country-registry';
import { logInfo, logWarn, logError } from '../src/middleware/logger';

const prisma = new PrismaClient();

interface FixResult {
  action: string;
  ruleId: string;
  countryCode: string;
  visaType: string;
  oldValue?: string;
  newValue?: string;
  success: boolean;
  error?: string;
}

async function fixVisaRuleSetMismatches() {
  console.log('\n===== FIXING VISA RULESET MISMATCHES =====\n');

  const results: FixResult[] = [];

  try {
    // 1. Get all rules
    const allRules = await prisma.visaRuleSet.findMany({
      orderBy: [
        { countryCode: 'asc' },
        { visaType: 'asc' },
        { version: 'desc' },
      ],
    });

    console.log(`Found ${allRules.length} rule(s) in database\n`);

    // 2. Fix visa type mismatches (normalize visitor → tourist for CA, AU, GB)
    console.log('-- Step 1: Normalizing visa types --\n');
    const countriesToNormalize = ['CA', 'AU', 'GB'];
    
    for (const rule of allRules) {
      if (countriesToNormalize.includes(rule.countryCode)) {
        const normalizedVisaType = normalizeVisaTypeForRules(rule.countryCode, rule.visaType);
        
        if (normalizedVisaType !== rule.visaType.toLowerCase()) {
          try {
            await prisma.visaRuleSet.update({
              where: { id: rule.id },
              data: { visaType: normalizedVisaType },
            });
            
            results.push({
              action: 'normalize_visa_type',
              ruleId: rule.id,
              countryCode: rule.countryCode,
              visaType: rule.visaType,
              oldValue: rule.visaType,
              newValue: normalizedVisaType,
              success: true,
            });
            
            console.log(`✅ Normalized: ${rule.countryCode} ${rule.visaType} → ${normalizedVisaType}`);
          } catch (error) {
            results.push({
              action: 'normalize_visa_type',
              ruleId: rule.id,
              countryCode: rule.countryCode,
              visaType: rule.visaType,
              oldValue: rule.visaType,
              newValue: normalizedVisaType,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
            
            console.log(`❌ Failed to normalize: ${rule.countryCode} ${rule.visaType} - ${error}`);
          }
        }
      }
    }

    // 3. Group rules by country+visaType and handle version conflicts
    console.log('\n-- Step 2: Handling version conflicts --\n');
    const ruleGroups = new Map<string, typeof allRules>();
    
    for (const rule of allRules) {
      const key = `${rule.countryCode}:${rule.visaType.toLowerCase()}`;
      if (!ruleGroups.has(key)) {
        ruleGroups.set(key, []);
      }
      ruleGroups.get(key)!.push(rule);
    }

    for (const [key, rules] of ruleGroups.entries()) {
      if (rules.length <= 1) continue;

      // Sort by version desc
      const sorted = [...rules].sort((a, b) => b.version - a.version);
      const latest = sorted[0];
      const oldVersions = sorted.slice(1);

      // If latest is approved, unapprove old approved versions
      if (latest.isApproved) {
        for (const old of oldVersions) {
          if (old.isApproved) {
            try {
              await prisma.visaRuleSet.update({
                where: { id: old.id },
                data: { isApproved: false },
              });
              
              results.push({
                action: 'unapprove_old_version',
                ruleId: old.id,
                countryCode: old.countryCode,
                visaType: old.visaType,
                oldValue: 'approved',
                newValue: 'draft',
                success: true,
              });
              
              console.log(`✅ Unapproved old version: ${old.countryCode} ${old.visaType} v${old.version}`);
            } catch (error) {
              results.push({
                action: 'unapprove_old_version',
                ruleId: old.id,
                countryCode: old.countryCode,
                visaType: old.visaType,
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });
              
              console.log(`❌ Failed to unapprove: ${old.countryCode} ${old.visaType} v${old.version}`);
            }
          }
        }
      }
    }

    // 4. Approve latest versions if they are draft (optional - commented out for safety)
    // Uncomment this section if you want to auto-approve draft rules
    /*
    console.log('\n-- Step 3: Approving latest draft rules --\n');
    for (const [key, rules] of ruleGroups.entries()) {
      const sorted = [...rules].sort((a, b) => b.version - a.version);
      const latest = sorted[0];
      
      if (!latest.isApproved) {
        try {
          await prisma.visaRuleSet.update({
            where: { id: latest.id },
            data: {
              isApproved: true,
              approvedAt: new Date(),
              approvedBy: 'system',
            },
          });
          
          results.push({
            action: 'approve_draft',
            ruleId: latest.id,
            countryCode: latest.countryCode,
            visaType: latest.visaType,
            oldValue: 'draft',
            newValue: 'approved',
            success: true,
          });
          
          console.log(`✅ Approved: ${latest.countryCode} ${latest.visaType} v${latest.version}`);
        } catch (error) {
          console.log(`❌ Failed to approve: ${latest.countryCode} ${latest.visaType} v${latest.version}`);
        }
      }
    }
    */

    // 5. Summary
    console.log('\n-- Fix Summary --\n');
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    
    console.log(`✅ Successful fixes: ${successful.length}`);
    console.log(`❌ Failed fixes: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\nSuccessful actions:');
      const byAction = new Map<string, number>();
      for (const r of successful) {
        byAction.set(r.action, (byAction.get(r.action) || 0) + 1);
      }
      for (const [action, count] of byAction.entries()) {
        console.log(`  - ${action}: ${count}`);
      }
    }
    
    if (failed.length > 0) {
      console.log('\nFailed actions:');
      for (const r of failed) {
        console.log(`  - ${r.action} (${r.countryCode} ${r.visaType}): ${r.error}`);
      }
    }

    console.log('\n===== FIX COMPLETE =====\n');
    
    return results;
  } catch (error) {
    logError('[FixVisaRuleSet] Error fixing mismatches', error as Error);
    throw error;
  }
}

// Run the fix
fixVisaRuleSetMismatches()
  .catch((e) => {
    console.error('Error running fix:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

