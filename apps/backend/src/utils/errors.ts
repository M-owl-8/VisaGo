export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errorHandler = (status: number, message: string, code?: string) => {
  return new ApiError(status, message, code);
};

// Common errors
export const errors = {
  unauthorized: () => errorHandler(401, "Unauthorized"),
  forbidden: () => errorHandler(403, "Forbidden"),
  notFound: (resource: string) => errorHandler(404, `${resource} not found`),
  conflict: (field: string) => errorHandler(409, `${field} already exists`),
  badRequest: (message: string) => errorHandler(400, message),
  internalServer: (message: string) => errorHandler(500, message || "Internal Server Error"),
  validationError: (message: string) => errorHandler(422, message),
  unprocessable: (message: string) => errorHandler(422, message),
};