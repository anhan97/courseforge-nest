import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, requireAdmin, requireCourseAccess, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createModuleSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative').optional(),
});

const updateModuleSchema = createModuleSchema.partial().omit({ courseId: true });

const reorderModulesSchema = z.object({
  modules: z.array(z.object({
    id: z.string().uuid(),
    orderIndex: z.number().int().min(0)
  }))
});

// Get all modules for a course
router.get('/course/:courseId', authenticate, requireCourseAccess, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { courseId } = req.params;

  // Check if course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, isPublished: true }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const modules = await prisma.module.findMany({
    where: { courseId },
    include: {
      lessons: {
        select: {
          id: true,
          title: true,
          description: true,
          videoDuration: true,
          orderIndex: true,
          isFree: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              attachments: true
            }
          }
        },
        orderBy: { orderIndex: 'asc' }
      },
      _count: {
        select: {
          lessons: true
        }
      }
    },
    orderBy: { orderIndex: 'asc' }
  });

  res.json({ modules });
}));

// Create new module
router.post('/', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validatedData = createModuleSchema.parse(req.body);

  // Check if course exists
  const course = await prisma.course.findUnique({
    where: { id: validatedData.courseId },
    select: { id: true }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // If no order index provided, make it the last module
  let orderIndex = validatedData.orderIndex;
  if (orderIndex === undefined) {
    const lastModule = await prisma.module.findFirst({
      where: { courseId: validatedData.courseId },
      orderBy: { orderIndex: 'desc' }
    });
    orderIndex = lastModule ? lastModule.orderIndex + 1 : 0;
  }

  const module = await prisma.module.create({
    data: {
      ...validatedData,
      orderIndex
    },
    include: {
      lessons: {
        select: {
          id: true,
          title: true,
          description: true,
          videoDuration: true,
          orderIndex: true,
          isFree: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { orderIndex: 'asc' }
      },
      _count: {
        select: {
          lessons: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Module created successfully',
    module
  });
}));

// Update module
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const validatedData = updateModuleSchema.parse(req.body);

  // Check if module exists and user has permission
  const existingModule = await prisma.module.findUnique({
    where: { id },
    include: {
      course: {
        select: { id: true }
      }
    }
  });

  if (!existingModule) {
    throw new NotFoundError('Module not found');
  }



  const module = await prisma.module.update({
    where: { id },
    data: validatedData,
    include: {
      lessons: {
        select: {
          id: true,
          title: true,
          description: true,
          videoDuration: true,
          orderIndex: true,
          isFree: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { orderIndex: 'asc' }
      },
      _count: {
        select: {
          lessons: true
        }
      }
    }
  });

  res.json({
    message: 'Module updated successfully',
    module
  });
}));

// Delete module
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check if module exists and user has permission
  const existingModule = await prisma.module.findUnique({
    where: { id },
    include: {
      course: {
        select: { id: true }
      }
    }
  });

  if (!existingModule) {
    throw new NotFoundError('Module not found');
  }



  await prisma.module.delete({
    where: { id }
  });

  res.json({
    message: 'Module deleted successfully'
  });
}));

// Reorder modules
router.put('/course/:courseId/reorder', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { courseId } = req.params;
  const { modules } = reorderModulesSchema.parse(req.body);

  // Check if user has permission to modify this course
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true }
  });

  if (!course) {
    throw new NotFoundError('Course not found');
  }



  // Update all modules in a transaction
  await prisma.$transaction(
    modules.map(module =>
      prisma.module.update({
        where: { id: module.id },
        data: { orderIndex: module.orderIndex }
      })
    )
  );

  res.json({
    message: 'Modules reordered successfully'
  });
}));

// Publish/unpublish module
router.put('/:id/publish', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body;

  // Check if module exists and user has permission
  const existingModule = await prisma.module.findUnique({
    where: { id },
    include: {
      course: {
        select: { id: true }
      }
    }
  });

  if (!existingModule) {
    throw new NotFoundError('Module not found');
  }



  const module = await prisma.module.update({
    where: { id },
    data: { isPublished: Boolean(isPublished) }
  });

  res.json({
    message: `Module ${isPublished ? 'published' : 'unpublished'} successfully`,
    module
  });
}));

export default router;