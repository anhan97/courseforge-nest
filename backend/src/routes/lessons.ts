import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, requireAdmin, requireCourseAccess, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createLessonSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  videoUrl: z.string().url().optional(),
  videoDuration: z.number().int().min(0).optional(),
  videoProvider: z.enum(['youtube', 'vimeo', 'cloudinary', 'upload']).optional(),
  content: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
  isFree: z.boolean().default(false),
});

const updateLessonSchema = createLessonSchema.partial().omit({ moduleId: true });

const reorderLessonsSchema = z.object({
  lessons: z.array(z.object({
    id: z.string().uuid(),
    orderIndex: z.number().int().min(0)
  }))
});

const addAttachmentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().int().min(0, 'File size must be non-negative'),
});

const updateProgressSchema = z.object({
  watchTime: z.number().min(0).optional(),
  lastPosition: z.number().min(0).optional(),
  isCompleted: z.boolean().optional(),
});

// Get all lessons for a module
router.get('/module/:moduleId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { moduleId } = req.params;

  // Check if user has access to this module
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: { instructorId: true, isPublished: true }
      }
    }
  });

  if (!module) {
    throw new NotFoundError('Module not found');
  }

  // Only course instructor, admin, or enrolled students can access
  const hasAccess = req.user!.role === 'ADMIN' || 
                   module.course.instructorId === req.user!.id ||
                   (req.user!.role === 'STUDENT' && module.course.isPublished);

  if (!hasAccess) {
    throw new ValidationError('Access denied');
  }

  const lessons = await prisma.lesson.findMany({
    where: { moduleId },
    include: {
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
          createdAt: true
        }
      }
    },
    orderBy: { orderIndex: 'asc' }
  });

  res.json({ lessons });
}));

// Get single lesson with full details
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true, isPublished: true }
          }
        }
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
          createdAt: true
        }
      }
    }
  });

  if (!lesson) {
    throw new NotFoundError('Lesson not found');
  }

  // Check access permissions
  const hasAccess = req.user!.role === 'ADMIN' || 
                   lesson.module.course.instructorId === req.user!.id ||
                   (req.user!.role === 'STUDENT' && lesson.module.course.isPublished && lesson.isPublished);

  if (!hasAccess) {
    throw new ValidationError('Access denied');
  }

  res.json({ lesson });
}));

// Create new lesson
router.post('/', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validatedData = createLessonSchema.parse(req.body);

  // Check if user has permission to modify this module
  const module = await prisma.module.findUnique({
    where: { id: validatedData.moduleId },
    include: {
      course: {
        select: { instructorId: true }
      }
    }
  });

  if (!module) {
    throw new NotFoundError('Module not found');
  }



  // If no order index provided, make it the last lesson
  let orderIndex = validatedData.orderIndex;
  if (orderIndex === undefined) {
    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId: validatedData.moduleId },
      orderBy: { orderIndex: 'desc' }
    });
    orderIndex = lastLesson ? lastLesson.orderIndex + 1 : 0;
  }

  const lesson = await prisma.lesson.create({
    data: {
      ...validatedData,
      orderIndex
    },
    include: {
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
          createdAt: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'Lesson created successfully',
    lesson
  });
}));

// Update lesson
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const validatedData = updateLessonSchema.parse(req.body);

  // Check if lesson exists and user has permission
  const existingLesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true }
          }
        }
      }
    }
  });

  if (!existingLesson) {
    throw new NotFoundError('Lesson not found');
  }



  const lesson = await prisma.lesson.update({
    where: { id },
    data: validatedData,
    include: {
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
          createdAt: true
        }
      }
    }
  });

  res.json({
    message: 'Lesson updated successfully',
    lesson
  });
}));

// Delete lesson
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Check if lesson exists and user has permission
  const existingLesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true }
          }
        }
      }
    }
  });

  if (!existingLesson) {
    throw new NotFoundError('Lesson not found');
  }



  await prisma.lesson.delete({
    where: { id }
  });

  res.json({
    message: 'Lesson deleted successfully'
  });
}));

// Reorder lessons within a module
router.put('/module/:moduleId/reorder', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { moduleId } = req.params;
  const { lessons } = reorderLessonsSchema.parse(req.body);

  // Check if user has permission to modify this module
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        select: { instructorId: true }
      }
    }
  });

  if (!module) {
    throw new NotFoundError('Module not found');
  }



  // Update all lessons in a transaction
  await prisma.$transaction(
    lessons.map(lesson =>
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { orderIndex: lesson.orderIndex }
      })
    )
  );

  res.json({
    message: 'Lessons reordered successfully'
  });
}));

// Publish/unpublish lesson
router.put('/:id/publish', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body;

  // Check if lesson exists and user has permission
  const existingLesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true }
          }
        }
      }
    }
  });

  if (!existingLesson) {
    throw new NotFoundError('Lesson not found');
  }



  const lesson = await prisma.lesson.update({
    where: { id },
    data: { isPublished: Boolean(isPublished) }
  });

  res.json({
    message: `Lesson ${isPublished ? 'published' : 'unpublished'} successfully`,
    lesson
  });
}));

// Add attachment to lesson
router.post('/:id/attachments', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const validatedData = addAttachmentSchema.parse(req.body);

  // Check if lesson exists and user has permission
  const existingLesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            select: { instructorId: true }
          }
        }
      }
    }
  });

  if (!existingLesson) {
    throw new NotFoundError('Lesson not found');
  }



  const attachment = await prisma.lessonAttachment.create({
    data: {
      lessonId: id,
      ...validatedData
    }
  });

  res.status(201).json({
    message: 'Attachment added successfully',
    attachment
  });
}));

// Delete attachment
router.delete('/attachments/:attachmentId', authenticate, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { attachmentId } = req.params;

  // Check if attachment exists and user has permission
  const existingAttachment = await prisma.lessonAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { instructorId: true }
              }
            }
          }
        }
      }
    }
  });

  if (!existingAttachment) {
    throw new NotFoundError('Attachment not found');
  }



  await prisma.lessonAttachment.delete({
    where: { id: attachmentId }
  });

  res.json({
    message: 'Attachment deleted successfully'
  });
}));

// Update lesson progress
router.put('/:id/progress', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const lessonId = req.params.id;
  const validatedData = updateProgressSchema.parse(req.body);
  
  // Check if lesson exists and user has access
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              enrollments: {
                where: {
                  userId: req.user!.id,
                  status: 'ACTIVE'
                }
              }
            }
          }
        }
      }
    }
  });

  if (!lesson) {
    throw new NotFoundError('Lesson not found');
  }

  // Check access permissions
  const hasAccess = req.user!.role === 'ADMIN' || 
                   lesson.module.course.instructorId === req.user!.id ||
                   lesson.module.course.enrollments.length > 0 ||
                   lesson.isFree;

  if (!hasAccess) {
    throw new NotFoundError('Access denied');
  }

  // Find or create lesson progress record
  let progress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: req.user!.id,
        lessonId: lessonId
      }
    }
  });

  const updateData: any = {
    lastAccessedAt: new Date(),
  };

  if (validatedData.watchTime !== undefined) {
    updateData.watchTime = validatedData.watchTime;
  }

  if (validatedData.lastPosition !== undefined) {
    updateData.lastPosition = validatedData.lastPosition;
  }

  if (validatedData.isCompleted !== undefined) {
    updateData.isCompleted = validatedData.isCompleted;
    if (validatedData.isCompleted) {
      updateData.completedAt = new Date();
    }
  }

  if (progress) {
    // Update existing progress
    progress = await prisma.lessonProgress.update({
      where: { id: progress.id },
      data: updateData
    });
  } else {
    // Create new progress record
    progress = await prisma.lessonProgress.create({
      data: {
        userId: req.user!.id,
        lessonId: lessonId,
        ...updateData
      }
    });
  }

  res.json({
    message: 'Progress updated successfully',
    progress
  });
}));

export default router;