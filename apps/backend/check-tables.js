const { PrismaClient } = require('@prisma/client');

async function checkTables() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });
  
  try {
    console.log('\n🔍 DATABASE VERIFICATION\n');
    
    // List users
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible - ${userCount} users`);
    
    // List visa types
    const visaCount = await prisma.visaType.count();
    console.log(`✅ VisaType table accessible - ${visaCount} visa types`);
    
    // List countries
    const countryCount = await prisma.country.count();
    console.log(`✅ Country table accessible - ${countryCount} countries`);
    
    // List payments
    const paymentCount = await prisma.payment.count();
    console.log(`✅ Payment table accessible - ${paymentCount} payments`);
    
    // List applications
    const appCount = await prisma.visaApplication.count();
    console.log(`✅ VisaApplication table accessible - ${appCount} applications`);
    
    console.log('\n📊 TABLE STATISTICS:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Countries: ${countryCount}`);
    console.log(`   Visa Types: ${visaCount}`);
    console.log(`   Applications: ${appCount}`);
    console.log(`   Payments: ${paymentCount}`);
    console.log('\n✅ All tables exist and are accessible!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nℹ️  If tables don\'t exist, run:');
    console.log('   npx prisma db push\n');
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();