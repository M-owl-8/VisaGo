#!/usr/bin/env node

/**
 * Quick verification script to check if web app is set up correctly
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let hasErrors = false;

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  checks.push({ file: filePath, exists, description });
  if (!exists) {
    console.error(`❌ Missing: ${filePath} - ${description}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found: ${filePath}`);
  }
}

function checkDir(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  checks.push({ file: dirPath, exists, description });
  if (!exists) {
    console.error(`❌ Missing directory: ${dirPath} - ${description}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found directory: ${dirPath}`);
  }
}

console.log('🔍 Verifying web app setup...\n');

// Check critical files
checkFile('package.json', 'Package configuration');
checkFile('tsconfig.json', 'TypeScript configuration');
checkFile('next.config.js', 'Next.js configuration');
checkFile('tailwind.config.ts', 'Tailwind CSS configuration');
checkFile('postcss.config.js', 'PostCSS configuration');

// Check directories
checkDir('app', 'Next.js app directory');
checkDir('components', 'React components');
checkDir('lib', 'Core libraries');
checkDir('locales', 'Translation files');

// Check key app files
checkFile('app/layout.tsx', 'Root layout');
checkFile('app/page.tsx', 'Home page');
checkFile('app/login/page.tsx', 'Login page');
checkFile('app/register/page.tsx', 'Register page');
checkFile('app/applications/page.tsx', 'Applications page');
checkFile('app/questionnaire/page.tsx', 'Questionnaire page');
checkFile('app/chat/page.tsx', 'Chat page');
checkFile('app/profile/page.tsx', 'Profile page');
checkFile('app/support/page.tsx', 'Support page');

// Check lib files
checkFile('lib/api/client.ts', 'API client');
checkFile('lib/api/config.ts', 'API config');
checkFile('lib/stores/auth.ts', 'Auth store');
checkFile('lib/stores/chat.ts', 'Chat store');
checkFile('lib/i18n/index.ts', 'i18n setup');

// Check locales
checkFile('locales/en.json', 'English translations');
checkFile('locales/ru.json', 'Russian translations');
checkFile('locales/uz.json', 'Uzbek translations');

// Check components
checkFile('components/Layout.tsx', 'Layout component');

console.log('\n📊 Summary:');
console.log(`Total checks: ${checks.length}`);
console.log(`Passed: ${checks.filter(c => c.exists).length}`);
console.log(`Failed: ${checks.filter(c => !c.exists).length}`);

if (hasErrors) {
  console.log('\n❌ Setup incomplete. Please fix the missing files.');
  process.exit(1);
} else {
  console.log('\n✅ All files are in place!');
  console.log('\n🚀 Next steps:');
  console.log('1. Run: npm install (if not done already)');
  console.log('2. Create .env.local with NEXT_PUBLIC_API_URL (optional, has defaults)');
  console.log('3. Run: npm run dev');
  console.log('4. Open: http://localhost:3000');
  process.exit(0);
}


