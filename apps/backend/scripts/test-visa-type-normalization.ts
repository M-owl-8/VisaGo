/**
 * Test Visa Type Normalization
 * 
 * Tests that visa type normalization works correctly after adding CA, AU, GB aliases.
 */

import { normalizeVisaTypeForRules } from '../src/utils/visa-type-aliases';
import { normalizeCountryCode } from '../src/config/country-registry';

console.log('\n===== TESTING VISA TYPE NORMALIZATION =====\n');

const testCases = [
  // Canada
  { country: 'CA', input: 'visitor', expected: 'tourist' },
  { country: 'CA', input: 'Visitor', expected: 'tourist' },
  { country: 'CA', input: 'visitor visa', expected: 'tourist' },
  { country: 'CA', input: 'tourist', expected: 'tourist' },
  
  // Australia
  { country: 'AU', input: 'visitor', expected: 'tourist' },
  { country: 'AU', input: 'Visitor', expected: 'tourist' },
  { country: 'AU', input: 'visitor visa', expected: 'tourist' },
  { country: 'AU', input: 'tourist', expected: 'tourist' },
  
  // United Kingdom
  { country: 'GB', input: 'visitor', expected: 'tourist' },
  { country: 'GB', input: 'standard visitor', expected: 'tourist' },
  { country: 'GB', input: 'standard visitor visa', expected: 'tourist' },
  { country: 'GB', input: 'tourist', expected: 'tourist' },
  
  // United States (should still work)
  { country: 'US', input: 'b1/b2 visitor', expected: 'tourist' },
  { country: 'US', input: 'visitor', expected: 'tourist' },
  { country: 'US', input: 'tourist', expected: 'tourist' },
  
  // Spain (Schengen)
  { country: 'ES', input: 'schengen tourist', expected: 'tourist' },
  { country: 'ES', input: 'tourist', expected: 'tourist' },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const normalizedCountry = normalizeCountryCode(test.country) || test.country.toUpperCase();
  const result = normalizeVisaTypeForRules(normalizedCountry, test.input);
  const success = result === test.expected;
  
  if (success) {
    passed++;
    console.log(`✅ ${test.country} "${test.input}" → "${result}"`);
  } else {
    failed++;
    console.log(`❌ ${test.country} "${test.input}" → "${result}" (expected "${test.expected}")`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✅ All tests passed! Normalization is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please check the normalization logic.\n');
  process.exit(1);
}

