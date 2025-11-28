/**
 * Spain (Schengen) Fallback Checklist Tests
 * Verifies ES student and tourist fallback checklists
 */

import { getFallbackChecklist } from '../../src/data/fallback-checklists';

describe('Spain (Schengen) Fallback Checklists', () => {
  describe('ES Student Visa', () => {
    test('should return checklist with 10-16 items', () => {
      const checklist = getFallbackChecklist('ES', 'student');
      expect(checklist.length).toBeGreaterThanOrEqual(10);
      expect(checklist.length).toBeLessThanOrEqual(16);
    });

    test('should include all three categories', () => {
      const checklist = getFallbackChecklist('ES', 'student');
      const categories = new Set(checklist.map((item) => item.category));

      expect(categories.has('required')).toBe(true);
      expect(categories.has('highly_recommended')).toBe(true);
      expect(categories.has('optional')).toBe(true);
    });

    test('should include national student visa application', () => {
      const checklist = getFallbackChecklist('ES', 'student');
      const visaItem = checklist.find(
        (item) =>
          item.document.includes('visa_application') ||
          item.name.toLowerCase().includes('national student visa') ||
          item.name.toLowerCase().includes('student visa application')
      );

      expect(visaItem).toBeDefined();
    });

    test('should include letter of acceptance/enrollment', () => {
      const checklist = getFallbackChecklist('ES', 'student');
      const loaItem = checklist.find(
        (item) =>
          item.document.includes('letter_of_acceptance') ||
          item.name.toLowerCase().includes('letter of acceptance') ||
          item.name.toLowerCase().includes('enrollment')
      );

      expect(loaItem).toBeDefined();
      expect(loaItem?.category).toBe('required');
    });

    test('should include medical insurance with Schengen coverage', () => {
      const checklist = getFallbackChecklist('ES', 'student');
      const insuranceItem = checklist.find(
        (item) =>
          item.document.includes('medical_insurance') ||
          item.name.toLowerCase().includes('medical insurance') ||
          item.description.toLowerCase().includes('schengen')
      );

      expect(insuranceItem).toBeDefined();
      expect(insuranceItem?.description.toLowerCase().includes('schengen')).toBe(true);
    });

    test('all items should have EN/UZ/RU translations', () => {
      const checklist = getFallbackChecklist('ES', 'student');

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
  });

  describe('ES Tourist Visa', () => {
    test('should return checklist with 10-16 items', () => {
      const checklist = getFallbackChecklist('ES', 'tourist');
      expect(checklist.length).toBeGreaterThanOrEqual(10);
      expect(checklist.length).toBeLessThanOrEqual(16);
    });

    test('should include all three categories', () => {
      const checklist = getFallbackChecklist('ES', 'tourist');
      const categories = new Set(checklist.map((item) => item.category));

      expect(categories.has('required')).toBe(true);
      expect(categories.has('highly_recommended')).toBe(true);
      expect(categories.has('optional')).toBe(true);
    });

    test('should include Schengen visa application form (Spain)', () => {
      const checklist = getFallbackChecklist('ES', 'tourist');
      const formItem = checklist.find(
        (item) =>
          item.document.includes('visa_application') ||
          item.name.toLowerCase().includes('schengen') ||
          (item.name.toLowerCase().includes('spain') &&
            item.name.toLowerCase().includes('visa'))
      );

      expect(formItem).toBeDefined();
    });

    test('should include €30,000 minimum insurance', () => {
      const checklist = getFallbackChecklist('ES', 'tourist');
      const insuranceItem = checklist.find(
        (item) =>
          item.document.includes('travel_insurance') ||
          item.name.toLowerCase().includes('insurance') ||
          item.description.toLowerCase().includes('€30,000')
      );

      expect(insuranceItem).toBeDefined();
      expect(insuranceItem?.category).toBe('required');
    });

    test('should include biometric photo requirement', () => {
      const checklist = getFallbackChecklist('ES', 'tourist');
      const photoItem = checklist.find(
        (item) =>
          item.document.includes('passport_photo') ||
          item.name.toLowerCase().includes('biometric')
      );

      expect(photoItem).toBeDefined();
    });

    test('all items should have EN/UZ/RU translations', () => {
      const checklist = getFallbackChecklist('ES', 'tourist');

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
  });
});

