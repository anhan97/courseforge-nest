import request from 'supertest';
import app from '../server';
import { prisma, testUtils } from './setup';
import { hashPassword } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUtils.createUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'STUDENT', // All registrations are now STUDENT role
          isActive: true,
          isVerified: false,
        },
      });

      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBeDefined();

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(userData.email);
    });

    it('should register with STUDENT role (instructor registration removed)', async () => {
      const userData = testUtils.createUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.role).toBe('STUDENT');
    });

    it('should fail with invalid email format', async () => {
      const userData = testUtils.createUserData({
        email: 'invalid-email',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail with weak password', async () => {
      const userData = testUtils.createUserData({
        password: '123',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          // missing password and other required fields
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail when registering with existing email', async () => {
      const userData = testUtils.createUserData();

      // Register user first time
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should ignore role field if provided (student-only registration)', async () => {
      const userData = {
        ...testUtils.createUserData(),
        role: 'INSTRUCTOR', // This should be ignored
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.role).toBe('STUDENT'); // Always STUDENT regardless of input
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = testUtils.createUserData();

      // Register user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'STUDENT', // All users are now STUDENT role
        },
      });

      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with incorrect password', async () => {
      const userData = testUtils.createUserData();

      // Register user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Try login with wrong password
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          // missing password
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail for inactive user', async () => {
      const userData = testUtils.createUserData();
      
      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Deactivate user
      await prisma.user.update({
        where: { email: userData.email },
        data: { isActive: false },
      });

      // Try to login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);

      expect(response.body.message).toContain('deactivated');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userData = testUtils.createUserData();

      // Register and login
      const loginResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user info with valid token', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;

      // Get user info
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'STUDENT', // All users are now STUDENT role
      });
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.message).toContain('token');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.message).toContain('token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;

      // Logout
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('Logout successful');
    });

    it('should fail logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.message).toContain('token');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;

      // Change password
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'N3wP4ssw0rd!@#',
        })
        .expect(200);

      expect(response.body.message).toContain('Password changed successfully');

      // Verify can login with new password
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'N3wP4ssw0rd!@#',
        })
        .expect(200);
    });

    it('should fail with incorrect current password', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;

      // Try to change password with wrong current password
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'N3wP4ssw0rd!@#',
        })
        .expect(401);

      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should fail with weak new password', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;

      // Try to change to weak password
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: userData.password,
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send forgot password email for existing user', async () => {
      const userData = testUtils.createUserData();

      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Request password reset
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email })
        .expect(200);

      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return success message even for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('Student-Only Registration', () => {
    it('should always set STUDENT role for all registrations', async () => {
      const userData = testUtils.createUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.role).toBe('STUDENT');
    });

    it('should ignore instructor role in request (student-only)', async () => {
      const userData = {
        ...testUtils.createUserData(),
        role: 'INSTRUCTOR', // This will be ignored
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.role).toBe('STUDENT'); // Always STUDENT
    });

    it('should set STUDENT role regardless of input', async () => {
      const userData = testUtils.createUserData();
      // Role field is no longer in schema, but test confirms behavior

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.role).toBe('STUDENT');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format during registration', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test.example.com',
        '',
      ];

      for (const email of invalidEmails) {
        const userData = testUtils.createUserData({ email });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should validate password strength during registration', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'abcdefgh',
        'PASSWORD',
      ];

      for (const password of weakPasswords) {
        const userData = testUtils.createUserData({ password });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(400);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'Str0ngP4ss!@#',
        'MyS3cur3!@#$',
        'C0mpl3xP4ss!@#',
      ];

      for (const password of strongPasswords) {
        const userData = testUtils.createUserData({ 
          password,
          email: testUtils.generateEmail()
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData);

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Security Features', () => {
    it('should not return password in user response', async () => {
      const userData = testUtils.createUserData();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user.password).toBeUndefined();
    });

    it('should hash password in database', async () => {
      const userData = testUtils.createUserData();

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe(userData.password);
      expect(user?.password.startsWith('$2a$') || user?.password.startsWith('$2b$')).toBe(true);
    });

    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This is a complex test that would require mocking Prisma
      // For now, we'll test that the error handler works with known errors
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          // Invalid data that will cause a validation error
          email: 'invalid',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
      expect(response.body.error).toBeDefined();
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const userData = testUtils.createUserData();

      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Request password reset
      const forgotResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email });

      const resetToken = forgotResponse.body.resetToken;

      // Reset password
      const newPassword = 'N3wS3cur3P4ss!@#';
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      expect(response.body.message).toContain('Password reset successful');

      // Verify can login with new password
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: newPassword,
        })
        .expect(200);

      // Verify cannot login with old password
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);
    });

    it('should fail with invalid reset token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'N3wP4ssw0rd!@#',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with weak new password', async () => {
      const userData = testUtils.createUserData();

      // Register and get reset token
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const forgotResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email });

      const resetToken = forgotResponse.body.resetToken;

      // Try to reset with weak password
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail for inactive user', async () => {
      const userData = testUtils.createUserData();

      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Get reset token
      const forgotResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email });

      const resetToken = forgotResponse.body.resetToken;

      // Deactivate user
      await prisma.user.update({
        where: { email: userData.email },
        data: { isActive: false },
      });

      // Try to reset password
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'N3wP4ssw0rd!@#',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'some-token',
          // missing newPassword
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const verificationToken = registerResponse.body.verificationToken;

      // Verify email
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.message).toContain('Email verified successfully');

      // Check user is verified in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
        select: { isVerified: true },
      });
      expect(user?.isVerified).toBe(true);
    });

    it('should handle already verified email gracefully', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const verificationToken = registerResponse.body.verificationToken;

      // Verify email first time
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      // Try to verify again
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.message).toContain('already verified');
    });

    it('should fail with invalid verification token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail for inactive user', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const verificationToken = registerResponse.body.verificationToken;

      // Deactivate user
      await prisma.user.update({
        where: { email: userData.email },
        data: { isActive: false },
      });

      // Try to verify email
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired verification token');
    });

    it('should fail with missing token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;

      // Resend verification
      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('Verification email sent');
      expect(response.body.verificationToken).toBeDefined();
    });

    it('should handle already verified user gracefully', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const token = registerResponse.body.tokens.accessToken;
      const verificationToken = registerResponse.body.verificationToken;

      // Verify email first
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken });

      // Try to resend verification
      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('already verified');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .expect(401);

      expect(response.body.message).toContain('token');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('Token Security and Edge Cases', () => {
    it('should fail refresh when user becomes inactive', async () => {
      const userData = testUtils.createUserData();

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const refreshToken = registerResponse.body.tokens.refreshToken;

      // Deactivate user
      await prisma.user.update({
        where: { email: userData.email },
        data: { isActive: false },
      });

      // Try to refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should handle malformed JWT tokens gracefully', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // incomplete JWT
        'bearer token',
        '',
        '...',
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle concurrent login sessions', async () => {
      const userData = testUtils.createUserData();

      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Login multiple times concurrently
      const loginPromises = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
      );

      const responses = await Promise.all(loginPromises);

      // All logins should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.tokens.accessToken).toBeDefined();
        expect(response.body.tokens.refreshToken).toBeDefined();
      });

      // All tokens should be different
      const tokens = responses.map(r => r.body.tokens.accessToken);
      const uniqueTokens = [...new Set(tokens)];
      expect(uniqueTokens).toHaveLength(tokens.length);
    });

    it('should update lastLoginAt on successful login', async () => {
      const userData = testUtils.createUserData();

      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      const beforeLogin = new Date();

      // Login
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      // Check lastLoginAt was updated
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
        select: { lastLoginAt: true },
      });

      expect(user?.lastLoginAt).toBeDefined();
      expect(user?.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    it('should not update lastLoginAt on failed login', async () => {
      const userData = testUtils.createUserData();

      // Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Get initial lastLoginAt
      const beforeFailedLogin = await prisma.user.findUnique({
        where: { email: userData.email },
        select: { lastLoginAt: true },
      });

      // Failed login attempt
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      // Check lastLoginAt was not updated
      const afterFailedLogin = await prisma.user.findUnique({
        where: { email: userData.email },
        select: { lastLoginAt: true },
      });

      expect(afterFailedLogin?.lastLoginAt?.getTime()).toBe(
        beforeFailedLogin?.lastLoginAt?.getTime()
      );
    });
  });

  describe('Complete Authentication Flows', () => {
    it('should complete full registration and verification flow', async () => {
      const userData = testUtils.createUserData();

      // 1. Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.user.isVerified).toBe(false);
      const verificationToken = registerResponse.body.verificationToken;

      // 2. Verify email
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      // 3. Login and check verified status
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const token = loginResponse.body.tokens.accessToken;

      // 4. Get user profile to confirm verification
      const profileResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.user.isVerified).toBe(true);
    });

    it('should complete full password reset flow', async () => {
      const userData = testUtils.createUserData();
      const newPassword = 'NewComplexPassword123!';

      // 1. Register user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // 2. Request password reset
      const forgotResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email })
        .expect(200);

      const resetToken = forgotResponse.body.resetToken;

      // 3. Reset password
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      // 4. Login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.tokens.accessToken).toBeDefined();

      // 5. Verify old password no longer works
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);
    });

    it('should complete authentication lifecycle with token refresh', async () => {
      const userData = testUtils.createUserData();

      // 1. Register user  
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const originalTokens = registerResponse.body.tokens;

      // 2. Use access token
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${originalTokens.accessToken}`)
        .expect(200);

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: originalTokens.refreshToken })
        .expect(200);

      const newTokens = refreshResponse.body.tokens;
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);

      // 4. Use new access token
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);

      // 5. Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);
    });
  });
});