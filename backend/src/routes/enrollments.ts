import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, requireAdmin, canEnrollInCourse, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const enrollmentSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
});

const updateEnrollmentSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'SUSPENDED']).optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
});

// Get user's enrollments
router.get('/my', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const sortBy = req.query.sortBy as string || 'enrolledAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    userId: req.user!.id,
  };

  if (status) {
    where.status = status;
  }

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        completedAt: true,
        expiresAt: true,
        lastAccessedAt: true,
        completionPercentage: true,
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            shortDescription: true,
            thumbnailUrl: true,
            price: true,
            level: true,
            duration: true,
            rating: true,
            reviewCount: true,
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc'
      },
      skip,
      take: limit,
    }),
    prisma.enrollment.count({ where })
  ]);

  res.json({
    enrollments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
}));

// Enroll in a course (students only)
router.post('/', authenticate, canEnrollInCourse, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { courseId } = enrollmentSchema.parse(req.body);

  // Get course details for response
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      price: true,
      instructor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: req.user!.id,
      courseId: courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      expiresAt: true,
      completionPercentage: true,
    }
  });

  // Update course enrollment count
  await prisma.course.update({
    where: { id: courseId },
    data: {
      enrollmentCount: {
        increment: 1
      }
    }
  });

  res.status(201).json({
    message: 'Enrolled in course successfully',
    enrollment: {
      ...enrollment,
      course
    }
  });
}));

// Get enrollment details
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const enrollmentId = req.params.id;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      expiresAt: true,
      lastAccessedAt: true,
      certificateUrl: true,
      completionPercentage: true,
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          shortDescription: true,
          thumbnailUrl: true,
          price: true,
          level: true,
          duration: true,
          rating: true,
          reviewCount: true,
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              bio: true,
              avatar: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          modules: {
            where: { isPublished: true },
            select: {
              id: true,
              title: true,
              description: true,
              orderIndex: true,
              lessons: {
                where: { isPublished: true },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  videoDuration: true,
                  orderIndex: true,
                  isFree: true,
                },
                orderBy: { orderIndex: 'asc' }
              }
            },
            orderBy: { orderIndex: 'asc' }
          }
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      }
    }
  });

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  // Check permissions - user can view their own enrollment, admin can view any
  if (req.user!.role !== 'ADMIN' && enrollment.userId !== req.user!.id) {
    throw new ForbiddenError('Access denied');
  }

  res.json(enrollment);
}));

// Update enrollment status (admin only, or student for completion tracking)
router.put('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const enrollmentId = req.params.id;
  const validatedData = updateEnrollmentSchema.parse(req.body);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { 
      userId: true,
      status: true,
      completionPercentage: true,
    }
  });

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  // Check permissions
  const isOwner = enrollment.userId === req.user!.id;
  const isAdmin = req.user!.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Access denied');
  }

  // Students can only update completion percentage
  if (isOwner && !isAdmin) {
    if (validatedData.status && validatedData.status !== enrollment.status) {
      throw new ForbiddenError('Students cannot change enrollment status');
    }
    
    // Only allow completion percentage updates
    if (validatedData.completionPercentage === undefined) {
      throw new ValidationError('Students can only update completion percentage');
    }
  }

  // Prepare update data
  const updateData: any = {};

  if (validatedData.status && isAdmin) {
    updateData.status = validatedData.status;
    
    // Set completion date if status is COMPLETED
    if (validatedData.status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.completionPercentage = 100;
    }
  }

  if (validatedData.completionPercentage !== undefined) {
    updateData.completionPercentage = validatedData.completionPercentage;
    
    // Auto-complete if 100%
    if (validatedData.completionPercentage === 100 && enrollment.status === 'ACTIVE') {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
    }
  }

  // Update last accessed time for students
  if (isOwner) {
    updateData.lastAccessedAt = new Date();
  }

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: updateData,
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      expiresAt: true,
      lastAccessedAt: true,
      completionPercentage: true,
      course: {
        select: {
          id: true,
          title: true,
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    }
  });

  res.json({
    message: 'Enrollment updated successfully',
    enrollment: updatedEnrollment
  });
}));

// Get all enrollments (admin only)
router.get('/', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const courseId = req.query.courseId as string;
  const userId = req.query.userId as string;
  const sortBy = req.query.sortBy as string || 'enrolledAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (courseId) {
    where.courseId = courseId;
  }

  if (userId) {
    where.userId = userId;
  }

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        completedAt: true,
        expiresAt: true,
        lastAccessedAt: true,
        completionPercentage: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc'
      },
      skip,
      take: limit,
    }),
    prisma.enrollment.count({ where })
  ]);

  res.json({
    enrollments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
}));

// Delete enrollment (admin only)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const enrollmentId = req.params.id;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true }
  });

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  await prisma.enrollment.delete({
    where: { id: enrollmentId }
  });

  // Update course enrollment count
  await prisma.course.update({
    where: { id: enrollment.courseId },
    data: {
      enrollmentCount: {
        decrement: 1
      }
    }
  });

  res.json({
    message: 'Enrollment deleted successfully'
  });
}));

export default router;