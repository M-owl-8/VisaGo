import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Load JSON data
const dataPath = path.join(__dirname, '../data/visa-requirements-uzbekistan.json');
const visaRequirementsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

interface VisaRequirementCheck {
  visaRequired: boolean;
  countryName: string;
  countryCode?: string;
  notes?: string;
  region?: string;
}

/**
 * Check if a visa is required for Uzbek citizens to travel to a specific country
 */
export async function checkVisaRequirement(
  countryName: string,
  nationalityCode: string = 'UZ'
): Promise<VisaRequirementCheck | null> {
  // For now, we only have data for Uzbekistan (UZ)
  if (nationalityCode !== 'UZ') {
    return null;
  }

  // Search in all regions
  const regions = visaRequirementsData.regions;

  for (const [regionKey, regionData] of Object.entries(regions)) {
    const region = regionData as any;
    const country = region.countries.find(
      (c: any) =>
        c.name.toLowerCase() === countryName.toLowerCase() ||
        c.code.toLowerCase() === countryName.toLowerCase()
    );

    if (country) {
      return {
        visaRequired: country.visaRequired,
        countryName: country.name,
        countryCode: country.code,
        notes: country.notes,
        region: region.name,
      };
    }
  }

  // If not found in visa-required list, check if it's in the allVisaRequiredCountries list
  const isVisaRequired = visaRequirementsData.allVisaRequiredCountries.some(
    (name: string) => name.toLowerCase() === countryName.toLowerCase()
  );

  if (isVisaRequired) {
    return {
      visaRequired: true,
      countryName: countryName,
      notes: 'Visa required for Uzbek citizens',
    };
  }

  // If not found, return null (unknown status)
  return null;
}

/**
 * Get all countries that require visas for Uzbek citizens
 */
export function getAllVisaRequiredCountries(nationalityCode: string = 'UZ'): string[] {
  if (nationalityCode !== 'UZ') {
    return [];
  }

  return visaRequirementsData.allVisaRequiredCountries;
}

/**
 * Get visa requirements by region for Uzbek citizens
 */
export function getVisaRequirementsByRegion(nationalityCode: string = 'UZ') {
  if (nationalityCode !== 'UZ') {
    return null;
  }

  return visaRequirementsData.regions;
}

/**
 * Update country requirements in database based on visa requirements data
 */
export async function updateCountryRequirements() {
  const regions = visaRequirementsData.regions as any;
  const allCountries: any[] = [];

  // Collect all countries from all regions
  for (const [regionKey, regionData] of Object.entries(regions)) {
    const region = regionData as any;
    const countries = region.countries.map((c: any) => ({
      ...c,
      regionName: region.name,
    }));
    allCountries.push(...countries);
  }

  // Update each country in the database
  for (const countryData of allCountries) {
    try {
      const requirements = {
        visaRequiredForUzbekistan: true,
        notes: countryData.notes,
        region: countryData.regionName,
        lastUpdated: visaRequirementsData.lastUpdated,
      };

      await prisma.country.upsert({
        where: { code: countryData.code },
        update: {
          requirements: JSON.stringify(requirements),
        },
        create: {
          name: countryData.name,
          code: countryData.code,
          flagEmoji: countryData.flagEmoji,
          requirements: JSON.stringify(requirements),
        },
      });
    } catch (error) {
      console.error(`Failed to update country ${countryData.name}:`, error);
    }
  }

  console.log(`Updated ${allCountries.length} countries with visa requirements`);
}
