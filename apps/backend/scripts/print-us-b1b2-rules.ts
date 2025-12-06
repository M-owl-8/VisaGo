/**
 * Print Current US B1/B2 Rule Set
 * 
 * Prints the current VisaRuleSetData for US/tourist to see what's actually in the database.
 */

import { PrismaClient } from '@prisma/client';
import { VisaRulesService } from '../src/services/visa-rules.service';

const prisma = new PrismaClient();

async function main() {
  try {
    const countryCode = 'US';
    const visaType = 'tourist';

    const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

    if (!ruleSet) {
      console.log('❌ No approved rule set found for US/tourist');
      return;
    }

    console.log('\n📋 Current US B1/B2 (tourist) Rule Set:');
    console.log(`   Version: ${ruleSet.version || 1}`);
    console.log(`   Total Documents: ${ruleSet.requiredDocuments?.length || 0}\n`);

    console.log('Documents with conditions:');
    console.log('─'.repeat(80));
    
    ruleSet.requiredDocuments?.forEach((doc, index) => {
      const condition = doc.condition || 'NO CONDITION';
      const category = doc.category.padEnd(20);
      console.log(`${(index + 1).toString().padStart(2)}. ${doc.documentType.padEnd(35)} | ${category} | ${condition}`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Required: ${ruleSet.requiredDocuments?.filter(d => d.category === 'required').length || 0}`);
    console.log(`   Highly Recommended: ${ruleSet.requiredDocuments?.filter(d => d.category === 'highly_recommended').length || 0}`);
    console.log(`   Optional: ${ruleSet.requiredDocuments?.filter(d => d.category === 'optional').length || 0}`);
    console.log(`   With Conditions: ${ruleSet.requiredDocuments?.filter(d => d.condition).length || 0}`);
    console.log(`   Without Conditions: ${ruleSet.requiredDocuments?.filter(d => !d.condition).length || 0}\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

