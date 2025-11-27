/**
 * Script to promote a user to super_admin role
 * 
 * Usage:
 *   cd apps/backend
 *   npm run make-super-admin
 * 
 * To use production database:
 *   DATABASE_URL="your-production-database-url" npm run make-super-admin
 * 
 * Or directly:
 *   ts-node --project scripts/tsconfig.json scripts/make-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Determine which database to use
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const isProduction = databaseUrl.includes('postgres') || databaseUrl.includes('railway') || databaseUrl.includes('gondola');

console.log('\n📊 Database Configuration:');
console.log(`   Type: ${isProduction ? 'PostgreSQL (Production)' : 'SQLite (Local)'}`);
console.log(`   URL: ${databaseUrl.substring(0, 50)}${databaseUrl.length > 50 ? '...' : ''}\n`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  const email = 'yeger9889@gmail.com';

  console.log(`Looking for user with email: ${email}`);

  // Try exact match first
  let user = await prisma.user.findUnique({
    where: { email },
  });

  // If not found, list all users to help identify the issue
  if (!user) {
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Show last 10 users
    });

    console.log(`\n❌ User with email ${email} not found`);
    console.log('\n📋 Available users in database:');
    if (allUsers.length > 0) {
      allUsers.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (role: ${u.role})`);
      });
    } else {
      console.log('   (No users found)');
    }
    console.log('\n📋 Next steps:');
    console.log('   1. Register/login with yeger9889@gmail.com in the app first');
    console.log('   2. Then run this script again: npm run make-super-admin');
    console.log('\n   OR to use an existing user:');
    console.log('   - Edit this script and change the email on line 17');
    console.log('   - Run: npm run make-super-admin\n');
    return;
  }

  console.log(`Found user: ${user.email} (ID: ${user.id})`);
  console.log(`Current role: ${user.role}`);

  if (user.role === 'super_admin') {
    console.log('✅ User is already super_admin. No changes needed.');
    return;
  }

  const updated = await prisma.user.update({
    where: { email },
    data: {
      role: 'super_admin',
    },
  });

  console.log('✅ Successfully updated user role!');
  console.log(`   Email: ${updated.email}`);
  console.log(`   New role: ${updated.role}`);
  console.log(`   Updated at: ${updated.updatedAt}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

