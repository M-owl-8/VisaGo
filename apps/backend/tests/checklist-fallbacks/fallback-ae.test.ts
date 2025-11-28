/**
 * UAE Fallback Checklist Tests
 * Verifies AE tourist fallback checklist
 */

import { getFallbackChecklist } from '../../src/data/fallback-checklists';

describe('UAE Fallback Checklists', () => {
  describe('AE Tourist Visa', () => {
    test('should return checklist with 10-16 items', () => {
      const checklist = getFallbackChecklist('AE', 'tourist');
      expect(checklist.length).toBeGreaterThanOrEqual(10);
      expect(checklist.length).toBeLessThanOrEqual(16);
    });

    test('should include all three categories', () => {
      const checklist = getFallbackChecklist('AE', 'tourist');
      const categories = new Set(checklist.map((item) => item.category));

      expect(categories.has('required')).toBe(true);
      expect(categories.has('highly_recommended')).toBe(true);
      expect(categories.has('optional')).toBe(true);
    });

    test('should include UAE-specific photo size requirements', () => {
      const checklist = getFallbackChecklist('AE', 'tourist');
      const photoItem = checklist.find(
        (item) =>
          item.document.includes('passport_photo') ||
          item.name.toLowerCase().includes('photo')
      );

      expect(photoItem).toBeDefined();
      expect(
        photoItem?.description.toLowerCase().includes('43x55mm') ||
          photoItem?.description.toLowerCase().includes('45x55mm') ||
          photoItem?.name.toLowerCase().includes('uae size')
      ).toBe(true);
    });

    test('should include e-Visa application', () => {
      const checklist = getFallbackChecklist('AE', 'tourist');
      const evisaItem = checklist.find(
        (item) =>
          item.document.includes('visa_application') ||
          item.name.toLowerCase().includes('e-visa') ||
          item.name.toLowerCase().includes('evisa')
      );

      expect(evisaItem).toBeDefined();
    });

    test('should include hotel booking or invitation letter', () => {
      const checklist = getFallbackChecklist('AE', 'tourist');
      const accommodationItem = checklist.find(
        (item) =>
          item.document.includes('hotel_booking') ||
          item.name.toLowerCase().includes('hotel') ||
          item.name.toLowerCase().includes('invitation')
      );

      expect(accommodationItem).toBeDefined();
      expect(accommodationItem?.category).toBe('required');
    });

    test('all items should have EN/UZ/RU translations', () => {
      const checklist = getFallbackChecklist('AE', 'tourist');

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
      const checklist = getFallbackChecklist('AE', 'tourist');
      const allText = JSON.stringify(checklist).toLowerCase();

      expect(
        allText.includes('uzbek') ||
          allText.includes("o'zbek") ||
          allText.includes('узбек')
      ).toBe(true);
    });
  });
});

