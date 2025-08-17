import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
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
  }
}

export {};