/**
 * Check Launch Readiness Script
 * 
 * Validates that all 10×2 combinations have VisaType and checks VisaRuleSet coverage
 * 
 * Usage: ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 10 target countries (FINAL - locked for launch)
const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'UAE' },
];

const VISA_TYPES = ['tourist', 'student'] as const;

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

interface CoverageResult {
  countryCode: string;
  countryName: string;
  visaType: string;
  visaTypeExists: boolean;
  visaRuleSetExists: boolean;
  isApproved: boolean;
  embassySourceExists: boolean;
  status: 'PASS' | 'WARN' | 'FAIL';
}

async function checkLaunchReadiness(): Promise<void> {
  console.log('🔍 Checking Launch Readiness for 10 Countries × 2 Visa Types\n');
  console.log('='.repeat(80));

  const results: CoverageResult[] = [];

  for (const country of TARGET_COUNTRIES) {
    for (const visaType of VISA_TYPES) {
      // Check VisaType existence
      const visaTypeRecord = await prisma.visaType.findFirst({
        where: {
          name: {
            contains: visaType,
            mode: 'insensitive',
          },
        },
      });
      const visaTypeExists = !!visaTypeRecord;

      // Check VisaRuleSet existence and approval
      const ruleSetRecord = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: country.code.toUpperCase(),
          visaType: visaType.toLowerCase(),
        },
        orderBy: {
          version: 'desc',
        },
      });
      const visaRuleSetExists = !!ruleSetRecord;
      const isApproved = ruleSetRecord?.isApproved || false;

      // Check EmbassySource existence
      const embassySource = await prisma.embassySource.findFirst({
        where: {
          countryCode: country.code,
          visaType: visaType,
          isActive: true,
        },
      });
      const embassySourceExists = !!embassySource;

      // Determine status
      let status: 'PASS' | 'WARN' | 'FAIL' = 'FAIL';
      if (visaTypeExists && visaRuleSetExists && isApproved && embassySourceExists) {
        status = 'PASS';
      } else if (visaTypeExists && (visaRuleSetExists || embassySourceExists)) {
        status = 'WARN';
      }

      results.push({
        countryCode: country.code,
        countryName: country.name,
        visaType,
        visaTypeExists,
        visaRuleSetExists,
        isApproved,
        embassySourceExists,
        status,
      });
    }
  }

  // Print results table
  console.log('\n📊 Coverage Results:\n');
  console.log(
    'Country'.padEnd(20) +
    'Visa Type'.padEnd(15) +
    'VisaType'.padEnd(12) +
    'RuleSet'.padEnd(12) +
    'Approved'.padEnd(12) +
    'Embassy'.padEnd(12) +
    'Status'
  );
  console.log('-'.repeat(80));

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const result of results) {
    const statusIcon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    console.log(
      result.countryName.padEnd(20) +
      result.visaType.padEnd(15) +
      (result.visaTypeExists ? '✓' : '✗').padEnd(12) +
      (result.visaRuleSetExists ? '✓' : '✗').padEnd(12) +
      (result.isApproved ? '✓' : '✗').padEnd(12) +
      (result.embassySourceExists ? '✓' : '✗').padEnd(12) +
      statusIcon + ' ' + result.status
    );

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Summary:');
  console.log(`   ✅ PASS: ${passCount}/${results.length}`);
  console.log(`   ⚠️  WARN: ${warnCount}/${results.length}`);
  console.log(`   ❌ FAIL: ${failCount}/${results.length}`);

  // Detailed breakdown
  console.log('\n📋 Detailed Breakdown:\n');

  const missingVisaTypes = results.filter((r) => !r.visaTypeExists);
  if (missingVisaTypes.length > 0) {
    console.log('❌ Missing VisaType:');
    missingVisaTypes.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const missingRuleSets = results.filter((r) => !r.visaRuleSetExists);
  if (missingRuleSets.length > 0) {
    console.log('\n❌ Missing VisaRuleSet:');
    missingRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const unapprovedRuleSets = results.filter(
    (r) => r.visaRuleSetExists && !r.isApproved
  );
  if (unapprovedRuleSets.length > 0) {
    console.log('\n⚠️  Unapproved VisaRuleSet (need manual approval):');
    unapprovedRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType} (run: npm run approve:visarules -- ${r.countryCode} ${r.visaType} --approve)`);
    });
  }

  const missingEmbassySources = results.filter((r) => !r.embassySourceExists);
  if (missingEmbassySources.length > 0) {
    console.log('\n❌ Missing EmbassySource:');
    missingEmbassySources.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failCount === 0 && warnCount === 0) {
    console.log('✅ LAUNCH READY: All combinations are fully configured!');
    process.exit(0);
  } else if (failCount === 0) {
    console.log('⚠️  LAUNCH READY (with warnings): All combinations have basic setup, but some need approval.');
    process.exit(0);
  } else {
    console.log('❌ NOT LAUNCH READY: Some combinations are missing critical components.');
    console.log('   Please fix the issues above before launching.');
    process.exit(1);
  }
}

checkLaunchReadiness()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


 * 
 * Validates that all 10×2 combinations have VisaType and checks VisaRuleSet coverage
 * 
 * Usage: ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 10 target countries (FINAL - locked for launch)
const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'UAE' },
];

const VISA_TYPES = ['tourist', 'student'] as const;

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

interface CoverageResult {
  countryCode: string;
  countryName: string;
  visaType: string;
  visaTypeExists: boolean;
  visaRuleSetExists: boolean;
  isApproved: boolean;
  embassySourceExists: boolean;
  status: 'PASS' | 'WARN' | 'FAIL';
}

async function checkLaunchReadiness(): Promise<void> {
  console.log('🔍 Checking Launch Readiness for 10 Countries × 2 Visa Types\n');
  console.log('='.repeat(80));

  const results: CoverageResult[] = [];

  for (const country of TARGET_COUNTRIES) {
    for (const visaType of VISA_TYPES) {
      // Check VisaType existence
      const visaTypeRecord = await prisma.visaType.findFirst({
        where: {
          name: {
            contains: visaType,
            mode: 'insensitive',
          },
        },
      });
      const visaTypeExists = !!visaTypeRecord;

      // Check VisaRuleSet existence and approval
      const ruleSetRecord = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: country.code.toUpperCase(),
          visaType: visaType.toLowerCase(),
        },
        orderBy: {
          version: 'desc',
        },
      });
      const visaRuleSetExists = !!ruleSetRecord;
      const isApproved = ruleSetRecord?.isApproved || false;

      // Check EmbassySource existence
      const embassySource = await prisma.embassySource.findFirst({
        where: {
          countryCode: country.code,
          visaType: visaType,
          isActive: true,
        },
      });
      const embassySourceExists = !!embassySource;

      // Determine status
      let status: 'PASS' | 'WARN' | 'FAIL' = 'FAIL';
      if (visaTypeExists && visaRuleSetExists && isApproved && embassySourceExists) {
        status = 'PASS';
      } else if (visaTypeExists && (visaRuleSetExists || embassySourceExists)) {
        status = 'WARN';
      }

      results.push({
        countryCode: country.code,
        countryName: country.name,
        visaType,
        visaTypeExists,
        visaRuleSetExists,
        isApproved,
        embassySourceExists,
        status,
      });
    }
  }

  // Print results table
  console.log('\n📊 Coverage Results:\n');
  console.log(
    'Country'.padEnd(20) +
    'Visa Type'.padEnd(15) +
    'VisaType'.padEnd(12) +
    'RuleSet'.padEnd(12) +
    'Approved'.padEnd(12) +
    'Embassy'.padEnd(12) +
    'Status'
  );
  console.log('-'.repeat(80));

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const result of results) {
    const statusIcon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    console.log(
      result.countryName.padEnd(20) +
      result.visaType.padEnd(15) +
      (result.visaTypeExists ? '✓' : '✗').padEnd(12) +
      (result.visaRuleSetExists ? '✓' : '✗').padEnd(12) +
      (result.isApproved ? '✓' : '✗').padEnd(12) +
      (result.embassySourceExists ? '✓' : '✗').padEnd(12) +
      statusIcon + ' ' + result.status
    );

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Summary:');
  console.log(`   ✅ PASS: ${passCount}/${results.length}`);
  console.log(`   ⚠️  WARN: ${warnCount}/${results.length}`);
  console.log(`   ❌ FAIL: ${failCount}/${results.length}`);

  // Detailed breakdown
  console.log('\n📋 Detailed Breakdown:\n');

  const missingVisaTypes = results.filter((r) => !r.visaTypeExists);
  if (missingVisaTypes.length > 0) {
    console.log('❌ Missing VisaType:');
    missingVisaTypes.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const missingRuleSets = results.filter((r) => !r.visaRuleSetExists);
  if (missingRuleSets.length > 0) {
    console.log('\n❌ Missing VisaRuleSet:');
    missingRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const unapprovedRuleSets = results.filter(
    (r) => r.visaRuleSetExists && !r.isApproved
  );
  if (unapprovedRuleSets.length > 0) {
    console.log('\n⚠️  Unapproved VisaRuleSet (need manual approval):');
    unapprovedRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType} (run: npm run approve:visarules -- ${r.countryCode} ${r.visaType} --approve)`);
    });
  }

  const missingEmbassySources = results.filter((r) => !r.embassySourceExists);
  if (missingEmbassySources.length > 0) {
    console.log('\n❌ Missing EmbassySource:');
    missingEmbassySources.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failCount === 0 && warnCount === 0) {
    console.log('✅ LAUNCH READY: All combinations are fully configured!');
    process.exit(0);
  } else if (failCount === 0) {
    console.log('⚠️  LAUNCH READY (with warnings): All combinations have basic setup, but some need approval.');
    process.exit(0);
  } else {
    console.log('❌ NOT LAUNCH READY: Some combinations are missing critical components.');
    console.log('   Please fix the issues above before launching.');
    process.exit(1);
  }
}

checkLaunchReadiness()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


 * 
 * Validates that all 10×2 combinations have VisaType and checks VisaRuleSet coverage
 * 
 * Usage: ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 10 target countries (FINAL - locked for launch)
const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'UAE' },
];

const VISA_TYPES = ['tourist', 'student'] as const;

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

interface CoverageResult {
  countryCode: string;
  countryName: string;
  visaType: string;
  visaTypeExists: boolean;
  visaRuleSetExists: boolean;
  isApproved: boolean;
  embassySourceExists: boolean;
  status: 'PASS' | 'WARN' | 'FAIL';
}

async function checkLaunchReadiness(): Promise<void> {
  console.log('🔍 Checking Launch Readiness for 10 Countries × 2 Visa Types\n');
  console.log('='.repeat(80));

  const results: CoverageResult[] = [];

  for (const country of TARGET_COUNTRIES) {
    for (const visaType of VISA_TYPES) {
      // Check VisaType existence
      const visaTypeRecord = await prisma.visaType.findFirst({
        where: {
          name: {
            contains: visaType,
            mode: 'insensitive',
          },
        },
      });
      const visaTypeExists = !!visaTypeRecord;

      // Check VisaRuleSet existence and approval
      const ruleSetRecord = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: country.code.toUpperCase(),
          visaType: visaType.toLowerCase(),
        },
        orderBy: {
          version: 'desc',
        },
      });
      const visaRuleSetExists = !!ruleSetRecord;
      const isApproved = ruleSetRecord?.isApproved || false;

      // Check EmbassySource existence
      const embassySource = await prisma.embassySource.findFirst({
        where: {
          countryCode: country.code,
          visaType: visaType,
          isActive: true,
        },
      });
      const embassySourceExists = !!embassySource;

      // Determine status
      let status: 'PASS' | 'WARN' | 'FAIL' = 'FAIL';
      if (visaTypeExists && visaRuleSetExists && isApproved && embassySourceExists) {
        status = 'PASS';
      } else if (visaTypeExists && (visaRuleSetExists || embassySourceExists)) {
        status = 'WARN';
      }

      results.push({
        countryCode: country.code,
        countryName: country.name,
        visaType,
        visaTypeExists,
        visaRuleSetExists,
        isApproved,
        embassySourceExists,
        status,
      });
    }
  }

  // Print results table
  console.log('\n📊 Coverage Results:\n');
  console.log(
    'Country'.padEnd(20) +
    'Visa Type'.padEnd(15) +
    'VisaType'.padEnd(12) +
    'RuleSet'.padEnd(12) +
    'Approved'.padEnd(12) +
    'Embassy'.padEnd(12) +
    'Status'
  );
  console.log('-'.repeat(80));

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const result of results) {
    const statusIcon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    console.log(
      result.countryName.padEnd(20) +
      result.visaType.padEnd(15) +
      (result.visaTypeExists ? '✓' : '✗').padEnd(12) +
      (result.visaRuleSetExists ? '✓' : '✗').padEnd(12) +
      (result.isApproved ? '✓' : '✗').padEnd(12) +
      (result.embassySourceExists ? '✓' : '✗').padEnd(12) +
      statusIcon + ' ' + result.status
    );

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Summary:');
  console.log(`   ✅ PASS: ${passCount}/${results.length}`);
  console.log(`   ⚠️  WARN: ${warnCount}/${results.length}`);
  console.log(`   ❌ FAIL: ${failCount}/${results.length}`);

  // Detailed breakdown
  console.log('\n📋 Detailed Breakdown:\n');

  const missingVisaTypes = results.filter((r) => !r.visaTypeExists);
  if (missingVisaTypes.length > 0) {
    console.log('❌ Missing VisaType:');
    missingVisaTypes.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const missingRuleSets = results.filter((r) => !r.visaRuleSetExists);
  if (missingRuleSets.length > 0) {
    console.log('\n❌ Missing VisaRuleSet:');
    missingRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const unapprovedRuleSets = results.filter(
    (r) => r.visaRuleSetExists && !r.isApproved
  );
  if (unapprovedRuleSets.length > 0) {
    console.log('\n⚠️  Unapproved VisaRuleSet (need manual approval):');
    unapprovedRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType} (run: npm run approve:visarules -- ${r.countryCode} ${r.visaType} --approve)`);
    });
  }

  const missingEmbassySources = results.filter((r) => !r.embassySourceExists);
  if (missingEmbassySources.length > 0) {
    console.log('\n❌ Missing EmbassySource:');
    missingEmbassySources.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failCount === 0 && warnCount === 0) {
    console.log('✅ LAUNCH READY: All combinations are fully configured!');
    process.exit(0);
  } else if (failCount === 0) {
    console.log('⚠️  LAUNCH READY (with warnings): All combinations have basic setup, but some need approval.');
    process.exit(0);
  } else {
    console.log('❌ NOT LAUNCH READY: Some combinations are missing critical components.');
    console.log('   Please fix the issues above before launching.');
    process.exit(1);
  }
}

checkLaunchReadiness()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


 * 
 * Validates that all 10×2 combinations have VisaType and checks VisaRuleSet coverage
 * 
 * Usage: ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 10 target countries (FINAL - locked for launch)
const TARGET_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'UAE' },
];

const VISA_TYPES = ['tourist', 'student'] as const;

/**
 * Normalize visa type (strip "visa" suffix)
 */
function normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}

interface CoverageResult {
  countryCode: string;
  countryName: string;
  visaType: string;
  visaTypeExists: boolean;
  visaRuleSetExists: boolean;
  isApproved: boolean;
  embassySourceExists: boolean;
  status: 'PASS' | 'WARN' | 'FAIL';
}

async function checkLaunchReadiness(): Promise<void> {
  console.log('🔍 Checking Launch Readiness for 10 Countries × 2 Visa Types\n');
  console.log('='.repeat(80));

  const results: CoverageResult[] = [];

  for (const country of TARGET_COUNTRIES) {
    for (const visaType of VISA_TYPES) {
      // Check VisaType existence
      const visaTypeRecord = await prisma.visaType.findFirst({
        where: {
          name: {
            contains: visaType,
            mode: 'insensitive',
          },
        },
      });
      const visaTypeExists = !!visaTypeRecord;

      // Check VisaRuleSet existence and approval
      const ruleSetRecord = await prisma.visaRuleSet.findFirst({
        where: {
          countryCode: country.code.toUpperCase(),
          visaType: visaType.toLowerCase(),
        },
        orderBy: {
          version: 'desc',
        },
      });
      const visaRuleSetExists = !!ruleSetRecord;
      const isApproved = ruleSetRecord?.isApproved || false;

      // Check EmbassySource existence
      const embassySource = await prisma.embassySource.findFirst({
        where: {
          countryCode: country.code,
          visaType: visaType,
          isActive: true,
        },
      });
      const embassySourceExists = !!embassySource;

      // Determine status
      let status: 'PASS' | 'WARN' | 'FAIL' = 'FAIL';
      if (visaTypeExists && visaRuleSetExists && isApproved && embassySourceExists) {
        status = 'PASS';
      } else if (visaTypeExists && (visaRuleSetExists || embassySourceExists)) {
        status = 'WARN';
      }

      results.push({
        countryCode: country.code,
        countryName: country.name,
        visaType,
        visaTypeExists,
        visaRuleSetExists,
        isApproved,
        embassySourceExists,
        status,
      });
    }
  }

  // Print results table
  console.log('\n📊 Coverage Results:\n');
  console.log(
    'Country'.padEnd(20) +
    'Visa Type'.padEnd(15) +
    'VisaType'.padEnd(12) +
    'RuleSet'.padEnd(12) +
    'Approved'.padEnd(12) +
    'Embassy'.padEnd(12) +
    'Status'
  );
  console.log('-'.repeat(80));

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const result of results) {
    const statusIcon =
      result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
    console.log(
      result.countryName.padEnd(20) +
      result.visaType.padEnd(15) +
      (result.visaTypeExists ? '✓' : '✗').padEnd(12) +
      (result.visaRuleSetExists ? '✓' : '✗').padEnd(12) +
      (result.isApproved ? '✓' : '✗').padEnd(12) +
      (result.embassySourceExists ? '✓' : '✗').padEnd(12) +
      statusIcon + ' ' + result.status
    );

    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Summary:');
  console.log(`   ✅ PASS: ${passCount}/${results.length}`);
  console.log(`   ⚠️  WARN: ${warnCount}/${results.length}`);
  console.log(`   ❌ FAIL: ${failCount}/${results.length}`);

  // Detailed breakdown
  console.log('\n📋 Detailed Breakdown:\n');

  const missingVisaTypes = results.filter((r) => !r.visaTypeExists);
  if (missingVisaTypes.length > 0) {
    console.log('❌ Missing VisaType:');
    missingVisaTypes.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const missingRuleSets = results.filter((r) => !r.visaRuleSetExists);
  if (missingRuleSets.length > 0) {
    console.log('\n❌ Missing VisaRuleSet:');
    missingRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  const unapprovedRuleSets = results.filter(
    (r) => r.visaRuleSetExists && !r.isApproved
  );
  if (unapprovedRuleSets.length > 0) {
    console.log('\n⚠️  Unapproved VisaRuleSet (need manual approval):');
    unapprovedRuleSets.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType} (run: npm run approve:visarules -- ${r.countryCode} ${r.visaType} --approve)`);
    });
  }

  const missingEmbassySources = results.filter((r) => !r.embassySourceExists);
  if (missingEmbassySources.length > 0) {
    console.log('\n❌ Missing EmbassySource:');
    missingEmbassySources.forEach((r) => {
      console.log(`   - ${r.countryCode} ${r.visaType}`);
    });
  }

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failCount === 0 && warnCount === 0) {
    console.log('✅ LAUNCH READY: All combinations are fully configured!');
    process.exit(0);
  } else if (failCount === 0) {
    console.log('⚠️  LAUNCH READY (with warnings): All combinations have basic setup, but some need approval.');
    process.exit(0);
  } else {
    console.log('❌ NOT LAUNCH READY: Some combinations are missing critical components.');
    console.log('   Please fix the issues above before launching.');
    process.exit(1);
  }
}

checkLaunchReadiness()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

