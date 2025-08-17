import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generate access token
export const generateAccessToken = (payload: TokenPayload): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRE_TIME || '24h'; // 24 hours for access token

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const options: SignOptions = {
    // @ts-ignore - JWT accepts string values like "1h", "7d" despite type definition
    expiresIn: expiresIn,
    issuer: 'courseforge-api',
    audience: 'courseforge-app',
  };

  return jwt.sign(payload, jwtSecret, options);
};

// Generate refresh token
export const generateRefreshToken = (payload: TokenPayload): string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRE_TIME || '30d'; // 30 days for refresh token

  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  const options: SignOptions = {
    // @ts-ignore - JWT accepts string values like "1h", "7d" despite type definition
    expiresIn: expiresIn,
    issuer: 'courseforge-api',
    audience: 'courseforge-app',
  };

  return jwt.sign(payload, refreshSecret, options);
};

// Generate both access and refresh tokens
export const generateTokenPair = (payload: TokenPayload): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Calculate expiration time in seconds
  const expiresIn = getTokenExpirationTime(process.env.JWT_EXPIRE_TIME || '24h');

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

// Verify access token
export const verifyAccessToken = (token: string): TokenPayload => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'courseforge-api',
      audience: 'courseforge-app',
    }) as jwt.JwtPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): TokenPayload => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, refreshSecret, {
      issuer: 'courseforge-api',
      audience: 'courseforge-app',
    }) as jwt.JwtPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw error;
    }
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): jwt.JwtPayload | null => {
  try {
    return jwt.decode(token) as jwt.JwtPayload;
  } catch {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

// Get token expiration time in seconds
export const getTokenExpirationTime = (expireTime: string): number => {
  const timeUnits: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };

  const match = expireTime.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error('Invalid expire time format');
  }

  const [, value, unit] = match;
  const multiplier = timeUnits[unit!];
  
  if (!multiplier) {
    throw new Error('Invalid time unit');
  }

  if (!value) {
    throw new Error('Invalid time value');
  }

  return parseInt(value, 10) * multiplier;
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7).trim();
};

// Generate a secure random token for password reset, email verification, etc.
export const generateSecureToken = (): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Create token for specific purposes (email verification, password reset)
export const createPurposeToken = (
  payload: { userId: string; purpose: string },
  expiresIn: string = '24h'
): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const options: SignOptions = {
    // @ts-ignore - JWT accepts string values like "1h", "7d" despite type definition
    expiresIn: expiresIn,
    issuer: 'courseforge-api',
    audience: 'courseforge-purpose',
  };

  return jwt.sign(payload, jwtSecret, options);
};

// Verify purpose token
export const verifyPurposeToken = (
  token: string,
  expectedPurpose: string
): { userId: string; purpose: string } => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'courseforge-api',
      audience: 'courseforge-purpose',
    }) as jwt.JwtPayload;

    if (decoded.purpose !== expectedPurpose) {
      throw new Error('Invalid token purpose');
    }

    return {
      userId: decoded.userId,
      purpose: decoded.purpose,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

// Token blacklist (in production, this would be stored in Redis)
const tokenBlacklist = new Set<string>();

// Add token to blacklist
export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
};

// Check if token is blacklisted
export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

// Clean expired tokens from blacklist (should be run periodically)
export const cleanExpiredTokens = (): void => {
  for (const token of tokenBlacklist) {
    if (isTokenExpired(token)) {
      tokenBlacklist.delete(token);
    }
  }
};