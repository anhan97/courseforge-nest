import { Request, Response, NextFunction } from 'express';

interface LoggedRequest extends Request {
  startTime?: number;
}

export const requestLogger = (req: LoggedRequest, res: Response, next: NextFunction) => {
  // Skip logging for health check and static assets
  if (req.path === '/health' || req.path.startsWith('/static')) {
    return next();
  }

  // Record start time
  req.startTime = Date.now();

  // Get request information
  const requestInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    authorization: req.get('Authorization') ? 'Bearer [HIDDEN]' : undefined,
    body: shouldLogBody(req) ? sanitizeBody(req.body) : '[BODY_HIDDEN]',
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
  };

  // Log the incoming request
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`, {
    ...requestInfo,
    type: 'request'
  });

  // Capture response data
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    
    // Log the response
    const responseInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      ip: req.ip || req.connection.remoteAddress,
    };

    // Determine log level based on status code
    const logLevel = getLogLevel(res.statusCode);
    const logMethod = logLevel === 'error' ? console.error : 
                     logLevel === 'warn' ? console.warn : console.log;

    logMethod(`[RESPONSE] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`, {
      ...responseInfo,
      type: 'response'
    });

    // Log slow requests (> 1 second)
    if (responseTime > 1000) {
      console.warn(`[SLOW_REQUEST] ${req.method} ${req.originalUrl} took ${responseTime}ms`, {
        ...responseInfo,
        type: 'slow_request',
        threshold: '1000ms'
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// Determine if request body should be logged
function shouldLogBody(req: Request): boolean {
  // Don't log body for certain sensitive routes
  const sensitiveRoutes = ['/auth/login', '/auth/register', '/auth/reset-password'];
  if (sensitiveRoutes.some(route => req.path.includes(route))) {
    return false;
  }

  // Don't log body for file uploads
  if (req.get('Content-Type')?.includes('multipart/form-data')) {
    return false;
  }

  // Don't log large bodies
  const contentLength = parseInt(req.get('Content-Length') || '0');
  if (contentLength > 10000) {
    return false;
  }

  return true;
}

// Sanitize request body to remove sensitive information
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'socialSecurityNumber'
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[HIDDEN]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }

  return sanitized;
}

// Determine log level based on status code
function getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) {
    return 'error';
  } else if (statusCode >= 400) {
    return 'warn';
  } else {
    return 'info';
  }
}

// Export additional logging utilities
export const logInfo = (message: string, data?: any) => {
  console.log(`[INFO] ${message}`, {
    timestamp: new Date().toISOString(),
    type: 'info',
    ...data
  });
};

export const logWarning = (message: string, data?: any) => {
  console.warn(`[WARNING] ${message}`, {
    timestamp: new Date().toISOString(),
    type: 'warning',
    ...data
  });
};

export const logError = (message: string, error?: any, data?: any) => {
  console.error(`[ERROR] ${message}`, {
    timestamp: new Date().toISOString(),
    type: 'error',
    error: error?.message || error,
    stack: error?.stack,
    ...data
  });
};

export const logDatabase = (operation: string, table: string, data?: any) => {
  console.log(`[DATABASE] ${operation} on ${table}`, {
    timestamp: new Date().toISOString(),
    type: 'database',
    operation,
    table,
    ...data
  });
};

export const logAuth = (action: string, userId?: string, data?: any) => {
  console.log(`[AUTH] ${action}`, {
    timestamp: new Date().toISOString(),
    type: 'auth',
    action,
    userId: userId ? `user_${userId.substring(0, 8)}...` : 'anonymous',
    ...data
  });
};