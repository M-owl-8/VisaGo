import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Admin Panel Data Access...\n');

  // Check database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || 'not set';
  const dbType = dbUrl.includes('file:') ? 'SQLite' : dbUrl.includes('postgresql') ? 'PostgreSQL' : 'Unknown';
  console.log(`📊 Database Type: ${dbType}`);
  console.log(`📊 DATABASE_URL: ${dbUrl.substring(0, 50)}...\n`);

  // Count users
  try {
    const userCount = await prisma.user.count();
    console.log(`👥 Total Users: ${userCount}`);

    if (userCount > 0) {
      const sampleUsers = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('\n📋 Sample Users (latest 5):');
      sampleUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (role: ${user.role}, created: ${user.createdAt.toISOString().split('T')[0]})`);
      });
    }
  } catch (error) {
    console.error('❌ Error counting users:', error);
  }

  // Count applications
  try {
    const appCount = await prisma.visaApplication.count();
    console.log(`\n📋 Total Applications: ${appCount}`);

    if (appCount > 0) {
      const sampleApps = await prisma.visaApplication.findMany({
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('\n📋 Sample Applications (latest 5):');
      sampleApps.forEach((app, i) => {
        console.log(`   ${i + 1}. ID: ${app.id.substring(0, 8)}... (status: ${app.status}, created: ${app.createdAt.toISOString().split('T')[0]})`);
      });
    }
  } catch (error) {
    console.error('❌ Error counting applications:', error);
  }

  // Count payments
  try {
    const paymentCount = await prisma.payment.count();
    console.log(`\n💳 Total Payments: ${paymentCount}`);
  } catch (error) {
    console.error('❌ Error counting payments:', error);
  }

  // Count documents
  try {
    const docCount = await prisma.userDocument.count();
    console.log(`\n📄 Total Documents: ${docCount}`);
  } catch (error) {
    console.error('❌ Error counting documents:', error);
  }

  console.log('\n✅ Verification complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });








