/**
 * Unit Tests: Error Handler
 * Tests for error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import {
  createErrorResponse,
  handleError,
  ErrorHandlers,
  ERROR_CODES,
  ERROR_MESSAGES,
  ApiErrorResponse
} from '../../server/utils/error-handler';

// Mock logger and sentry
vi.mock('../../server/utils/logger');
vi.mock('../../server/sentry');

describe('Error Handler', () => {
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('ERROR_CODES', () => {
    it('should have authentication error codes', () => {
      expect(ERROR_CODES.AUTH_TOKEN_REQUIRED).toBe('AUTH_TOKEN_REQUIRED');
      expect(ERROR_CODES.AUTH_TOKEN_INVALID).toBe('AUTH_TOKEN_INVALID');
      expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
      expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should have authorization error codes', () => {
      expect(ERROR_CODES.ACCESS_DENIED).toBe('ACCESS_DENIED');
      expect(ERROR_CODES.ADMIN_ACCESS_REQUIRED).toBe('ADMIN_ACCESS_REQUIRED');
      expect(ERROR_CODES.OWNER_ACCESS_REQUIRED).toBe('OWNER_ACCESS_REQUIRED');
    });

    it('should have validation error codes', () => {
      expect(ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT');
    });

    it('should have not found error codes', () => {
      expect(ERROR_CODES.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(ERROR_CODES.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
      expect(ERROR_CODES.PRODUCT_NOT_FOUND).toBe('PRODUCT_NOT_FOUND');
    });

    it('should have server error codes', () => {
      expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
      expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have user-friendly messages for all error codes', () => {
      expect(ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_REQUIRED]).toContain('log in');
      expect(ERROR_MESSAGES[ERROR_CODES.ACCESS_DENIED]).toContain('permission');
      expect(ERROR_MESSAGES[ERROR_CODES.VALIDATION_FAILED]).toContain('check your input');
      expect(ERROR_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND]).toContain('not found');
    });

    it('should not expose technical details', () => {
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(message).not.toContain('database');
        expect(message).not.toContain('SQL');
        expect(message).not.toContain('query');
      });
    });
  });

  describe('createErrorResponse', () => {
    it('should create basic error response', () => {
      const result = createErrorResponse(400, 'Bad request');

      expect(result.statusCode).toBe(400);
      expect(result.response.error).toBe('Bad request');
      expect(result.response.timestamp).toBeDefined();
    });

    it('should include error code and predefined message', () => {
      const result = createErrorResponse(
        401,
        'Authentication required',
        ERROR_CODES.AUTH_TOKEN_REQUIRED
      );

      expect(result.statusCode).toBe(401);
      expect(result.response.code).toBe(ERROR_CODES.AUTH_TOKEN_REQUIRED);
      expect(result.response.message).toBe(ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_REQUIRED]);
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom error message';
      const result = createErrorResponse(
        403,
        'Access denied',
        ERROR_CODES.ACCESS_DENIED,
        customMessage
      );

      expect(result.response.message).toBe(customMessage);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const result = createErrorResponse(
        422,
        'Validation failed',
        ERROR_CODES.VALIDATION_FAILED,
        undefined,
        details
      );

      expect(result.response.details).toEqual(details);
    });

    it('should include timestamp', () => {
      const result = createErrorResponse(500, 'Server error');
      
      expect(result.response.timestamp).toBeDefined();
      expect(new Date(result.response.timestamp!).toString()).not.toBe('Invalid Date');
    });
  });

  describe('handleError', () => {
    it('should handle Zod validation errors', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number'
        }
      ]);

      handleError(mockRes, zodError, 'test operation');

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          code: ERROR_CODES.VALIDATION_FAILED,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: 'Expected string, received number'
            })
          ])
        })
      );
    });

    it('should handle errors with known error codes', () => {
      const error = {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found'
      };

      handleError(mockRes, error, 'find user');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User not found',
          code: ERROR_CODES.USER_NOT_FOUND
        })
      );
    });

    it('should handle PostgreSQL unique constraint violations', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };

      handleError(mockRes, error, 'create user');

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.RESOURCE_ALREADY_EXISTS
        })
      );
    });

    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Unknown error');

      handleError(mockRes, error, 'operation');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.INTERNAL_SERVER_ERROR
        })
      );
    });
  });

  describe('ErrorHandlers.tokenRequired', () => {
    it('should return 401 with token required error', () => {
      ErrorHandlers.tokenRequired(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.AUTH_TOKEN_REQUIRED
        })
      );
    });
  });

  describe('ErrorHandlers.tokenInvalid', () => {
    it('should return 401 with invalid token error', () => {
      ErrorHandlers.tokenInvalid(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.AUTH_TOKEN_INVALID
        })
      );
    });
  });

  describe('ErrorHandlers.accessDenied', () => {
    it('should return 403 with access denied error', () => {
      ErrorHandlers.accessDenied(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.ACCESS_DENIED
        })
      );
    });

    it('should accept custom message', () => {
      const customMessage = 'Custom access denied message';
      ErrorHandlers.accessDenied(mockRes, customMessage);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage
        })
      );
    });
  });

  describe('ErrorHandlers.adminRequired', () => {
    it('should return 403 with admin required error', () => {
      ErrorHandlers.adminRequired(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.ADMIN_ACCESS_REQUIRED
        })
      );
    });
  });

  describe('ErrorHandlers.ownerRequired', () => {
    it('should return 403 with owner required error', () => {
      ErrorHandlers.ownerRequired(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ERROR_CODES.OWNER_ACCESS_REQUIRED
        })
      );
    });
  });

  describe('ErrorHandlers.notFound', () => {
    it('should return 404 with not found error', () => {
      ErrorHandlers.notFound(mockRes, 'user');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User not found'
        })
      );
    });

    it('should capitalize resource name', () => {
      ErrorHandlers.notFound(mockRes, 'product');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Product not found'
        })
      );
    });
  });

  describe('ErrorHandlers.badRequest', () => {
    it('should return 400 with bad request error', () => {
      const message = 'Invalid input data';
      ErrorHandlers.badRequest(mockRes, message);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: message,
          code: ERROR_CODES.BAD_REQUEST
        })
      );
    });
  });

  describe('ErrorHandlers.missingField', () => {
    it('should return 400 with missing field error', () => {
      ErrorHandlers.missingField(mockRes, 'email');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'email is required',
          code: ERROR_CODES.MISSING_REQUIRED_FIELD
        })
      );
    });
  });

  describe('ErrorHandlers.alreadyExists', () => {
    it('should return 409 with already exists error', () => {
      ErrorHandlers.alreadyExists(mockRes, 'User');

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User already exists',
          code: ERROR_CODES.RESOURCE_ALREADY_EXISTS
        })
      );
    });
  });

  describe('ErrorHandlers.serverError', () => {
    it('should return 500 with server error', () => {
      ErrorHandlers.serverError(mockRes, 'save data');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to save data',
          code: ERROR_CODES.INTERNAL_SERVER_ERROR
        })
      );
    });

    it('should use default operation if not provided', () => {
      ErrorHandlers.serverError(mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to operation'
        })
      );
    });
  });

  describe('status code mapping', () => {
    it('should map AUTH errors to 401', () => {
      const authError = { code: ERROR_CODES.AUTH_TOKEN_INVALID };
      handleError(mockRes, authError);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should map ACCESS_DENIED to 403', () => {
      const accessError = { code: ERROR_CODES.ACCESS_DENIED };
      handleError(mockRes, accessError);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should map VALIDATION errors to 422', () => {
      const validationError = { code: ERROR_CODES.VALIDATION_FAILED };
      handleError(mockRes, validationError);
      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it('should map NOT_FOUND errors to 404', () => {
      const notFoundError = { code: ERROR_CODES.USER_NOT_FOUND };
      handleError(mockRes, notFoundError);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should map ALREADY_EXISTS errors to 409', () => {
      const conflictError = { code: ERROR_CODES.EMAIL_ALREADY_EXISTS };
      handleError(mockRes, conflictError);
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should map SERVER errors to 500', () => {
      const serverError = { code: ERROR_CODES.INTERNAL_SERVER_ERROR };
      handleError(mockRes, serverError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
