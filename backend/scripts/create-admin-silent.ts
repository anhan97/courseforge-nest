#!/usr/bin/env npx ts-node

import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePasswordStrength } from '../src/utils/password';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

// Admin user configuration from environment variables
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@courseforge.com',
  firstName: process.env.ADMIN_FIRST_NAME || 'System',
  lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
};

async function createAdminUserSilent() {
  try {
    console.log('🚀 Creating admin user...');
    console.log(`📧 Email: ${ADMIN_CONFIG.email}`);
    console.log(`👤 Name: ${ADMIN_CONFIG.firstName} ${ADMIN_CONFIG.lastName}`);
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(ADMIN_CONFIG.password);
    
    if (!passwordValidation.isValid) {
      console.error('❌ Admin password is not strong enough:');
      passwordValidation.errors.forEach(error => console.error(`   • ${error}`));
      console.error(`   Password strength score: ${passwordValidation.score}/5`);
      process.exit(1);
    }
    
    console.log(`✅ Password validation passed (score: ${passwordValidation.score}/5)`);
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    
    if (existingAdmin) {
      console.log('⚠️  An admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   ID: ${existingAdmin.id}`);
      
      // Check if we should force create another admin
      if (process.env.FORCE_CREATE_ADMIN !== 'true') {
        console.log('ℹ️  Skipping admin creation. Set FORCE_CREATE_ADMIN=true to create another admin user.');
        return existingAdmin;
      }
      
      console.log('🔄 FORCE_CREATE_ADMIN=true, creating additional admin user...');
    }
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_CONFIG.email },
    });
    
    if (existingUser) {
      if (process.env.CONVERT_TO_ADMIN === 'true') {
        console.log(`🔄 Converting existing user to admin: ${ADMIN_CONFIG.email}`);
        
        const updatedUser = await prisma.user.update({
          where: { email: ADMIN_CONFIG.email },
          data: { 
            role: 'ADMIN',
            isActive: true,
            isVerified: true,
          },
        });
        
        console.log('✅ User successfully converted to admin:');
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
        console.log(`   Role: ${updatedUser.role}`);
        console.log(`   ID: ${updatedUser.id}`);
        
        return updatedUser;
      } else {
        console.error(`❌ User with email "${ADMIN_CONFIG.email}" already exists.`);
        console.error('   Set CONVERT_TO_ADMIN=true to convert existing user to admin.');
        process.exit(1);
      }
    }
    
    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(ADMIN_CONFIG.password);
    
    // Create the admin user
    console.log('👤 Creating admin user...');
    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_CONFIG.email,
        password: hashedPassword,
        firstName: ADMIN_CONFIG.firstName,
        lastName: ADMIN_CONFIG.lastName,
        role: 'ADMIN',
        isActive: true,
        isVerified: true, // Auto-verify admin users
      },
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('\n👤 Admin User Details:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Active: ${adminUser.isActive ? 'Yes' : 'No'}`);
    console.log(`   Verified: ${adminUser.isVerified ? 'Yes' : 'No'}`);
    console.log(`   Created: ${adminUser.createdAt}`);
    
    if (ADMIN_CONFIG.password === 'Admin123!') {
      console.log('\n⚠️  WARNING: Using default password. Please change it after first login!');
      console.log('🔑 Default credentials:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Password: ${ADMIN_CONFIG.password}`);
    }
    
    return adminUser;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Print usage information
function printUsage() {
  console.log('🔧 CourseForge Admin User Creation (Silent Mode)');
  console.log('\n📋 Environment Variables:');
  console.log('   ADMIN_EMAIL          - Admin email (default: admin@courseforge.com)');
  console.log('   ADMIN_PASSWORD       - Admin password (default: Admin123!)');
  console.log('   ADMIN_FIRST_NAME     - Admin first name (default: System)');
  console.log('   ADMIN_LAST_NAME      - Admin last name (default: Administrator)');
  console.log('   FORCE_CREATE_ADMIN   - Create admin even if one exists (default: false)');
  console.log('   CONVERT_TO_ADMIN     - Convert existing user to admin (default: false)');
  console.log('\n📝 Examples:');
  console.log('   npm run admin:create-silent');
  console.log('   ADMIN_EMAIL=admin@mycompany.com npm run admin:create-silent');
  console.log('   FORCE_CREATE_ADMIN=true npm run admin:create-silent');
  console.log('   CONVERT_TO_ADMIN=true ADMIN_EMAIL=user@company.com npm run admin:create-silent');
  console.log('');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

// Run the script
if (require.main === module) {
  createAdminUserSilent()
    .then((user) => {
      console.log('\n🎉 Admin user setup completed!');
      if (user) {
        console.log(`📧 Login at: ${user.email}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { createAdminUserSilent, ADMIN_CONFIG };