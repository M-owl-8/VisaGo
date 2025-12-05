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
            updatedAt: Date;
            name: string;
            flagEmoji: string;
            requirements: string | null;
        };
        visaType: {
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            countryId: string;
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
        createdAt: Date;
        updatedAt: Date;
        countryId: string;
        visaTypeId: string;
        notes: string | null;
        expiryDate: Date | null;
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
            code: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            flagEmoji: string;
            requirements: string | null;
        };
        visaType: {
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            countryId: string;
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
        createdAt: Date;
        updatedAt: Date;
        countryId: string;
        visaTypeId: string;
        notes: string | null;
        expiryDate: Date | null;
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
            code: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            flagEmoji: string;
            requirements: string | null;
        };
        visaType: {
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            countryId: string;
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
        createdAt: Date;
        updatedAt: Date;
        countryId: string;
        visaTypeId: string;
        notes: string | null;
        expiryDate: Date | null;
        progressPercentage: number;
        submissionDate: Date | null;
        approvalDate: Date | null;
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