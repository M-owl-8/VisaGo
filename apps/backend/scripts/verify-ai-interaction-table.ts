import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    // Check if AIInteraction model exists
    const hasModel = 'aIInteraction' in prisma;
    console.log('✅ AIInteraction model exists in Prisma Client:', hasModel);

    // Try to query the table (will fail if table doesn't exist)
    const count = await prisma.aIInteraction.count();
    console.log('✅ AIInteraction table exists and is accessible');
    console.log(`   Current record count: ${count}`);

    console.log('\n✅ All checks passed! AIInteraction logging is ready.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

