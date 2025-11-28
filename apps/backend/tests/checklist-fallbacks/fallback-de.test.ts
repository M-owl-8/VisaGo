/**
 * Germany (Schengen) Fallback Checklist Tests
 * Verifies DE tourist fallback checklist
 */

import { getFallbackChecklist } from '../../src/data/fallback-checklists';

describe('Germany (Schengen) Fallback Checklists', () => {
  describe('DE Tourist Visa', () => {
    test('should return checklist with 10-16 items', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');
      expect(checklist.length).toBeGreaterThanOrEqual(10);
      expect(checklist.length).toBeLessThanOrEqual(16);
    });

    test('should include all three categories', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');
      const categories = new Set(checklist.map((item) => item.category));

      expect(categories.has('required')).toBe(true);
      expect(categories.has('highly_recommended')).toBe(true);
      expect(categories.has('optional')).toBe(true);
    });

    test('should include €30,000 minimum insurance', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');
      const insuranceItem = checklist.find(
        (item) =>
          item.document.includes('travel_insurance') ||
          item.name.toLowerCase().includes('insurance') ||
          item.description.toLowerCase().includes('€30,000') ||
          item.description.toLowerCase().includes('30000')
      );

      expect(insuranceItem).toBeDefined();
      expect(insuranceItem?.category).toBe('required');
      expect(
        insuranceItem?.description.includes('€30,000') ||
          insuranceItem?.description.includes('30000')
      ).toBe(true);
    });

    test('should include biometric photo requirement', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');
      const photoItem = checklist.find(
        (item) =>
          item.document.includes('passport_photo') ||
          item.name.toLowerCase().includes('biometric') ||
          item.name.toLowerCase().includes('photo')
      );

      expect(photoItem).toBeDefined();
      expect(photoItem?.description.toLowerCase().includes('35x45mm')).toBe(true);
    });

    test('should include Schengen visa application form', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');
      const formItem = checklist.find(
        (item) =>
          item.document.includes('visa_application') ||
          item.name.toLowerCase().includes('schengen') ||
          item.name.toLowerCase().includes('application form')
      );

      expect(formItem).toBeDefined();
    });

    test('all items should have EN/UZ/RU translations', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');

      checklist.forEach((item) => {
        expect(item.name).toBeTruthy();
        expect(item.nameUz).toBeTruthy();
        expect(item.nameRu).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.descriptionUz).toBeTruthy();
        expect(item.descriptionRu).toBeTruthy();
        expect(item.whereToObtain).toBeTruthy();
        expect(item.whereToObtainUz).toBeTruthy();
        expect(item.whereToObtainRu).toBeTruthy();
      });
    });

    test('should include Uzbekistan-specific references', () => {
      const checklist = getFallbackChecklist('DE', 'tourist');
      const allText = JSON.stringify(checklist).toLowerCase();

      expect(
        allText.includes('uzbek') ||
          allText.includes("o'zbek") ||
          allText.includes('узбек')
      ).toBe(true);
    });
  });
});

