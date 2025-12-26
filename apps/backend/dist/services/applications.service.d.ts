export declare class ApplicationsService {
    /**
     * Get all applications for a user
     */
    static getUserApplications(userId: string): Promise<any[]>;
    /**
     * Get single application
     */
    static getApplication(applicationId: string, userId: string): Promise<{
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
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            applicationId: string;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
        }[];
    } & {
        userId: string;
        status: string;
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        countryId: string;
        visaTypeId: string;
        progressPercentage: number;
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
            description: string | null;
            code: string;
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            flagEmoji: string;
            requirements: string | null;
        };
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            applicationId: string;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
        }[];
    } & {
        userId: string;
        status: string;
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        countryId: string;
        visaTypeId: string;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
        expiryDate: Date | null;
    }>;
    /**
     * Update application status
     */
    static updateApplicationStatus(applicationId: string, userId: string, status: string): Promise<{
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
        visaType: {
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
        };
        checkpoints: {
            title: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            applicationId: string;
            order: number;
            isCompleted: boolean;
            completedAt: Date | null;
            dueDate: Date | null;
        }[];
    } & {
        userId: string;
        status: string;
        id: string;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        countryId: string;
        visaTypeId: string;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
        expiryDate: Date | null;
    }>;
    /**
     * Update application progress based on verified documents
     * This is called after document uploads to keep progressPercentage in sync with document status
     *
     * @param applicationId - Application ID
     */
    static updateProgressFromDocuments(applicationId: string): Promise<void>;
    /**
     * Update checkpoint status
     */
    static updateCheckpoint(applicationId: string, userId: string, checkpointId: string, isCompleted: boolean): Promise<{
        title: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string;
        order: number;
        isCompleted: boolean;
        completedAt: Date | null;
        dueDate: Date | null;
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