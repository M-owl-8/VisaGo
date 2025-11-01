"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errors = exports.errorHandler = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.message = message;
        this.code = code;
        this.name = "ApiError";
    }
}
exports.ApiError = ApiError;
const errorHandler = (status, message, code) => {
    return new ApiError(status, message, code);
};
exports.errorHandler = errorHandler;
// Common errors
exports.errors = {
    unauthorized: () => (0, exports.errorHandler)(401, "Unauthorized"),
    forbidden: () => (0, exports.errorHandler)(403, "Forbidden"),
    notFound: (resource) => (0, exports.errorHandler)(404, `${resource} not found`),
    conflict: (field) => (0, exports.errorHandler)(409, `${field} already exists`),
    badRequest: (message) => (0, exports.errorHandler)(400, message),
    internalServer: (message) => (0, exports.errorHandler)(500, message || "Internal Server Error"),
    validationError: (message) => (0, exports.errorHandler)(422, message),
    unprocessable: (message) => (0, exports.errorHandler)(422, message),
};
//# sourceMappingURL=errors.js.map