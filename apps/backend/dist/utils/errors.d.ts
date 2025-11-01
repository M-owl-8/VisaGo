export declare class ApiError extends Error {
    status: number;
    message: string;
    code?: string | undefined;
    constructor(status: number, message: string, code?: string | undefined);
}
export declare const errorHandler: (status: number, message: string, code?: string) => ApiError;
export declare const errors: {
    unauthorized: () => ApiError;
    forbidden: () => ApiError;
    notFound: (resource: string) => ApiError;
    conflict: (field: string) => ApiError;
    badRequest: (message: string) => ApiError;
    internalServer: (message: string) => ApiError;
    validationError: (message: string) => ApiError;
    unprocessable: (message: string) => ApiError;
};
//# sourceMappingURL=errors.d.ts.map