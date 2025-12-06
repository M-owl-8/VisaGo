/**
 * Analyze Fallback Coverage
 * 
 * Discovers which country/visa type combinations are supported
 * in the fallback checklists.
 * 
 * Usage:
 *   pnpm analyze:fallback-coverage
 */

import { getFallbackChecklist } from '../src/data/fallback-checklists';

type CountryCode = 'US' | 'GB' | 'CA' | 'AU' | 'DE' | 'ES' | 'JP' | 'AE';
type VisaType = 'student' | 'tourist';

/**
 * Analyze fallback checklist coverage
 */
function analyzeFallbackCoverage(): void {
  console.log('\n' + '='.repeat(60));
  console.log('FALLBACK COVERAGE ANALYSIS');
  console.log('='.repeat(60) + '\n');

  const coverage: Map<string, Set<string>> = new Map();
  let totalCombos = 0;

  // Known countries from fallback checklists
  const countries: CountryCode[] = ['US', 'GB', 'CA', 'AU', 'DE', 'ES', 'JP', 'AE'];
  const visaTypes: VisaType[] = ['student', 'tourist'];

  // Get US checklists as reference to detect fallbacks
  const usStudentChecklist = getFallbackChecklist('US', 'student');
  const usTouristChecklist = getFallbackChecklist('US', 'tourist');

  // Iterate through all countries and visa types
  for (const countryCode of countries) {
    const visaTypeSet = new Set<string>();

    for (const visaType of visaTypes) {
      const checklist = getFallbackChecklist(countryCode, visaType);
      
      // Check if checklist exists and is not empty
      if (checklist.length > 0) {
        // For non-US countries, check if it's different from US fallback
        // by comparing first few document types
        if (countryCode === 'US') {
          // US always has its own checklist
          visaTypeSet.add(visaType);
          totalCombos++;
        } else {
          // For other countries, check if it's a real country-specific checklist
          // by checking if it contains country-specific documents
          const referenceChecklist = visaType === 'student' ? usStudentChecklist : usTouristChecklist;
          const isDifferent = checklist.length !== referenceChecklist.length ||
            checklist.some((item, idx) => item.document !== referenceChecklist[idx]?.document);
          
          if (isDifferent || checklist.length > 0) {
            visaTypeSet.add(visaType);
            totalCombos++;
          }
        }
      }
    }

    if (visaTypeSet.size > 0) {
      coverage.set(countryCode, visaTypeSet);
    }
  }

  // Print summary
  console.log('Fallback coverage:');
  const sortedCountries = Array.from(coverage.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [countryCode, visaTypes] of sortedCountries) {
    const visaTypeList = Array.from(visaTypes).sort().join(', ');
    console.log(`  - ${countryCode}: ${visaTypeList}`);
  }

  console.log(`\nTotal combos: ${totalCombos}`);
  console.log(`Countries: ${coverage.size}`);

  // Suggest target coverage
  console.log('\n' + '='.repeat(60));
  console.log('SUGGESTED TARGET (Phase 1) RULES COVERAGE:');
  console.log('='.repeat(60) + '\n');

  // Pick 5 countries that have both tourist and student
  const countriesWithBoth = sortedCountries.filter(
    ([, visaTypes]) => visaTypes.has('tourist') && visaTypes.has('student')
  );

  if (countriesWithBoth.length >= 5) {
    const targetCountries = countriesWithBoth.slice(0, 5);
    console.log('Target (phase 1) rules coverage:');
    for (const [countryCode] of targetCountries) {
      console.log(`  - ${countryCode}: tourist, student`);
    }
    console.log(`\nThat's ${targetCountries.length} countries × 2 visa types = ${targetCountries.length * 2} combos.`);
  } else {
    // If we don't have 5 with both, show what we have
    console.log('Available countries with both tourist and student:');
    for (const [countryCode] of countriesWithBoth) {
      console.log(`  - ${countryCode}: tourist, student`);
    }
    console.log(`\nOnly ${countriesWithBoth.length} countries have both types.`);
    console.log('Consider adding more countries or starting with available ones.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Main execution
if (require.main === module) {
  try {
    analyzeFallbackCoverage();
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

