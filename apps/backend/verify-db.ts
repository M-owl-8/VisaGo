import { db } from './src/db';

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database tables...\n');
    
    // Test if we can query each table
    const users = await db.user.count();
    console.log(`✅ User table exists - Count: ${users}`);
    
    const countries = await db.country.count();
    console.log(`✅ Country table exists - Count: ${countries}`);
    
    const visaTypes = await db.visaType.count();
    console.log(`✅ VisaType table exists - Count: ${visaTypes}`);
    
    const applications = await db.visaApplication.count();
    console.log(`✅ VisaApplication table exists - Count: ${applications}`);
    
    const documents = await db.userDocument.count();
    console.log(`✅ UserDocument table exists - Count: ${documents}`);
    
    const payments = await db.payment.count();
    console.log(`✅ Payment table exists - Count: ${payments}`);
    
    const chatSessions = await db.chatSession.count();
    console.log(`✅ ChatSession table exists - Count: ${chatSessions}`);
    
    console.log('\n✨ All tables verified successfully!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    await db.$disconnect();
  }
}

verifyDatabase();