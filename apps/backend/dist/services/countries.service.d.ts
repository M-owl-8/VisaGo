export declare class CountriesService {
    /**
     * Get all countries with visa types
     */
    /**
     * Get all countries with visa types
     * HIGH PRIORITY FIX: Always return ALL countries (no limit) to ensure questionnaire shows all 8 destination countries
     * This method must never limit results - the frontend questionnaire depends on all 8 countries being available
     */
    static getAllCountries(search?: string): Promise<({
        visaTypes: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            countryId: string;
            requirements: string;
            processingDays: number;
            validity: string;
            fee: number;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    })[]>;
    /**
     * Resolve a country by code or name against ISO dataset.
     */
    static resolveIsoCountry(codeOrName: string | null | undefined): import("../data/countries-iso2").IsoCountry | null;
    /**
     * Get or create a country record using ISO mapping, tolerant to unknown inputs.
     */
    static getOrCreateCountry(codeOrName: string): Promise<{
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    }>;
    /**
     * Get single country with all details
     */
    static getCountryById(countryId: string): Promise<{
        visaTypes: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            countryId: string;
            requirements: string;
            processingDays: number;
            validity: string;
            fee: number;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    }>;
    /**
     * Get country by code (e.g., "US", "GB")
     */
    static getCountryByCode(code: string): Promise<{
        visaTypes: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            countryId: string;
            requirements: string;
            processingDays: number;
            validity: string;
            fee: number;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    }>;
    /**
     * Get country by code or name (fallback helper for questionnaire)
     * Used when country ID might be stale but we have code/name from summary
     */
    static getCountryByCodeOrName(codeOrName: string): Promise<({
        visaTypes: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            countryId: string;
            requirements: string;
            processingDays: number;
            validity: string;
            fee: number;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    }) | null>;
    /**
     * Get popular countries (top 10)
     */
    static getPopularCountries(): Promise<({
        visaTypes: {
            description: string | null;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            countryId: string;
            requirements: string;
            processingDays: number;
            validity: string;
            fee: number;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    })[]>;
    /**
     * Get visa type details
     */
    static getVisaType(visaTypeId: string): Promise<{
        country: {
            description: string | null;
            code: string;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            flagEmoji: string;
            requirements: string | null;
        };
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        countryId: string;
        requirements: string;
        processingDays: number;
        validity: string;
        fee: number;
        documentTypes: string;
    }>;
    /**
     * Get all visa types for a country
     */
    static getVisaTypesByCountry(countryId: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        countryId: string;
        requirements: string;
        processingDays: number;
        validity: string;
        fee: number;
        documentTypes: string;
    }[]>;
    /**
     * Create a new country (admin only)
     */
    static createCountry(data: {
        name: string;
        code: string;
        flagEmoji: string;
        description?: string;
        requirements?: string;
    }): Promise<{
        description: string | null;
        code: string;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        flagEmoji: string;
        requirements: string | null;
    }>;
    /**
     * Create visa type for a country (admin only)
     */
    static createVisaType(countryId: string, data: {
        name: string;
        description: string;
        processingDays?: number;
        validity?: string;
        fee?: number;
        requirements?: string;
        documentTypes?: string[];
    }): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        countryId: string;
        requirements: string;
        processingDays: number;
        validity: string;
        fee: number;
        documentTypes: string;
    }>;
}
//# sourceMappingURL=countries.service.d.ts.map