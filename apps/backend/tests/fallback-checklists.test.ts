import { getFallbackChecklist } from '../src/data/fallback-checklists';

describe('Fallback checklists coverage', () => {
  const countries = ['US', 'GB', 'CA', 'AU', 'DE', 'ES', 'JP', 'AE'] as const;
  const visaTypes: Array<'student' | 'tourist'> = ['student', 'tourist'];

  it('returns at least one item for every country/visaType combination', () => {
    for (const country of countries) {
      for (const visaType of visaTypes) {
        const list = getFallbackChecklist(country, visaType);
        expect(list.length).toBeGreaterThan(0);
      }
    }
  });
});





