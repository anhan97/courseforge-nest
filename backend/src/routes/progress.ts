import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get user's overall progress
router.get('/my', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Get my progress - coming soon' });
}));

// Get progress for specific course
router.get('/course/:courseId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Get course progress - coming soon' });
}));

// Mark lesson as completed
router.post('/lesson/:lessonId/complete', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Mark lesson complete - coming soon' });
}));

// Update lesson progress (video watch time, position)
router.put('/lesson/:lessonId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Update lesson progress - coming soon' });
}));

// Continue learning endpoint
router.get('/continue', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Continue learning - coming soon' });
}));

export default router;