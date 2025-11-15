import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const testEmail = 'test@visabuddy.com';
  const testPassword = 'Test123!@#$%';
  
  const passwordHash = await bcrypt.hash(testPassword, 12);
  
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: { passwordHash },
    create: {
      email: testEmail,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
      preferences: { create: {} }
    }
  });
  
  console.log('\n Test User Created!');
  console.log('');
  console.log(`Email:    ${testEmail}`);
  console.log(`Password: ${testPassword}`);
  console.log('\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
