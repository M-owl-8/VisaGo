/**
 * Unit tests for response utilities
 */

import { Response } from "express";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
} from "../../utils/response";
import { HTTP_STATUS } from "../../config/constants";

// Mock Express response
const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
};

describe("Response Utilities", () => {
  describe("successResponse", () => {
    it("should send success response with data", () => {
      const res = createMockResponse() as Response;
      const data = { userId: "123", email: "test@example.com" };

      successResponse(res, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });

    it("should send success response with custom status", () => {
      const res = createMockResponse() as Response;
      const data = { message: "Created" };

      successResponse(res, data, HTTP_STATUS.CREATED);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it("should include metadata when provided", () => {
      const res = createMockResponse() as Response;
      const data = [1, 2, 3];
      const meta = { page: 1, limit: 10, total: 100 };

      successResponse(res, data, HTTP_STATUS.OK, meta);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta,
      });
    });
  });

  describe("errorResponse", () => {
    it("should send error response", () => {
      const res = createMockResponse() as Response;

      errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Invalid input", "VALIDATION_ERROR");

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          status: HTTP_STATUS.BAD_REQUEST,
          message: "Invalid input",
          code: "VALIDATION_ERROR",
        },
      });
    });

    it("should include error details when provided", () => {
      const res = createMockResponse() as Response;
      const details = { field: "email", reason: "Invalid format" };

      errorResponse(res, HTTP_STATUS.BAD_REQUEST, "Validation failed", "VALIDATION_ERROR", details);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          status: HTTP_STATUS.BAD_REQUEST,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details,
        },
      });
    });
  });

  describe("paginatedResponse", () => {
    it("should send paginated response", () => {
      const res = createMockResponse() as Response;
      const data = [{ id: 1 }, { id: 2 }];

      paginatedResponse(res, data, 1, 10, 20);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2,
        },
      });
    });

    it("should calculate total pages correctly", () => {
      const res = createMockResponse() as Response;
      const data = [{ id: 1 }];

      paginatedResponse(res, data, 2, 10, 25);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            totalPages: 3, // Math.ceil(25/10) = 3
          }),
        })
      );
    });
  });

  describe("createdResponse", () => {
    it("should send 201 created response", () => {
      const res = createMockResponse() as Response;
      const data = { id: "123", name: "New Resource" };

      createdResponse(res, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
      });
    });
  });

  describe("noContentResponse", () => {
    it("should send 204 no content response", () => {
      const res = createMockResponse() as Response;

      noContentResponse(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NO_CONTENT);
      expect(res.send).toHaveBeenCalled();
    });
  });
});









