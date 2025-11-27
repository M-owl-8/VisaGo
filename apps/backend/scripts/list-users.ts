/**
 * Script to list all users in the database
 * 
 * To use production database:
 *   DATABASE_URL="your-production-database-url" npm run list-users
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
  console.log('Fetching all users from database...\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // Show up to 100 users
  });

  if (users.length === 0) {
    console.log('❌ No users found in database.');
    console.log('Please register a user first through the app.');
    return;
  }

  const totalUsers = await prisma.user.count();
  console.log(`Found ${users.length} user(s) (showing first ${users.length} of ${totalUsers} total):\n`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. Email: ${user.email}`);
    console.log(`   Name: ${user.firstName || ''} ${user.lastName || ''}`.trim() || '   Name: (not set)');
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('');
  });

  // Check if yeger9889@gmail.com exists with different casing
  const targetEmail = 'yeger9889@gmail.com';
  const found = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
  if (!found && users.some(u => u.email.toLowerCase().includes('yeger'))) {
    console.log('⚠️  Note: Found similar email but not exact match.');
    console.log('   Make sure you register/login with the exact email: yeger9889@gmail.com');
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

