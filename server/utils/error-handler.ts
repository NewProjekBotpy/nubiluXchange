import { Response } from "express";
import { ZodError } from "zod";
import { captureError } from '../sentry';

// Standard error response format
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: any;
  code?: string;
  timestamp?: string;
}

// Error codes for different types of errors
export const ERROR_CODES = {
  // Authentication errors (401)
  AUTH_TOKEN_REQUIRED: 'AUTH_TOKEN_REQUIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_SESSION_MISMATCH: 'AUTH_SESSION_MISMATCH',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  // Authorization errors (403)
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ADMIN_ACCESS_REQUIRED: 'ADMIN_ACCESS_REQUIRED',
  OWNER_ACCESS_REQUIRED: 'OWNER_ACCESS_REQUIRED',

  // Validation errors (422)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Bad request errors (400)
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_OPERATION: 'INVALID_OPERATION',

  // Not found errors (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',

  // Conflict errors (409)
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',

  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  // Authentication messages
  [ERROR_CODES.AUTH_TOKEN_REQUIRED]: 'Please log in to access this resource',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Your session is invalid. Please log in again',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.AUTH_SESSION_MISMATCH]: 'Session error. Please log in again',
  [ERROR_CODES.AUTH_FAILED]: 'Authentication failed. Please try again',
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: 'User account not found',
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',

  // Authorization messages
  [ERROR_CODES.ACCESS_DENIED]: 'You do not have permission to access this resource',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for this action',
  [ERROR_CODES.ADMIN_ACCESS_REQUIRED]: 'Only approved administrators can access this area',
  [ERROR_CODES.OWNER_ACCESS_REQUIRED]: 'Only the owner can access this area',

  // Validation messages
  [ERROR_CODES.VALIDATION_FAILED]: 'Please check your input and try again',
  [ERROR_CODES.INVALID_INPUT]: 'The provided information is invalid',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields',

  // Bad request messages
  [ERROR_CODES.BAD_REQUEST]: 'Invalid request. Please check your input',
  [ERROR_CODES.INVALID_FORMAT]: 'Invalid data format provided',
  [ERROR_CODES.INVALID_OPERATION]: 'This operation is not allowed',

  // Not found messages
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'Product not found',
  [ERROR_CODES.CHAT_NOT_FOUND]: 'Chat conversation not found',
  [ERROR_CODES.NOTIFICATION_NOT_FOUND]: 'Notification not found',
  [ERROR_CODES.TRANSACTION_NOT_FOUND]: 'Transaction not found',

  // Conflict messages
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'This resource already exists',
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists',
  [ERROR_CODES.USERNAME_ALREADY_EXISTS]: 'This username is already taken',

  // Server error messages
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Something went wrong. Please try again later',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred. Please try again',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service is temporarily unavailable',
} as const;

// Create standardized error response
export function createErrorResponse(
  statusCode: number,
  error: string,
  code?: string,
  message?: string,
  details?: any
): { statusCode: number; response: ApiErrorResponse } {
  const response: ApiErrorResponse = {
    error,
    timestamp: new Date().toISOString(),
  };

  if (code) {
    response.code = code;
    // Use custom message if provided, otherwise use predefined message
    response.message = message || ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
  } else if (message) {
    response.message = message;
  }

  if (details) {
    response.details = details;
  }

  return { statusCode, response };
}

// Handle different types of errors and send appropriate response
import { logError as logErrorStructured } from './logger';

export function handleError(res: Response, error: any, operation: string = 'operation'): void {
  logErrorStructured(error, operation);
  
  // Report error to Sentry with context
  captureError(error, { 
    operation, 
    errorCode: error.code,
    statusCode: getStatusCodeForError(error)
  });

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    const zodError = error as ZodError;
    const { statusCode, response } = createErrorResponse(
      422,
      'Validation failed',
      ERROR_CODES.VALIDATION_FAILED,
      undefined,
      zodError.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    );
    res.status(statusCode).json(response);
    return;
  }

  // Handle known application errors with specific codes
  if (error.code && ERROR_CODES[error.code as keyof typeof ERROR_CODES]) {
    const statusCode = getStatusCodeForErrorCode(error.code);
    const { response } = createErrorResponse(
      statusCode,
      error.message || error.error || 'An error occurred',
      error.code,
      undefined,
      error.details
    );
    res.status(statusCode).json(response);
    return;
  }

  // Handle database/constraint errors
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    const { statusCode, response } = createErrorResponse(
      409,
      'Resource already exists',
      ERROR_CODES.RESOURCE_ALREADY_EXISTS
    );
    res.status(statusCode).json(response);
    return;
  }

  // Default server error
  const { statusCode, response } = createErrorResponse(
    500,
    'An unexpected error occurred',
    ERROR_CODES.INTERNAL_SERVER_ERROR
  );
  res.status(statusCode).json(response);
}

// Specific error handler functions for common scenarios
export const ErrorHandlers = {
  // Authentication errors (401)
  tokenRequired: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      401,
      'Access token required',
      ERROR_CODES.AUTH_TOKEN_REQUIRED
    );
    res.status(statusCode).json(response);
  },

  tokenInvalid: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      401,
      'Invalid or expired token',
      ERROR_CODES.AUTH_TOKEN_INVALID
    );
    res.status(statusCode).json(response);
  },

  sessionMismatch: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      401,
      'Session mismatch',
      ERROR_CODES.AUTH_SESSION_MISMATCH
    );
    res.status(statusCode).json(response);
  },

  userNotFound: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      401,
      'User not found',
      ERROR_CODES.AUTH_USER_NOT_FOUND
    );
    res.status(statusCode).json(response);
  },

  authenticationFailed: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      401,
      'Authentication failed',
      ERROR_CODES.AUTH_FAILED
    );
    res.status(statusCode).json(response);
  },

  invalidCredentials: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      401,
      'Invalid email or password',
      ERROR_CODES.AUTH_INVALID_CREDENTIALS
    );
    res.status(statusCode).json(response);
  },

  // Authorization errors (403)
  accessDenied: (res: Response, message?: string): void => {
    const { statusCode, response } = createErrorResponse(
      403,
      'Access denied',
      ERROR_CODES.ACCESS_DENIED,
      message
    );
    res.status(statusCode).json(response);
  },

  adminRequired: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      403,
      'Admin access required',
      ERROR_CODES.ADMIN_ACCESS_REQUIRED
    );
    res.status(statusCode).json(response);
  },

  ownerRequired: (res: Response): void => {
    const { statusCode, response } = createErrorResponse(
      403,
      'Owner access required',
      ERROR_CODES.OWNER_ACCESS_REQUIRED
    );
    res.status(statusCode).json(response);
  },

  // Forbidden errors (403) - alias for common usage
  forbidden: (res: Response, message?: string): void => {
    const { statusCode, response } = createErrorResponse(
      403,
      'Forbidden',
      ERROR_CODES.ACCESS_DENIED,
      message
    );
    res.status(statusCode).json(response);
  },

  // Not found errors (404)
  notFound: (res: Response, resource: string = 'resource'): void => {
    const { statusCode, response } = createErrorResponse(
      404,
      `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found`,
      ERROR_CODES.RESOURCE_NOT_FOUND
    );
    res.status(statusCode).json(response);
  },

  // Bad request errors (400)
  badRequest: (res: Response, message: string): void => {
    const { statusCode, response } = createErrorResponse(
      400,
      message,
      ERROR_CODES.BAD_REQUEST
    );
    res.status(statusCode).json(response);
  },

  missingField: (res: Response, field: string): void => {
    const { statusCode, response } = createErrorResponse(
      400,
      `${field} is required`,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
    res.status(statusCode).json(response);
  },

  // Conflict errors (409)
  alreadyExists: (res: Response, resource: string): void => {
    const { statusCode, response } = createErrorResponse(
      409,
      `${resource} already exists`,
      ERROR_CODES.RESOURCE_ALREADY_EXISTS
    );
    res.status(statusCode).json(response);
  },

  // Server errors (500)
  serverError: (res: Response, operation: string = 'operation'): void => {
    const { statusCode, response } = createErrorResponse(
      500,
      `Failed to ${operation}`,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
    res.status(statusCode).json(response);
  },
};

// Helper function to get appropriate status code for error code
function getStatusCodeForErrorCode(code: string): number {
  // Authentication errors
  if (code.startsWith('AUTH_')) return 401;
  
  // Authorization errors
  if (code === ERROR_CODES.ACCESS_DENIED || 
      code === ERROR_CODES.INSUFFICIENT_PERMISSIONS ||
      code === ERROR_CODES.ADMIN_ACCESS_REQUIRED ||
      code === ERROR_CODES.OWNER_ACCESS_REQUIRED) return 403;
  
  // Validation errors
  if (code === ERROR_CODES.VALIDATION_FAILED ||
      code === ERROR_CODES.INVALID_INPUT ||
      code === ERROR_CODES.MISSING_REQUIRED_FIELD) return 422;
  
  // Not found errors
  if (code.includes('NOT_FOUND')) return 404;
  
  // Conflict errors
  if (code.includes('ALREADY_EXISTS')) return 409;
  
  // Server errors
  if (code === ERROR_CODES.INTERNAL_SERVER_ERROR ||
      code === ERROR_CODES.DATABASE_ERROR ||
      code === ERROR_CODES.EXTERNAL_SERVICE_ERROR) return 500;
  
  // Default to 400 for bad request
  return 400;
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error logging utility
export function logError(error: any, context: string, userId?: number): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    context,
    userId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  };
  
  logErrorStructured(error, context, { userId, timestamp });
  
  // Report to Sentry with context
  captureError(error, { context, userId });
}

// Helper function to get status code from error
function getStatusCodeForError(error: any): number {
  if (error.code && ERROR_CODES[error.code as keyof typeof ERROR_CODES]) {
    return getStatusCodeForErrorCode(error.code);
  }
  if (error.name === 'ZodError') return 422;
  if (error.code === '23505') return 409;
  return 500;
}