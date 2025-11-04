export declare class ApplicationsService {
    /**
     * Get all applications for a user
     */
    static getUserApplications(userId: string): Promise<({
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
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
        notes: string | null;
        expiryDate: Date | null;
        status: string;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
    })[]>;
    /**
     * Get single application
     */
    static getApplication(applicationId: string, userId: string): Promise<{
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
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
        notes: string | null;
        expiryDate: Date | null;
        status: string;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
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
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            flagEmoji: string;
            requirements: string | null;
        };
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
        notes: string | null;
        expiryDate: Date | null;
        status: string;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
    }>;
    /**
     * Update application status
     */
    static updateApplicationStatus(applicationId: string, userId: string, status: string): Promise<{
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
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
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
        notes: string | null;
        expiryDate: Date | null;
        status: string;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
    }>;
    /**
     * Update checkpoint status
     */
    static updateCheckpoint(applicationId: string, userId: string, checkpointId: string, isCompleted: boolean): Promise<{
        title: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
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