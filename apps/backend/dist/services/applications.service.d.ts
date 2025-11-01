export declare class ApplicationsService {
    /**
     * Get all applications for a user
     */
    static getUserApplications(userId: string): Promise<({
        country: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            flagEmoji: string;
            description: string | null;
            requirements: string | null;
        };
        visaType: {
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            description: string | null;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        };
        checkpoints: {
            id: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
            applicationId: string;
        }[];
    } & {
        id: string;
        countryId: string;
        visaTypeId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        progressPercentage: number;
        notes: string | null;
        submissionDate: Date | null;
        approvalDate: Date | null;
        expiryDate: Date | null;
    })[]>;
    /**
     * Get single application
     */
    static getApplication(applicationId: string, userId: string): Promise<{
        country: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            flagEmoji: string;
            description: string | null;
            requirements: string | null;
        };
        visaType: {
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            description: string | null;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        };
        checkpoints: {
            id: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
            applicationId: string;
        }[];
    } & {
        id: string;
        countryId: string;
        visaTypeId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        progressPercentage: number;
        notes: string | null;
        submissionDate: Date | null;
        approvalDate: Date | null;
        expiryDate: Date | null;
    }>;
    /**
     * Create new visa application
     */
    static createApplication(userId: string, data: {
        countryId: string;
        visaTypeId: string;
        notes?: string;
    }): Promise<{
        country: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            flagEmoji: string;
            description: string | null;
            requirements: string | null;
        };
        visaType: {
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            description: string | null;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        };
        checkpoints: {
            id: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
            applicationId: string;
        }[];
    } & {
        id: string;
        countryId: string;
        visaTypeId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        progressPercentage: number;
        notes: string | null;
        submissionDate: Date | null;
        approvalDate: Date | null;
        expiryDate: Date | null;
    }>;
    /**
     * Update application status
     */
    static updateApplicationStatus(applicationId: string, userId: string, status: string): Promise<{
        country: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            flagEmoji: string;
            description: string | null;
            requirements: string | null;
        };
        visaType: {
            name: string;
            id: string;
            countryId: string;
            createdAt: Date;
            updatedAt: Date;
            fee: number;
            description: string | null;
            requirements: string;
            processingDays: number;
            validity: string;
            documentTypes: string;
        };
        checkpoints: {
            id: string;
            title: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
            applicationId: string;
        }[];
    } & {
        id: string;
        countryId: string;
        visaTypeId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        progressPercentage: number;
        notes: string | null;
        submissionDate: Date | null;
        approvalDate: Date | null;
        expiryDate: Date | null;
    }>;
    /**
     * Update checkpoint status
     */
    static updateCheckpoint(applicationId: string, userId: string, checkpointId: string, isCompleted: boolean): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        order: number;
        isCompleted: boolean;
        completedAt: Date | null;
        dueDate: Date | null;
        applicationId: string;
    }>;
    /**
     * Delete application
     */
    static deleteApplication(applicationId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=applications.service.d.ts.map