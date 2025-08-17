import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { asyncHandler, ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken, createPurposeToken, verifyPurposeToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuth } from '../middleware/requestLogger';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Register new user
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = registerSchema.parse(req.body);
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(validatedData.password);
  if (!passwordValidation.isValid) {
    throw new ValidationError('Password is not strong enough', {
      errors: passwordValidation.errors,
      score: passwordValidation.score,
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validatedData.email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(validatedData.password);

  // Create user (registration is student-only)
  const user = await prisma.user.create({
    data: {
      email: validatedData.email,
      password: hashedPassword,
      firstName: validatedData.firstName || null,
      lastName: validatedData.lastName || null,
      role: 'STUDENT', // All registrations default to STUDENT role
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Generate email verification token
  const verificationToken = createPurposeToken(
    { userId: user.id, purpose: 'email-verification' },
    '24h'
  );

  // Generate auth tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  logAuth('User registered', user.id, { email: user.email, role: user.role });

  res.status(201).json({
    message: 'User registered successfully',
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    verificationToken, // In production, this should be sent via email
  });
}));

// Login user
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isVerified: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  logAuth('User logged in', user.id, { email: user.email });

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  });
}));

// Refresh access token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logAuth('Token refreshed', user.id);

    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
}));

// Logout user (blacklist token)
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // In a production app, you would add the token to a blacklist
  // For now, we'll just log the logout
  logAuth('User logged out', req.user?.id);

  res.json({
    message: 'Logout successful',
  });
}));

// Forgot password
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.isActive) {
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
    return;
  }

  // Generate password reset token
  const resetToken = createPurposeToken(
    { userId: user.id, purpose: 'password-reset' },
    '1h'
  );

  logAuth('Password reset requested', user.id, { email: user.email });

  // In production, send this token via email
  res.json({
    message: 'If an account with that email exists, a password reset link has been sent.',
    resetToken, // Remove this in production
  });
}));

// Reset password
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new ValidationError('Password is not strong enough', {
      errors: passwordValidation.errors,
      score: passwordValidation.score,
    });
  }

  try {
    // Verify reset token
    const { userId } = verifyPurposeToken(token, 'password-reset');

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logAuth('Password reset completed', userId);

    res.json({
      message: 'Password reset successful',
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }
}));

// Change password (for authenticated users)
router.post('/change-password', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const userId = req.user!.id;

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new ValidationError('Password is not strong enough', {
      errors: passwordValidation.errors,
      score: passwordValidation.score,
    });
  }

  // Get current password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logAuth('Password changed', userId);

  res.json({
    message: 'Password changed successfully',
  });
}));

// Verify email
router.post('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const { token } = verifyEmailSchema.parse(req.body);

  try {
    // Verify email verification token
    const { userId } = verifyPurposeToken(token, 'email-verification');

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVerified: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid verification token');
    }

    if (user.isVerified) {
      res.json({
        message: 'Email is already verified',
      });
      return;
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    logAuth('Email verified', userId);

    res.json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired verification token');
  }
}));

// Resend email verification
router.post('/resend-verification', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Check if user is already verified
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVerified: true, email: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isVerified) {
    res.json({
      message: 'Email is already verified',
    });
    return;
  }

  // Generate new verification token
  const verificationToken = createPurposeToken(
    { userId, purpose: 'email-verification' },
    '24h'
  );

  logAuth('Email verification resent', userId, { email: user.email });

  res.json({
    message: 'Verification email sent',
    verificationToken, // Remove this in production
  });
}));

// Get current user profile
router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      bio: true,
      role: true,
      isActive: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    user,
  });
}));

export default router;