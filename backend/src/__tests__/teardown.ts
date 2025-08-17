import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalTeardown() {
  console.log('🧹 Global test teardown...');
  
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Teardown error:', error);
  }
}