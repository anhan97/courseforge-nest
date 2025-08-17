#!/usr/bin/env npx ts-node

import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePasswordStrength } from '../src/utils/password';
import { config } from 'dotenv';
import * as readline from 'readline';

// Load environment variables
config();

const prisma = new PrismaClient();

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Utility function to ask questions
const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Utility function to ask for password (hidden input)
const askPassword = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char: string) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    };
    
    stdin.on('data', onData);
  });
};

// Default admin user data
const DEFAULT_ADMIN = {
  email: 'admin@courseforge.com',
  firstName: 'System',
  lastName: 'Administrator',
  password: 'Admin123!', // Simple but secure: uppercase + special character
};

async function createAdminUser() {
  try {
    console.log('🚀 CourseForge Admin User Creation Tool\n');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    
    if (existingAdmin) {
      console.log('⚠️  An admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      console.log(`   Active: ${existingAdmin.isActive ? 'Yes' : 'No'}`);
      console.log(`   Verified: ${existingAdmin.isVerified ? 'Yes' : 'No'}\n`);
      
      const proceed = await askQuestion('Do you want to create another admin user? (y/N): ');
      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        console.log('✅ Admin user creation cancelled.');
        return;
      }
      console.log('');
    }
    
    // Get admin details
    console.log('📝 Enter admin user details (press Enter for defaults):\n');
    
    const email = await askQuestion(`Email (${DEFAULT_ADMIN.email}): `) || DEFAULT_ADMIN.email;
    const firstName = await askQuestion(`First Name (${DEFAULT_ADMIN.firstName}): `) || DEFAULT_ADMIN.firstName;
    const lastName = await askQuestion(`Last Name (${DEFAULT_ADMIN.lastName}): `) || DEFAULT_ADMIN.lastName;
    
    console.log('\n🔐 Password Requirements:');
    console.log('   • At least 6 characters long');
    console.log('   • Contains at least one uppercase letter');
    console.log('   • Contains at least one special character (!@#$%^&*(),.?":{}|<>)\n');
    
    let password = '';
    let isValidPassword = false;
    
    while (!isValidPassword) {
      const useDefault = await askQuestion(`Use default password? (Y/n): `);
      
      if (useDefault.toLowerCase() === 'n' || useDefault.toLowerCase() === 'no') {
        password = await askPassword('Enter admin password: ');
        
        if (!password) {
          console.log('❌ Password cannot be empty. Please try again.\n');
          continue;
        }
      } else {
        password = DEFAULT_ADMIN.password;
        console.log('Using default password: Admin123!\n');
      }
      
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      
      if (!passwordValidation.isValid) {
        console.log('❌ Password is not strong enough:');
        passwordValidation.errors.forEach(error => console.log(`   • ${error}`));
        console.log(`   Password strength score: ${passwordValidation.score}/5\n`);
        continue;
      }
      
      isValidPassword = true;
      console.log(`✅ Password is strong (score: ${passwordValidation.score}/5)\n`);
    }
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      console.log(`❌ A user with email "${email}" already exists.`);
      const updateRole = await askQuestion('Convert existing user to admin? (y/N): ');
      
      if (updateRole.toLowerCase() === 'y' || updateRole.toLowerCase() === 'yes') {
        const updatedUser = await prisma.user.update({
          where: { email },
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
        console.log(`   ID: ${updatedUser.id}\n`);
        return;
      } else {
        console.log('❌ Admin user creation cancelled.');
        return;
      }
    }
    
    // Hash the password
    console.log('🔄 Hashing password...');
    const hashedPassword = await hashPassword(password);
    
    // Create the admin user
    console.log('🔄 Creating admin user...');
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
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
    
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${adminUser.email}`);
    if (password === DEFAULT_ADMIN.password) {
      console.log(`   Password: ${password}`);
      console.log('\n⚠️  IMPORTANT: Please change the default password after first login!');
    } else {
      console.log('   Password: [The password you entered]');
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n🎉 Admin user creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { createAdminUser };