/**
 * Australia Fallback Checklist Tests
 * Verifies AU student and tourist fallback checklists
 */

import { getFallbackChecklist } from '../../src/data/fallback-checklists';

describe('Australia Fallback Checklists', () => {
  describe('AU Student Visa', () => {
    test('should return checklist with 10-16 items', () => {
      const checklist = getFallbackChecklist('AU', 'student');
      expect(checklist.length).toBeGreaterThanOrEqual(10);
      expect(checklist.length).toBeLessThanOrEqual(16);
    });

    test('should include all three categories', () => {
      const checklist = getFallbackChecklist('AU', 'student');
      const categories = new Set(checklist.map((item) => item.category));

      expect(categories.has('required')).toBe(true);
      expect(categories.has('highly_recommended')).toBe(true);
      expect(categories.has('optional')).toBe(true);
    });

    test('should include CoE (Confirmation of Enrolment)', () => {
      const checklist = getFallbackChecklist('AU', 'student');
      const coeItem = checklist.find(
        (item) =>
          item.document.includes('coe') ||
          item.name.toLowerCase().includes('confirmation of enrolment') ||
          item.name.toLowerCase().includes('coe')
      );

      expect(coeItem).toBeDefined();
      expect(coeItem?.category).toBe('required');
    });

    test('should include OSHC (Overseas Student Health Cover)', () => {
      const checklist = getFallbackChecklist('AU', 'student');
      const oshcItem = checklist.find(
        (item) =>
          item.document.includes('oshc') ||
          item.name.toLowerCase().includes('oshc') ||
          item.name.toLowerCase().includes('overseas student health')
      );

      expect(oshcItem).toBeDefined();
      expect(oshcItem?.category).toBe('required');
    });

    test('should include ImmiAccount application form', () => {
      const checklist = getFallbackChecklist('AU', 'student');
      const immiItem = checklist.find(
        (item) =>
          item.document.includes('visa_application') ||
          item.name.toLowerCase().includes('immiaccount') ||
          item.whereToObtain.toLowerCase().includes('immi.homeaffairs')
      );

      expect(immiItem).toBeDefined();
    });

    test('all items should have EN/UZ/RU translations', () => {
      const checklist = getFallbackChecklist('AU', 'student');

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
      const checklist = getFallbackChecklist('AU', 'student');
      const allText = JSON.stringify(checklist).toLowerCase();

      expect(
        allText.includes('uzbek') ||
          allText.includes("o'zbek") ||
          allText.includes('узбек')
      ).toBe(true);
    });
  });

  describe('AU Tourist Visa', () => {
    test('should return checklist with 10-16 items', () => {
      const checklist = getFallbackChecklist('AU', 'tourist');
      expect(checklist.length).toBeGreaterThanOrEqual(10);
      expect(checklist.length).toBeLessThanOrEqual(16);
    });

    test('should include all three categories', () => {
      const checklist = getFallbackChecklist('AU', 'tourist');
      const categories = new Set(checklist.map((item) => item.category));

      expect(categories.has('required')).toBe(true);
      expect(categories.has('highly_recommended')).toBe(true);
      expect(categories.has('optional')).toBe(true);
    });

    test('should include e-Visa application', () => {
      const checklist = getFallbackChecklist('AU', 'tourist');
      const evisaItem = checklist.find(
        (item) =>
          item.document.includes('visa_application') ||
          item.name.toLowerCase().includes('e-visa') ||
          item.name.toLowerCase().includes('visitor visa')
      );

      expect(evisaItem).toBeDefined();
    });

    test('all items should have EN/UZ/RU translations', () => {
      const checklist = getFallbackChecklist('AU', 'tourist');

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
      const checklist = getFallbackChecklist('AU', 'tourist');
      const allText = JSON.stringify(checklist).toLowerCase();

      expect(
        allText.includes('uzbek') ||
          allText.includes("o'zbek") ||
          allText.includes('узбек')
      ).toBe(true);
    });
  });
});

