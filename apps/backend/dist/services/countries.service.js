"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountriesService = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const prisma = new client_1.PrismaClient();
class CountriesService {
    /**
     * Get all countries with visa types
     */
    /**
     * Get all countries with visa types
     * HIGH PRIORITY FIX: Always return ALL countries (no limit) to ensure questionnaire shows all 8 destination countries
     * This method must never limit results - the frontend questionnaire depends on all 8 countries being available
     */
    static async getAllCountries(search) {
        const where = search
            ? {
                OR: [{ name: { contains: search } }, { code: { contains: search } }],
            }
            : {};
        // CRITICAL: No limit, no take() - return ALL countries from database
        // The questionnaire requires all 8 destination countries to be available
        const countries = await prisma.country.findMany({
            where,
            include: {
                visaTypes: true,
            },
            orderBy: { name: 'asc' },
            // Explicitly NO limit - return all countries
        });
        // Log warning if we don't have 8 countries (expected count from seed)
        if (!search && countries.length !== 8) {
            console.warn('[CountriesService] Expected 8 countries in database, found:', countries.length);
        }
        return countries;
    }
    /**
     * Get single country with all details
     */
    static async getCountryById(countryId) {
        const country = await prisma.country.findUnique({
            where: { id: countryId },
            include: {
                visaTypes: true,
            },
        });
        if (!country) {
            throw errors_1.errors.notFound('Country');
        }
        return country;
    }
    /**
     * Get country by code (e.g., "US", "GB")
     */
    static async getCountryByCode(code) {
        const country = await prisma.country.findUnique({
            where: { code: code.toUpperCase() },
            include: {
                visaTypes: {
                    orderBy: { name: 'asc' },
                },
            },
        });
        if (!country) {
            throw errors_1.errors.notFound('Country');
        }
        return country;
    }
    /**
     * Get country by code or name (fallback helper for questionnaire)
     * Used when country ID might be stale but we have code/name from summary
     */
    static async getCountryByCodeOrName(codeOrName) {
        const value = codeOrName.trim();
        if (!value) {
            return null;
        }
        // First try exact code match (case-insensitive)
        let country = await prisma.country.findFirst({
            where: {
                code: value.toUpperCase(), // e.g. "US"
            },
            include: {
                visaTypes: {
                    orderBy: { name: 'asc' },
                },
            },
        });
        // If not found by code, search by name (case-insensitive filtering in JavaScript)
        if (!country) {
            const valueLower = value.toLowerCase();
            const countries = await prisma.country.findMany({
                where: {
                    name: { contains: value }, // Basic contains, will filter case-insensitively below
                },
                include: {
                    visaTypes: {
                        orderBy: { name: 'asc' },
                    },
                },
                take: 10, // Get more to filter case-insensitively
            });
            // Filter case-insensitively (SQLite compatibility)
            country = countries.find((c) => c.name.toLowerCase().includes(valueLower)) || null;
        }
        return country;
    }
    /**
     * Get popular countries (top 10)
     */
    static async getPopularCountries() {
        const countries = await prisma.country.findMany({
            take: 10,
            include: {
                visaTypes: {
                    take: 3,
                },
            },
            orderBy: { name: 'asc' },
        });
        return countries;
    }
    /**
     * Get visa type details
     */
    static async getVisaType(visaTypeId) {
        const visaType = await prisma.visaType.findUnique({
            where: { id: visaTypeId },
            include: {
                country: true,
            },
        });
        if (!visaType) {
            throw errors_1.errors.notFound('Visa Type');
        }
        return visaType;
    }
    /**
     * Get all visa types for a country
     */
    static async getVisaTypesByCountry(countryId) {
        const visaTypes = await prisma.visaType.findMany({
            where: { countryId },
            orderBy: { name: 'asc' },
        });
        return visaTypes;
    }
    /**
     * Create a new country (admin only)
     */
    static async createCountry(data) {
        // Check if country already exists
        const existing = await prisma.country.findFirst({
            where: {
                OR: [{ name: data.name }, { code: data.code.toUpperCase() }],
            },
        });
        if (existing) {
            throw errors_1.errors.conflict('Country');
        }
        const country = await prisma.country.create({
            data: {
                name: data.name,
                code: data.code.toUpperCase(),
                flagEmoji: data.flagEmoji,
                description: data.description,
                requirements: data.requirements,
            },
        });
        return country;
    }
    /**
     * Create visa type for a country (admin only)
     */
    static async createVisaType(countryId, data) {
        // Verify country exists
        const country = await prisma.country.findUnique({
            where: { id: countryId },
        });
        if (!country) {
            throw errors_1.errors.notFound('Country');
        }
        // Check if visa type already exists
        const existing = await prisma.visaType.findFirst({
            where: {
                countryId,
                name: data.name,
            },
        });
        if (existing) {
            throw errors_1.errors.conflict('Visa Type');
        }
        const visaType = await prisma.visaType.create({
            data: {
                countryId,
                name: data.name,
                description: data.description,
                processingDays: data.processingDays || 30,
                validity: data.validity || '1 year',
                fee: data.fee || 0,
                requirements: data.requirements || '{}',
                documentTypes: JSON.stringify(data.documentTypes || []),
            },
        });
        return visaType;
    }
}
exports.CountriesService = CountriesService;
//# sourceMappingURL=countries.service.js.map