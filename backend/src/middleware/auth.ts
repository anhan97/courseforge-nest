import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { UserRole } from '@prisma/client';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
    isActive: boolean;
    isVerified: boolean;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Middleware to verify JWT token
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    // Verify the token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

// Middleware to check if user has required role(s)
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

// Middleware for admin-only routes
export const requireAdmin = authorize(UserRole.ADMIN);

// Removed: requireInstructor middleware (instructor role removed)

// Middleware for verified users only
export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.isVerified) {
    return next(new ForbiddenError('Email verification required'));
  }

  next();
};

// Middleware to check if user owns the resource or is admin
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const resourceUserId = req.params[userIdParam];
    
    // Admin can access any resource
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // User can only access their own resources
    if (req.user.id !== resourceUserId) {
      return next(new ForbiddenError('Access denied'));
    }

    next();
  };
};

// Middleware to check if user is instructor of the course or admin
export const requireCourseOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const courseId = req.params.courseId;
    
    if (!courseId) {
      return next(new Error('Course ID required'));
    }

    // Admin can access any course
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check if user is the instructor of the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true }
    });

    if (!course) {
      return next(new UnauthorizedError('Course not found'));
    }

    if (course.instructorId !== req.user.id) {
      return next(new ForbiddenError('You are not the instructor of this course'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware for optional authentication (user might or might not be logged in)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no auth header, continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
        }
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isVerified: user.isVerified,
        };
      }
    } catch (error) {
      // Ignore token errors in optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

// Utility function to check if user has specific permission
export const hasPermission = (
  user: AuthenticatedRequest['user'],
  requiredRole: UserRole | UserRole[]
): boolean => {
  if (!user) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
};

// Utility function to check if user is admin
export const isAdmin = (user: AuthenticatedRequest['user']): boolean => {
  return user?.role === UserRole.ADMIN;
};

// Utility function to check if user is instructor or admin
export const isInstructorOrAdmin = (user: AuthenticatedRequest['user']): boolean => {
  return user?.role === UserRole.INSTRUCTOR || user?.role === UserRole.ADMIN;
};

// Middleware to check if student has access to course content
export const requireCourseAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const courseId = req.params.courseId || req.params.id;
    
    if (!courseId) {
      return next(new Error('Course ID required'));
    }

    // Admin can access any course
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        isPublished: true,
        status: true
      }
    });

    if (!course) {
      return next(new UnauthorizedError('Course not found'));
    }

    // For students, check if they're enrolled and course is published
    if (req.user.role === UserRole.STUDENT) {
      if (!course.isPublished) {
        return next(new ForbiddenError('Course is not yet available'));
      }

      // Check enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: req.user.id,
            courseId: courseId
          }
        },
        select: { 
          status: true,
          expiresAt: true
        }
      });

      if (!enrollment) {
        return next(new ForbiddenError('You are not enrolled in this course'));
      }

      if (enrollment.status !== 'ACTIVE') {
        return next(new ForbiddenError('Your enrollment is not active'));
      }

      // Check if enrollment has expired
      if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
        return next(new ForbiddenError('Your course access has expired'));
      }

      return next();
    }

    // Only admins and enrolled students can access courses
    return next(new ForbiddenError('Access denied'));
    
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user can enroll in a course
export const canEnrollInCourse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const courseId = req.body.courseId || req.params.courseId;
    
    if (!courseId) {
      return next(new Error('Course ID required'));
    }

    // Only students can enroll in courses
    if (req.user.role !== UserRole.STUDENT) {
      return next(new ForbiddenError('Only students can enroll in courses'));
    }

    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        isPublished: true,
        status: true
      }
    });

    if (!course) {
      return next(new UnauthorizedError('Course not found'));
    }

    if (!course.isPublished) {
      return next(new ForbiddenError('Course is not available for enrollment'));
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user.id,
          courseId: courseId
        }
      }
    });

    if (existingEnrollment) {
      return next(new ForbiddenError('You are already enrolled in this course'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting middleware for sensitive operations
export const sensitiveOperationLimit = (req: Request, res: Response, next: NextFunction) => {
  // This would typically integrate with Redis for distributed rate limiting
  // For now, we'll rely on the global rate limiter
  next();
};