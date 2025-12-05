/**
 * Generate JWT Token Directly (No Database Required)
 * 
 * Generates a JWT token directly if you know the user ID, email, and role
 * 
 * Usage:
 *   npm run generate-token-direct -- <userId> <email> <role>
 *   npm run generate-token-direct -- cmif22w2j00006zxehywqq9kd yeger9889@gmail.com super_admin
 */

import * as dotenv from 'dotenv';
import { generateToken } from '../src/middleware/auth';

// Load environment variables
dotenv.config();

function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: npm run generate-token-direct -- <userId> <email> <role>');
    console.error('Example: npm run generate-token-direct -- cmif22w2j00006zxehywqq9kd yeger9889@gmail.com super_admin');
    process.exit(1);
  }

  const userId = args[0];
  const email = args[1].toLowerCase().trim();
  const role = args[2];

  try {
    // Generate JWT token directly
    const token = generateToken(userId, email, role);

    console.log('\n✅ JWT Token Generated Successfully!\n');
    console.log('='.repeat(80));
    console.log('User Information:');
    console.log(`  User ID: ${userId}`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: ${role}`);
    console.log('='.repeat(80));
    console.log('\nJWT Token:');
    console.log(token);
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Usage:');
    console.log('  Add this token to your Authorization header:');
    console.log(`  Authorization: Bearer ${token}`);
    console.log('\n📋 Thunder Client / cURL:');
    console.log(`  Authorization: Bearer ${token}`);
    console.log('\n⚠️  Keep this token secure! Do not share it publicly.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

