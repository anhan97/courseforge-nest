import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Admin statistics (comprehensive)
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalCourses,
    totalEnrollments,
    recentUsers,
    recentCourses,
    recentEnrollments,
    usersByRole,
    coursesByStatus
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
    prisma.course.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
    prisma.enrollment.count({
      where: {
        enrolledAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: true
    }),
    prisma.course.groupBy({
      by: ['status'],
      _count: true
    })
  ]);

  // Calculate total revenue (placeholder for now)
  const totalRevenue = 0;

  // Format user roles
  const formattedUsersByRole = usersByRole.reduce((acc: any, item) => {
    acc[item.role] = item._count;
    return acc;
  }, { ADMIN: 0, STUDENT: 0 });

  // Format course status
  const formattedCoursesByStatus = coursesByStatus.reduce((acc: any, item) => {
    acc[item.status] = item._count;
    return acc;
  }, { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 });

  // Mock monthly data (in a real app, you'd query actual monthly data)
  const enrollmentsByMonth = [
    { month: 'Jan', count: 45 },
    { month: 'Feb', count: 52 },
    { month: 'Mar', count: 48 },
    { month: 'Apr', count: 61 },
    { month: 'May', count: 55 },
    { month: 'Jun', count: 67 }
  ];

  const revenueByMonth = [
    { month: 'Jan', revenue: 1250 },
    { month: 'Feb', revenue: 1680 },
    { month: 'Mar', revenue: 1420 },
    { month: 'Apr', revenue: 1890 },
    { month: 'May', revenue: 1650 },
    { month: 'Jun', revenue: 2100 }
  ];

  res.json({
    totalUsers,
    totalCourses,
    totalEnrollments,
    totalRevenue,
    recentUsers,
    recentCourses,
    recentEnrollments,
    usersByRole: formattedUsersByRole,
    coursesByStatus: formattedCoursesByStatus,
    enrollmentsByMonth,
    revenueByMonth
  });
}));

// Dashboard statistics (legacy endpoint)
router.get('/dashboard/stats', asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalCourses,
    totalEnrollments,
    activeUsers,
    publishedCourses,
    recentEnrollments
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    }),
    prisma.course.count({
      where: { isPublished: true }
    }),
    prisma.enrollment.count({
      where: {
        enrolledAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })
  ]);

  res.json({
    totalUsers,
    totalCourses,
    totalEnrollments,
    activeUsers,
    publishedCourses,
    recentEnrollments,
    revenue: 0 // Placeholder for now
  });
}));

// User management
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, role, status } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {};
  
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ];
  }
  
  if (role && role !== 'all') {
    where.role = role;
  }
  
  if (status && status !== 'all') {
    where.isActive = status === 'active';
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    users,
    pagination: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(totalCount / Number(limit))
    }
  });
}));

router.put('/users/:id/status', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: id! },
    select: { id: true }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent admin from deactivating themselves
  if (user.id === req.user!.id) {
    throw new ValidationError('Cannot change your own status');
  }

  const updatedUser = await prisma.user.update({
    where: { id: id! },

    data: { isActive: Boolean(isActive) },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true
    }
  });

  res.json({
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    user: updatedUser
  });
}));

// Create new user
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'STUDENT']).default('STUDENT'),
  isVerified: z.boolean().default(false)
});

router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createUserSchema.parse(req.body);
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validatedData.email }
  });
  
  if (existingUser) {
    throw new ValidationError('User with this email already exists');
  }
  
  // Hash password
  const { hashPassword } = require('../utils/password');
  const hashedPassword = await hashPassword(validatedData.password);
  
  const user = await prisma.user.create({
    data: {
      ...validatedData,
      password: hashedPassword,
      isActive: true
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true
    }
  });
  
  res.status(201).json({
    message: 'User created successfully',
    user
  });
}));

// Update user
const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  role: z.enum(['ADMIN', 'STUDENT']).optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional()
});

router.put('/users/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const validatedData = updateUserSchema.parse(req.body);
  
  const existingUser = await prisma.user.findUnique({
    where: { id: id! },
    select: { id: true, email: true }
  });
  
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }
  
  // Prevent admin from changing their own role to STUDENT
  if (existingUser.id === req.user!.id && validatedData.role === 'STUDENT') {
    throw new ValidationError('Cannot change your own role from ADMIN to STUDENT');
  }
  
  // Check if email is being changed and already exists
  if (validatedData.email && validatedData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (emailExists) {
      throw new ValidationError('Email already exists');
    }
  }
  
  // Hash password if provided
  let updateData = { ...validatedData };
  if (validatedData.password) {
    const { hashPassword } = require('../utils/password');
    updateData.password = await hashPassword(validatedData.password);
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: id! },
    data: {
      ...updateData,
      updatedAt: new Date()
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  res.json({
    message: 'User updated successfully',
    user: updatedUser
  });
}));

// Delete user
router.delete('/users/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const existingUser = await prisma.user.findUnique({
    where: { id: id! },
    select: { id: true }
  });
  
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }
  
  // Prevent admin from deleting themselves
  if (existingUser.id === req.user!.id) {
    throw new ValidationError('Cannot delete your own account');
  }
  
  await prisma.user.delete({
    where: { id: id! }
  });
  
  res.json({
    message: 'User deleted successfully'
  });
}));

// Bulk course assignment to users
const bulkAssignSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  courseIds: z.array(z.string()).min(1, 'At least one course ID is required')
});

router.post('/users/bulk-assign-courses', asyncHandler(async (req: Request, res: Response) => {
  const { userIds, courseIds } = bulkAssignSchema.parse(req.body);
  
  // Verify users exist
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true }
  });
  
  if (existingUsers.length !== userIds.length) {
    throw new ValidationError('Some users not found');
  }
  
  // Verify courses exist
  const existingCourses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true }
  });
  
  if (existingCourses.length !== courseIds.length) {
    throw new ValidationError('Some courses not found');
  }
  
  // Create enrollments for all user-course combinations
  const enrollments = [];
  for (const userId of userIds) {
    for (const courseId of courseIds) {
      enrollments.push({
        userId,
        courseId,
        status: 'ACTIVE',
        enrolledAt: new Date()
      });
    }
  }
  
  // Use upsert to avoid duplicate enrollment errors
  const results = await Promise.allSettled(
    enrollments.map(enrollment =>
      prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: enrollment.userId,
            courseId: enrollment.courseId
          }
        },
        update: {
          status: 'ACTIVE',
          enrolledAt: new Date()
        },
        create: enrollment
      })
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  
  res.json({
    message: `Successfully assigned ${courseIds.length} course(s) to ${userIds.length} user(s)`,
    assigned: successful,
    users: existingUsers,
    courses: existingCourses
  });
}));

// Course management
router.get('/courses', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, status, visibility, category, level } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {};
  
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } }
    ];
  }
  
  if (status && status !== 'all') {
    if (status === 'published') {
      where.isPublished = true;
    } else if (status === 'draft') {
      where.isPublished = false;
    }
  }

  if (visibility && visibility !== 'all') {
    if (visibility === 'FREE') {
      where.price = 0;
    } else if (visibility === 'PREMIUM') {
      where.price = { gt: 0 };
    }
  }

  if (category && category !== 'all') {
    where.category = {
      name: { contains: category as string, mode: 'insensitive' }
    };
  }

  if (level && level !== 'all') {
    where.level = level as string;
  }
  


  const [courses, totalCount] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: Number(limit),
      select: {
        id: true,
        title: true,
        description: true,
        shortDescription: true,
        thumbnailUrl: true,
        price: true,
        originalPrice: true,
        level: true,
        duration: true,
        requirements: true,
        whatYouLearn: true,
  

        status: true,
        isPublished: true,
        publishedAt: true,
        enrollmentCount: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        updatedAt: true,
        instructorId: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            modules: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.course.count({ where })
  ]);

  // Transform courses to include computed fields
  const transformedCourses = courses.map(course => ({
    ...course,
    // Calculate visibility based on price
    visibility: Number(course.price) === 0 ? 'FREE' : 'PREMIUM',
    // Calculate revenue (placeholder calculation)
    revenue: Number(course.price) * course.enrollmentCount,
    // Add placeholder for authorized users (for private courses)
    authorizedUsers: 0,
    // Add max enrollments (placeholder)
    maxEnrollments: null,
    // Add placeholder instructor info
    instructor: course.instructorId ? {
      id: course.instructorId,
      firstName: 'Course',
      lastName: 'Admin',
      email: 'admin@courseforge.com'
    } : null,
  }));

  res.json({
    courses: transformedCourses,
    pagination: {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(totalCount / Number(limit))
    }
  });
}));

// Update course
router.put('/courses/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    shortDescription,
    price,
    originalPrice,
    level,
    duration,
    requirements,
    whatYouLearn,
    tags,
    thumbnailUrl,
    language,
    status
  } = req.body;

  // Check if course exists
  const existingCourse = await prisma.course.findUnique({
    where: { id: id! },
    select: { id: true }
  });

  if (!existingCourse) {
    throw new NotFoundError('Course not found');
  }

  // Update course
  const updatedCourse = await prisma.course.update({
    where: { id: id! },
    data: {
      title,
      description,
      shortDescription,
      price: price ? parseFloat(price.toString()) : undefined,
      originalPrice: originalPrice ? parseFloat(originalPrice.toString()) : undefined,
      level,
      duration: duration ? parseInt(duration.toString()) : undefined,
      requirements: Array.isArray(requirements) ? requirements : undefined,
      whatYouLearn: Array.isArray(whatYouLearn) ? whatYouLearn : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      thumbnailUrl,
      language,
      status,
      updatedAt: new Date()
    },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      thumbnailUrl: true,
      price: true,
      originalPrice: true,
      level: true,
      duration: true,
      requirements: true,
      whatYouLearn: true,
      tags: true,
      language: true,
      status: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true
    }
  });

  res.json({
    message: 'Course updated successfully',
    course: updatedCourse
  });
}));

router.put('/courses/:id/publish', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body;

  const course = await prisma.course.findUnique({
    where: { id: id! },
    select: { id: true }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const updatedCourse = await prisma.course.update({
    where: { id: id! },

    data: { 
      isPublished: Boolean(isPublished),
      publishedAt: isPublished ? new Date() : null,
      status: isPublished ? 'PUBLISHED' : 'DRAFT'
    },
    select: {
      id: true,
      title: true,
      isPublished: true,
      publishedAt: true,
      status: true
    }
  });

  res.json({
    message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
    course: updatedCourse
  });
}));

// Bulk course actions
router.post('/courses/bulk-action', asyncHandler(async (req: Request, res: Response) => {
  const { action, courseIds } = req.body;

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    throw new ValidationError('Course IDs are required');
  }

  // Verify all courses exist
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true }
  });

  if (courses.length !== courseIds.length) {
    throw new ValidationError('Some courses not found');
  }

  let updateData: any = {};
  let message = '';

  switch (action) {
    case 'publish':
      updateData = {
        isPublished: true,
        publishedAt: new Date(),
        status: 'PUBLISHED'
      };
      message = `${courseIds.length} course(s) published successfully`;
      break;

    case 'unpublish':
      updateData = {
        isPublished: false,
        publishedAt: null,
        status: 'DRAFT'
      };
      message = `${courseIds.length} course(s) unpublished successfully`;
      break;

    case 'archive':
      updateData = {
        status: 'ARCHIVED',
        isPublished: false
      };
      message = `${courseIds.length} course(s) archived successfully`;
      break;

    case 'makeFree':
      updateData = { price: 0 };
      message = `${courseIds.length} course(s) made free successfully`;
      break;

    case 'delete':
      await prisma.course.deleteMany({
        where: { id: { in: courseIds } }
      });
      return res.json({
        message: `${courseIds.length} course(s) deleted successfully`,
        deletedCount: courseIds.length
      });

    default:
      throw new ValidationError('Invalid action');
  }

  const result = await prisma.course.updateMany({
    where: { id: { in: courseIds } },
    data: updateData
  });

  return res.json({
    message,
    updatedCount: result.count,
    affectedCourses: courses.map(c => c.title)
  });
}));

// Course creation (admin can create courses)
const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  instructorId: z.string().uuid('Invalid instructor ID').optional(),
  price: z.number().min(0, 'Price must be positive').default(0),
  originalPrice: z.number().min(0, 'Original price must be positive').optional(),
  currency: z.string().default('USD'),
  language: z.string().default('en'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  duration: z.number().min(0, 'Duration must be positive').optional(),
  requirements: z.array(z.string()).default([]),
  whatYouLearn: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

router.post('/courses', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validatedData = createCourseSchema.parse(req.body);

  // Get or create default category if not provided
  let categoryId = validatedData.categoryId;
  if (!categoryId) {
    let defaultCategory = await prisma.category.findFirst({
      where: { name: 'General' }
    });
    
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: 'General',
          slug: 'general',
          description: 'General courses category'
        }
      });
    }
    categoryId = defaultCategory.id;
  } else {
    // Verify category exists if provided
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      throw new ValidationError('Invalid category ID');
    }
  }




  const course = await prisma.course.create({
    data: {
      title: validatedData.title,
      description: validatedData.description || null,
      shortDescription: validatedData.shortDescription || null,
      thumbnailUrl: validatedData.thumbnailUrl || null,
      price: validatedData.price,
      originalPrice: validatedData.originalPrice || null,
      currency: validatedData.currency,
      language: validatedData.language,
      level: validatedData.level,
      duration: validatedData.duration || null,
      requirements: validatedData.requirements || [],
      whatYouLearn: validatedData.whatYouLearn || [],

      categoryId: categoryId!,
      instructorId: req.user!.id,
      status: 'DRAFT',
      isPublished: false,
    },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      thumbnailUrl: true,
      price: true,
      originalPrice: true,
      level: true,
      duration: true,
      requirements: true,
      whatYouLearn: true,


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

// Get categories for course creation
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true
    },
    orderBy: { name: 'asc' }
  });

  res.json({ categories });
}));

// Removed: Instructor route

// User course access management
router.get('/users/:userId/enrollments', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { id: true, email: true }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: userId! },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      expiresAt: true,
      completionPercentage: true,
      course: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          price: true,
          level: true,
          isPublished: true,
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { enrolledAt: 'desc' }
  });

  res.json({ enrollments });
}));

// Grant course access to user
router.post('/users/:userId/enrollments', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { courseId, expiresAt } = req.body;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { id: true, email: true }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId! },
    select: { id: true }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check if enrollment already exists
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { 
      userId_courseId: {
        userId: userId!,
        courseId: courseId!
      }
    },
    select: { id: true }
  });

  if (existingEnrollment) {
    throw new ValidationError('User is already enrolled in this course');
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      userId: userId!,
      courseId: courseId!,
      status: 'ACTIVE',
      expiresAt: expiresAt ? new Date(expiresAt) : null
    },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      expiresAt: true,
      course: {
        select: {
          id: true,
          title: true,

        }
      }
    }
  });

  res.status(201).json({
    message: 'Course access granted successfully',
    enrollment
  });
}));

// Revoke course access from user
router.delete('/users/:userId/enrollments/:enrollmentId', asyncHandler(async (req: Request, res: Response) => {
  const { userId, enrollmentId } = req.params;

  const enrollment = await prisma.enrollment.findUnique({
    where: { 
      id: enrollmentId!,
      userId: userId!
    },
    select: {
      id: true,
      course: {
        select: {
          title: true
        }
      }
    }
  });

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  await prisma.enrollment.delete({
    where: { id: enrollmentId! }
  });

  res.json({
    message: 'Course access revoked successfully',
    courseTitle: enrollment.course.title
  });
}));

// Order management
router.get('/orders', asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Admin order management - coming soon' });
}));

// Analytics and reports
router.get('/analytics/overview', asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Admin analytics overview - coming soon' });
}));

router.get('/reports/revenue', asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Revenue reports - coming soon' });
}));

router.get('/reports/engagement', asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Engagement reports - coming soon' });
}));

export default router;