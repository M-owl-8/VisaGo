import { PrismaClient } from '@prisma/client';
import { errors } from '../utils/errors';

const prisma = new PrismaClient();

export class VisaTypesService {
  /**
   * Get all unique visa type names across all countries
   */
  static async getAllVisaTypes(search?: string) {
    // SQLite doesn't support mode: "insensitive", so we'll filter in JavaScript
    const where: any = search
      ? {
          name: {
            contains: search,
          },
        }
      : {};

    // Get all visa types
    let visaTypes = await prisma.visaType.findMany({
      where,
      select: {
        name: true,
      },
      distinct: ['name'],
      orderBy: {
        name: 'asc',
      },
    });

    // Filter case-insensitively if search term provided (SQLite compatibility)
    if (search) {
      const searchLower = search.toLowerCase();
      visaTypes = visaTypes.filter((vt) => vt.name.toLowerCase().includes(searchLower));
    }

    // Get count of countries for each visa type
    const visaTypesWithCounts = await Promise.all(
      visaTypes.map(async (vt) => {
        const count = await prisma.visaType.count({
          where: {
            name: vt.name,
          },
        });

        // Get sample countries (first 3)
        const sampleCountries = await prisma.visaType.findMany({
          where: {
            name: vt.name,
          },
          take: 3,
          include: {
            country: {
              select: {
                id: true,
                name: true,
                code: true,
                flagEmoji: true,
              },
            },
          },
        });

        return {
          name: vt.name,
          availableInCountries: count,
          sampleCountries: sampleCountries.map((st) => ({
            id: st.country.id,
            name: st.country.name,
            code: st.country.code,
            flagEmoji: st.country.flagEmoji,
          })),
        };
      })
    );

    return visaTypesWithCounts;
  }

  /**
   * Get popular visa types (most common across countries)
   */
  static async getPopularVisaTypes() {
    // Get visa types ordered by how many countries offer them
    const visaTypeCounts = await prisma.visaType.groupBy({
      by: ['name'],
      _count: {
        name: true,
      },
      orderBy: {
        _count: {
          name: 'desc',
        },
      },
      take: 10,
    });

    const popularVisaTypes = await Promise.all(
      visaTypeCounts.map(async (vtc) => {
        // Get sample countries
        const sampleCountries = await prisma.visaType.findMany({
          where: {
            name: vtc.name,
          },
          take: 3,
          include: {
            country: {
              select: {
                id: true,
                name: true,
                code: true,
                flagEmoji: true,
              },
            },
          },
        });

        return {
          name: vtc.name,
          availableInCountries: vtc._count.name,
          sampleCountries: sampleCountries.map((st) => ({
            id: st.country.id,
            name: st.country.name,
            code: st.country.code,
            flagEmoji: st.country.flagEmoji,
          })),
        };
      })
    );

    return popularVisaTypes;
  }

  /**
   * Get countries that offer a specific visa type
   */
  static async getCountriesByVisaTypeName(visaTypeName: string) {
    // SQLite doesn't support mode: "insensitive", get all and filter
    const allVisaTypes = await prisma.visaType.findMany({
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagEmoji: true,
            description: true,
          },
        },
      },
      orderBy: {
        country: {
          name: 'asc',
        },
      },
    });

    // Filter case-insensitively
    const visaTypeNameLower = visaTypeName.toLowerCase();
    const visaTypes = allVisaTypes.filter((vt) => vt.name.toLowerCase() === visaTypeNameLower);

    if (visaTypes.length === 0) {
      throw errors.notFound('Visa Type');
    }

    // Group by country and include visa type details
    const countries = visaTypes.map((vt) => ({
      id: vt.country.id,
      name: vt.country.name,
      code: vt.country.code,
      flagEmoji: vt.country.flagEmoji,
      description: vt.country.description,
      visaType: {
        id: vt.id,
        name: vt.name,
        description: vt.description,
        processingDays: vt.processingDays,
        validity: vt.validity,
        fee: vt.fee,
        requirements: vt.requirements,
        documentTypes: vt.documentTypes,
      },
    }));

    return countries;
  }

  /**
   * Get specific visa type for a country by name
   */
  static async getVisaTypeByNameAndCountry(visaTypeName: string, countryId: string) {
    // SQLite doesn't support mode: "insensitive", get all matching countryId and filter
    const allVisaTypes = await prisma.visaType.findMany({
      where: {
        countryId,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagEmoji: true,
          },
        },
      },
    });

    // Filter case-insensitively
    const visaTypeNameLower = visaTypeName.toLowerCase();
    const visaType = allVisaTypes.find((vt) => vt.name.toLowerCase() === visaTypeNameLower);

    if (!visaType) {
      throw errors.notFound('Visa Type');
    }

    return visaType;
  }
}
