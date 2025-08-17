import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_SERVER_ERROR';
    this.details = details;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let details = error.details;

  // Log error for debugging
  console.error(`[${new Date().toISOString()}] Error:`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      statusCode,
      code,
      stack: error.stack,
      details
    }
  });

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this data already exists';
        details = {
          field: error.meta?.target,
          prismaCode: error.code
        };
        break;
      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
        details = {
          prismaCode: error.code
        };
        break;
      case 'P2003':
        statusCode = 400;
        code = 'FOREIGN_KEY_CONSTRAINT';
        message = 'Foreign key constraint failed';
        details = {
          field: error.meta?.field_name,
          prismaCode: error.code
        };
        break;
      case 'P2014':
        statusCode = 400;
        code = 'INVALID_ID';
        message = 'Invalid ID provided';
        details = {
          prismaCode: error.code
        };
        break;
      default:
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
        details = {
          prismaCode: error.code
        };
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid data provided';
    details = {
      type: 'PrismaValidationError'
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = {
      issues: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    };
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token provided';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // Handle Multer errors (file upload)
  if (error.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    switch (error.message) {
      case 'File too large':
        message = 'File size too large';
        break;
      case 'Too many files':
        message = 'Too many files uploaded';
        break;
      default:
        message = 'File upload error';
    }
  }

  // Handle specific Node.js errors
  if (error.code === 'ENOTFOUND') {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'External service unavailable';
  }

  if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    code = 'CONNECTION_REFUSED';
    message = 'Connection refused to external service';
  }

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    // Don't send stack traces in production
    delete error.stack;
    
    // Generic message for 5xx errors
    if (statusCode >= 500) {
      message = 'Internal Server Error';
      details = undefined;
    }
  }

  // Send error response
  const errorResponse: any = {
    error: true,
    message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Include details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create standardized error responses
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): AppError => {
  return new AppError(message, statusCode, code, details);
};

// Common error creators
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}