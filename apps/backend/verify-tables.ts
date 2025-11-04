const db = require('./src/db.ts');

async function verifyDatabase() {
  try {
    console.log('?? Verifying Database Tables...\n');
    
    // Test 1: Check user count
    const userCount = await db.user.count();
    console.log('? User table exists - Records:', userCount);
    
    // Test 2: Check visa type count
    const visaCount = await db.visaType.count();
    console.log('? VisaType table exists - Records:', visaCount);
    
    // Test 3: Check visa application count
    const appCount = await db.visaApplication.count();
    console.log('? VisaApplication table exists - Records:', appCount);
    
    // Test 4: Check document count
    const docCount = await db.document.count();
    console.log('? Document table exists - Records:', docCount);
    
    console.log('\n?? Database Status: ALL TABLES VERIFIED ?');
    
  } catch (error) {
    console.error('? Database Error:', error.message);
    process.exit(1);
  } finally {
    await db.\();
  }
}

verifyDatabase();
