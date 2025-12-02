/**
 * Script to generate a JWT token for an admin user
 * 
 * Usage:
 *   cd apps/backend
 *   npm run generate-admin-token
 * 
 * To use production database:
 *   DATABASE_URL="your-production-database-url" npm run generate-admin-token
 * 
 * Or directly:
 *   ts-node --project scripts/tsconfig.json scripts/generate-admin-token.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { generateToken } from '../src/middleware/auth';

// Load environment variables
dotenv.config();

// Determine which database to use
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const isProduction = databaseUrl.includes('postgres') || databaseUrl.includes('railway') || databaseUrl.includes('gondola');

console.log('\n📊 Database Configuration:');
console.log(`   Type: ${isProduction ? 'PostgreSQL (Production)' : 'SQLite (Local)'}`);
console.log(`   URL: ${databaseUrl.substring(0, 50)}${databaseUrl.length > 50 ? '...' : ''}\n`);

// Warn if using SQLite when PostgreSQL is expected
if (!isProduction && databaseUrl.includes('file:')) {
  console.log('⚠️  WARNING: Using SQLite database. If you need PostgreSQL, set DATABASE_URL:');
  console.log('   PowerShell: $env:DATABASE_URL="postgresql://user:pass@host:port/db"');
  console.log('   Then run: npm run generate-admin-token\n');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log('🔍 Looking for admin users...\n');

  // First, try to find the specific superadmin email
  const targetEmail = 'yeger9889@gmail.com';
  let adminUser = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  // If not found, search for any admin users
  if (!adminUser) {
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'super_admin'],
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10,
    });

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in database.');
      console.log(`   Also checked for: ${targetEmail}`);
      console.log('\n📋 Next steps:');
      console.log('   1. Make sure DATABASE_URL points to PostgreSQL (not SQLite)');
      console.log('   2. If using PostgreSQL, verify the user exists: npm run list-users');
      console.log('   3. If user exists but not admin, run: npm run make-super-admin');
      console.log('   4. Then run this script again: npm run generate-admin-token\n');
      return;
    }

    adminUser = adminUsers[0];
    console.log(`⚠️  ${targetEmail} not found, using first admin user found: ${adminUser.email}\n`);
  } else {
    if (adminUser.role !== 'admin' && adminUser.role !== 'super_admin') {
      console.log(`⚠️  Found ${targetEmail} but role is "${adminUser.role}", not admin.`);
      console.log('   Run: npm run make-super-admin to set role to super_admin\n');
      return;
    }
    console.log(`✅ Found ${targetEmail} with role: ${adminUser.role}\n`);
  }

  console.log(`\n🔑 Generating token for: ${adminUser.email} (${adminUser.role})\n`);

  try {
    // Generate the JWT token
    const token = generateToken(adminUser.id, adminUser.email, adminUser.role || undefined);

    console.log('✅ Admin token generated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Token Information:');
    console.log(`   User: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log('\n🔐 JWT Token:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Usage:');
    console.log('   Add this header to your API requests:');
    console.log(`   Authorization: Bearer ${token.substring(0, 50)}...`);
    console.log('\n');
  } catch (error) {
    console.error('❌ Error generating token:', error);
    if (error instanceof Error) {
      if (error.message.includes('JWT_SECRET')) {
        console.error('\n⚠️  Make sure JWT_SECRET is set in your .env file');
        console.error('   It must be at least 32 characters long');
      }
    }
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

