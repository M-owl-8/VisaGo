/**
 * Generate JWT Token for Admin User
 * 
 * Generates a JWT token for a user by email with specified role
 * 
 * Usage:
 *   npm run generate-admin-token -- yeger9889@gmail.com super_admin
 *   npm run generate-admin-token -- user@example.com admin
 */

import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/middleware/auth';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run generate-admin-token -- <email> [role]');
    console.error('Example: npm run generate-admin-token -- yeger9889@gmail.com super_admin');
    process.exit(1);
  }

  const email = args[0].toLowerCase().trim();
  const role = args[1] || 'super_admin';

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.error('   Please create the user first or check the email address.');
      process.exit(1);
    }

    // Update user role if different
    if (user.role !== role) {
      console.log(`⚠️  User role is currently "${user.role}", updating to "${role}"...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
      console.log(`✅ User role updated to "${role}"`);
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, role);

    console.log('\n✅ JWT Token Generated Successfully!\n');
    console.log('='.repeat(80));
    console.log('User Information:');
    console.log(`  Email: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Role: ${role}`);
    console.log(`  First Name: ${user.firstName || 'N/A'}`);
    console.log(`  Last Name: ${user.lastName || 'N/A'}`);
    console.log('='.repeat(80));
    console.log('\nJWT Token:');
    console.log(token);
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Usage:');
    console.log('  Add this token to your Authorization header:');
    console.log(`  Authorization: Bearer ${token.substring(0, 50)}...`);
    console.log('\n⚠️  Keep this token secure! Do not share it publicly.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

 * 
 * Generates a JWT token for a user by email with specified role
 * 
 * Usage:
 *   npm run generate-admin-token -- yeger9889@gmail.com super_admin
 *   npm run generate-admin-token -- user@example.com admin
 */

import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/middleware/auth';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run generate-admin-token -- <email> [role]');
    console.error('Example: npm run generate-admin-token -- yeger9889@gmail.com super_admin');
    process.exit(1);
  }

  const email = args[0].toLowerCase().trim();
  const role = args[1] || 'super_admin';

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.error('   Please create the user first or check the email address.');
      process.exit(1);
    }

    // Update user role if different
    if (user.role !== role) {
      console.log(`⚠️  User role is currently "${user.role}", updating to "${role}"...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
      console.log(`✅ User role updated to "${role}"`);
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, role);

    console.log('\n✅ JWT Token Generated Successfully!\n');
    console.log('='.repeat(80));
    console.log('User Information:');
    console.log(`  Email: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Role: ${role}`);
    console.log(`  First Name: ${user.firstName || 'N/A'}`);
    console.log(`  Last Name: ${user.lastName || 'N/A'}`);
    console.log('='.repeat(80));
    console.log('\nJWT Token:');
    console.log(token);
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Usage:');
    console.log('  Add this token to your Authorization header:');
    console.log(`  Authorization: Bearer ${token.substring(0, 50)}...`);
    console.log('\n⚠️  Keep this token secure! Do not share it publicly.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

 * 
 * Generates a JWT token for a user by email with specified role
 * 
 * Usage:
 *   npm run generate-admin-token -- yeger9889@gmail.com super_admin
 *   npm run generate-admin-token -- user@example.com admin
 */

import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/middleware/auth';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run generate-admin-token -- <email> [role]');
    console.error('Example: npm run generate-admin-token -- yeger9889@gmail.com super_admin');
    process.exit(1);
  }

  const email = args[0].toLowerCase().trim();
  const role = args[1] || 'super_admin';

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.error('   Please create the user first or check the email address.');
      process.exit(1);
    }

    // Update user role if different
    if (user.role !== role) {
      console.log(`⚠️  User role is currently "${user.role}", updating to "${role}"...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
      console.log(`✅ User role updated to "${role}"`);
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, role);

    console.log('\n✅ JWT Token Generated Successfully!\n');
    console.log('='.repeat(80));
    console.log('User Information:');
    console.log(`  Email: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Role: ${role}`);
    console.log(`  First Name: ${user.firstName || 'N/A'}`);
    console.log(`  Last Name: ${user.lastName || 'N/A'}`);
    console.log('='.repeat(80));
    console.log('\nJWT Token:');
    console.log(token);
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Usage:');
    console.log('  Add this token to your Authorization header:');
    console.log(`  Authorization: Bearer ${token.substring(0, 50)}...`);
    console.log('\n⚠️  Keep this token secure! Do not share it publicly.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

 * 
 * Generates a JWT token for a user by email with specified role
 * 
 * Usage:
 *   npm run generate-admin-token -- yeger9889@gmail.com super_admin
 *   npm run generate-admin-token -- user@example.com admin
 */

import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/middleware/auth';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run generate-admin-token -- <email> [role]');
    console.error('Example: npm run generate-admin-token -- yeger9889@gmail.com super_admin');
    process.exit(1);
  }

  const email = args[0].toLowerCase().trim();
  const role = args[1] || 'super_admin';

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.error('   Please create the user first or check the email address.');
      process.exit(1);
    }

    // Update user role if different
    if (user.role !== role) {
      console.log(`⚠️  User role is currently "${user.role}", updating to "${role}"...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
      console.log(`✅ User role updated to "${role}"`);
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, role);

    console.log('\n✅ JWT Token Generated Successfully!\n');
    console.log('='.repeat(80));
    console.log('User Information:');
    console.log(`  Email: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Role: ${role}`);
    console.log(`  First Name: ${user.firstName || 'N/A'}`);
    console.log(`  Last Name: ${user.lastName || 'N/A'}`);
    console.log('='.repeat(80));
    console.log('\nJWT Token:');
    console.log(token);
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Usage:');
    console.log('  Add this token to your Authorization header:');
    console.log(`  Authorization: Bearer ${token.substring(0, 50)}...`);
    console.log('\n⚠️  Keep this token secure! Do not share it publicly.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
