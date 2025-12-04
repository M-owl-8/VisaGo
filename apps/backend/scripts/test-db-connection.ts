/**
 * Test Database Connection
 * Quick script to test Railway Postgres connectivity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
    
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    console.log('Result:', result);
    
    // Test a simple table query
    const count = await prisma.user.count();
    console.log(`✅ Can query database. User count: ${count}`);
    
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

