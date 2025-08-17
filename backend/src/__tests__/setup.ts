import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Override environment for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRE_TIME = '1h';
process.env.JWT_REFRESH_EXPIRE_TIME = '7d';
process.env.BCRYPT_SALT_ROUNDS = '4'; // Lower for faster tests

// Initialize test database client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db'
    }
  }
});

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  try {
    // Connect to test database
    await prisma.$connect();
    
    // Clean up any existing test data
    await cleanupDatabase();
    
    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

// Cleanup before each test
beforeEach(async () => {
  await cleanupDatabase();
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    await cleanupDatabase();
    await prisma.$disconnect();
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Helper function to clean up database
async function cleanupDatabase() {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `.catch(() => {
    // If PostgreSQL query fails, try SQLite approach
    return [];
  });

  try {
    // PostgreSQL cleanup
    if (tablenames.length > 0) {
      for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        }
      }
    } else {
      // SQLite cleanup (for development/testing)
      await prisma.notification.deleteMany();
      await prisma.review.deleteMany();
      await prisma.courseCouple.deleteMany();
      await prisma.coupon.deleteMany();
      await prisma.order.deleteMany();
      await prisma.lessonProgress.deleteMany();
      await prisma.userProgress.deleteMany();
      await prisma.enrollment.deleteMany();
      await prisma.lessonAttachment.deleteMany();
      await prisma.lesson.deleteMany();
      await prisma.module.deleteMany();
      await prisma.course.deleteMany();
      await prisma.category.deleteMany();
      await prisma.user.deleteMany();
    }
  } catch (error) {
    console.warn('Database cleanup warning:', error);
    // Don't throw - tests can still run
  }
}

// Test utilities
export const testUtils = {
  // Create test user data with simple password
  createUserData: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!', // Simple: uppercase, special character, 8 chars
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }),

  // Create test admin data with simple password
  createAdminData: (overrides = {}) => ({
    email: `admin-${Date.now()}@example.com`,
    password: 'Admin123!', // Simple: uppercase, special character  
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN' as const,
    ...overrides,
  }),

  // Create test instructor data with simple password
  createInstructorData: (overrides = {}) => ({
    email: `instructor-${Date.now()}@example.com`,
    password: 'Teacher123!', // Simple: uppercase, special character
    firstName: 'Instructor',
    lastName: 'User',
    role: 'INSTRUCTOR' as const,
    ...overrides,
  }),

  // Generate unique email
  generateEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,

  // Wait for async operations
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Export for use in tests
export { cleanupDatabase };