export declare class CountriesService {
    /**
     * Get all countries with visa types
     */
    static getAllCountries(search?: string): Promise<({
        visaTypes: {
            description: string | null;
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        flagEmoji: string;
        requirements: string | null;
    })[]>;
    /**
     * Get single country with all details
     */
    static getCountryById(countryId: string): Promise<{
        visaTypes: {
            description: string | null;
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        flagEmoji: string;
        requirements: string | null;
    }>;
    /**
     * Get country by code (e.g., "US", "GB")
     */
    static getCountryByCode(code: string): Promise<{
        visaTypes: {
            description: string | null;
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        flagEmoji: string;
        requirements: string | null;
    }>;
    /**
     * Get popular countries (top 10)
     */
    static getPopularCountries(): Promise<({
        visaTypes: {
            description: string | null;
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        flagEmoji: string;
        requirements: string | null;
    })[]>;
    /**
     * Get visa type details
     */
    static getVisaType(visaTypeId: string): Promise<{
        country: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            flagEmoji: string;
            requirements: string | null;
        };
    } & {
        description: string | null;
        name: string;
        id: string;
        countryId: string;
        createdAt: Date;
        updatedAt: Date;
        fee: number;
        requirements: string;
        processingDays: number;
        validity: string;
        documentTypes: string;
    }>;
    /**
     * Get all visa types for a country
     */
    static getVisaTypesByCountry(countryId: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        countryId: string;
        createdAt: Date;
        updatedAt: Date;
        fee: number;
        requirements: string;
        processingDays: number;
        validity: string;
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
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        code: string;
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
        name: string;
        id: string;
        countryId: string;
        createdAt: Date;
        updatedAt: Date;
        fee: number;
        requirements: string;
        processingDays: number;
        validity: string;
        documentTypes: string;
    }>;
}
//# sourceMappingURL=countries.service.d.ts.map