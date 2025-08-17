import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Users route - coming soon' });
}));

// Get user by ID
router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Get user by ID - coming soon' });
}));

// Update user profile
router.put('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Update user - coming soon' });
}));

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: 'Delete user - coming soon' });
}));

export default router;