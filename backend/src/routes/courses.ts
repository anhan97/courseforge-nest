import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, requireAdmin, optionalAuth, requireCourseAccess, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  price: z.number().min(0, 'Price must be positive'),
  originalPrice: z.number().min(0, 'Original price must be positive').optional(),
  currency: z.string().default('USD'),
  language: z.string().default('en'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  requirements: z.array(z.string()).default([]),
  whatYouLearn: z.array(z.string()).default([]),
});

const updateCourseSchema = createCourseSchema.partial();

// Get all courses (public - shows all published courses)
router.get('/', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const search = req.query.search as string;
  const category = req.query.category as string;
  const level = req.query.level as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    isPublished: true, // Only show published courses to public
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.categoryId = category;
  }

  if (level) {
    where.level = level;
  }

  // If user is admin, show all courses including drafts
  if (req.user && req.user.role === 'ADMIN') {
    delete where.isPublished;
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        shortDescription: true,
        thumbnailUrl: true,
        price: true,
        originalPrice: true,
        currency: true,
        level: true,
        duration: true,
        enrollmentCount: true,
        rating: true,
        reviewCount: true,
        isPublished: true,
        status: true,
        createdAt: true,

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        // Check if current user is enrolled (for students)
        ...(req.user?.role === 'STUDENT' ? {
          enrollments: {
            where: {
              userId: req.user.id,
              status: 'ACTIVE'
            },
            select: {
              status: true,
              enrolledAt: true,
            }
          }
        } : {})
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc'
      },
      skip,
      take: limit,
    }),
    prisma.course.count({ where })
  ]);

  // Transform courses to include enrollment info
  const transformedCourses = courses.map(course => {
    const hasActiveEnrollment = req.user?.role === 'STUDENT' ? course.enrollments?.length > 0 : false;
    return {
      ...course,
      isEnrolled: hasActiveEnrollment,
      canAccess: req.user?.role === 'ADMIN' || 
                 hasActiveEnrollment ||
                 course.price === 0, // Free courses are accessible to everyone
      enrollments: undefined, // Remove from response
    };
  });

  res.json({
    courses: transformedCourses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
}));

// Get course by ID (public for published courses, shows enrollment status)
router.get('/:id', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      thumbnailUrl: true,
      price: true,
      originalPrice: true,
      currency: true,
      language: true,
      level: true,
      duration: true,
      requirements: true,
      whatYouLearn: true,
      enrollmentCount: true,
      rating: true,
      reviewCount: true,
      isPublished: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,

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
      },
      // Check enrollment status for students
      ...(req.user?.role === 'STUDENT' ? {
        enrollments: {
          where: {
            userId: req.user.id
          },
          select: {
            status: true,
            enrolledAt: true,
            completionPercentage: true,
            expiresAt: true,
          }
        }
      } : {})
    }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check if user can view this course
  if (!course.isPublished) {
    if (!req.user) {
      throw new NotFoundError('Course not found');
    }
    // Only admin can view unpublished courses
    if (req.user.role !== 'ADMIN') {
      throw new NotFoundError('Course not found');
    }
  }

  // Transform response
  const enrollment = course.enrollments?.[0];
  const response = {
    ...course,
    isEnrolled: !!enrollment,
    enrollmentStatus: enrollment?.status,
    enrolledAt: enrollment?.enrolledAt,
    completionPercentage: enrollment?.completionPercentage,
    canAccess: req.user?.role === 'ADMIN' || 
               enrollment?.status === 'ACTIVE' ||
               course.price === 0, // Free courses are accessible to everyone
    enrollments: undefined, // Remove from response
  };

  res.json(response);
}));

// Get course content/modules (public for browsing, enrollment needed for full access)
router.get('/:id/content', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      isPublished: true,

      modules: {
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          description: true,
          orderIndex: true,
          isPublished: true,
          lessons: {
            where: { isPublished: true },
            select: {
              id: true,
              title: true,
              description: true,
              videoUrl: true,
              videoDuration: true,
              videoProvider: true,
              content: true,
              orderIndex: true,
              isFree: true,
              isPublished: true,
              attachments: {
                select: {
                  id: true,
                  fileName: true,
                  fileUrl: true,
                  fileType: true,
                  fileSize: true,
                }
              }
            },
            orderBy: { orderIndex: 'asc' }
          }
        },
        orderBy: { orderIndex: 'asc' }
      },
      // Check enrollment status for students
      ...(req.user?.role === 'STUDENT' ? {
        enrollments: {
          where: {
            userId: req.user.id,
            status: 'ACTIVE'
          },
          select: {
            status: true,
            enrolledAt: true,
            completionPercentage: true,
          }
        }
      } : {})
    }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check if course is published for non-admin users
  if (!course.isPublished) {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new NotFoundError('Course not found');
    }
  }

  // Check user access
  const isAdmin = req.user?.role === 'ADMIN';
  const enrollment = course.enrollments?.[0];
  const isEnrolled = !!enrollment;
  const isFree = course.price === 0;

  // Transform response based on access level
  const hasFullAccess = isAdmin || isEnrolled || isFree;

  const transformedCourse = {
    ...course,
    isEnrolled,
    canAccess: hasFullAccess,
    modules: course.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        // For non-enrolled users, hide sensitive content unless lesson is free
        const canAccessLesson = hasFullAccess || lesson.isFree;
        
        return {
          ...lesson,
          // Hide video URL and content for protected lessons
          videoUrl: canAccessLesson ? lesson.videoUrl : null,
          content: canAccessLesson ? lesson.content : null,
          attachments: canAccessLesson ? lesson.attachments : [],
        };
      })
    })),
    enrollments: undefined, // Remove from response
  };

  res.json(transformedCourse);
}));

// Create new course (admin only)
router.post('/', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validatedData = createCourseSchema.parse(req.body);

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: validatedData.categoryId }
  });

  if (!category) {
    throw new ValidationError('Invalid category ID');
  }

  const course = await prisma.course.create({
    data: {
      ...validatedData,
      status: 'DRAFT',
      isPublished: false,
    },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      price: true,
      originalPrice: true,
      level: true,
      status: true,
      isPublished: true,
      createdAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    }
  });

  res.status(201).json({
    message: 'Course created successfully',
    course
  });
}));

// Update course (admin only)
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const validatedData = updateCourseSchema.parse(req.body);

  // Check if course exists
  const existingCourse = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true }
  });

  if (!existingCourse) {
    throw new NotFoundError('Course not found');
  }

  if (validatedData.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId }
    });

    if (!category) {
      throw new ValidationError('Invalid category ID');
    }
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: validatedData,
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      price: true,
      originalPrice: true,
      level: true,
      status: true,
      isPublished: true,
      updatedAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    }
  });

  res.json({
    message: 'Course updated successfully',
    course
  });
}));

// Delete course (admin only)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;

  // Check if course exists
  const existingCourse = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true }
  });

  if (!existingCourse) {
    throw new NotFoundError('Course not found');
  }

  await prisma.course.delete({
    where: { id: courseId }
  });

  res.json({
    message: 'Course deleted successfully'
  });
}));

// Enroll in course
router.post('/:id/enroll', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id: courseId } = req.params;
  const userId = req.user!.id;

  // Check if course exists and is published
  const course = await prisma.course.findUnique({
    where: { id: courseId! },
    select: {
      id: true,
      title: true,
      isPublished: true,
      price: true
    }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  if (!course.isPublished) {
    throw new ValidationError('Course is not available for enrollment');
  }

  // Check if user is already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: courseId!
      }
    }
  });

  if (existingEnrollment) {
    return res.json({
      message: 'Already enrolled in this course',
      enrollment: existingEnrollment
    });
  }

  // Create enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId: courseId!,
      status: 'ACTIVE',
      enrolledAt: new Date()
    },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      course: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Successfully enrolled in course',
    enrollment
  });
}));

export default router;