/**
 * Script to promote a user to super_admin role
 * 
 * Usage:
 *   cd apps/backend
 *   npm run make-super-admin
 * 
 * Or directly:
 *   ts-node --project tsconfig.json scripts/make-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'yeger9889@gmail.com';

  console.log(`Looking for user with email: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`❌ User with email ${email} not found`);
    console.log('Please ensure the user exists in the database first.');
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

