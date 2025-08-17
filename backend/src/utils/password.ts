import bcrypt from 'bcryptjs';

// Get salt rounds from environment or use default
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise that resolves to hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    // Validate password
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    return hashedPassword;
  } catch (error) {
    throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Verify a password against its hash
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise that resolves to boolean indicating if password is correct
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    // Validate inputs
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    // Compare password with hash
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    throw new Error(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a password needs to be rehashed (when salt rounds change)
 * @param hashedPassword - Current hashed password
 * @returns Promise that resolves to boolean indicating if rehashing is needed
 */
export const needsRehash = async (hashedPassword: string): Promise<boolean> => {
  try {
    // Check if the hash was created with different salt rounds
    const saltRounds = await bcrypt.getRounds(hashedPassword);
    return saltRounds !== SALT_ROUNDS;
  } catch (error) {
    // If we can't get rounds, assume it needs rehashing
    return true;
  }
};

/**
 * Validate password strength (simplified requirements)
 * @param password - Password to validate
 * @returns Object with validation result and messages
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
  score: number; // 0-4 (weak to strong)
} => {
  const errors: string[] = [];
  let score = 0;

  // Basic length check (minimum 6 characters)
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  } else {
    score += 1;
  }

  // Check for uppercase letters (required)
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for special characters (required)
  if (!/[!@#$%^&*(),.?":{}|<>\-_=+[\]\\\/~`]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Bonus points for additional security features
  if (password.length >= 8) {
    score += 0.5; // Longer passwords get bonus points
  }

  if (/[a-z]/.test(password)) {
    score += 0.5; // Lowercase letters bonus
  }

  if (/\d/.test(password)) {
    score += 0.5; // Numbers bonus
  }

  // Cap score at 4
  score = Math.min(4, Math.floor(score));

  return {
    isValid: errors.length === 0, // Only require uppercase and special characters
    errors,
    score,
  };
};

/**
 * Generate a secure random password
 * @param length - Length of password to generate (default: 16)
 * @param includeSymbols - Whether to include special characters (default: true)
 * @returns Generated password
 */
export const generateSecurePassword = (length: number = 16, includeSymbols: boolean = true): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = lowercase + uppercase + numbers;
  if (includeSymbols) {
    charset += symbols;
  }

  let password = '';
  
  // Ensure at least one character from each required set
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  if (includeSymbols) {
    password += symbols[Math.floor(Math.random() * symbols.length)];
  }

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Generate a temporary password for password reset
 * @returns Temporary password
 */
export const generateTemporaryPassword = (): string => {
  return generateSecurePassword(12, false); // Exclude symbols for better user experience
};

/**
 * Check if password has been compromised in known data breaches
 * Note: In production, you might want to integrate with services like HaveIBeenPwned
 * @param password - Password to check
 * @returns Promise that resolves to boolean indicating if password is compromised
 */
export const isPasswordCompromised = async (password: string): Promise<boolean> => {
  // This is a placeholder. In production, you would:
  // 1. Hash the password with SHA-1
  // 2. Take the first 5 characters of the hash
  // 3. Send to HaveIBeenPwned API
  // 4. Check if the full hash appears in the response
  
  // For now, we'll just check against a small list of common passwords
  const commonPasswords = [
    'password',
    '123456',
    'password123',
    'admin',
    'qwerty',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
    'abc123',
  ];

  return commonPasswords.includes(password.toLowerCase());
};

/**
 * Get password strength description
 * @param score - Password strength score (0-4)
 * @returns Human-readable strength description
 */
export const getPasswordStrengthDescription = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
};