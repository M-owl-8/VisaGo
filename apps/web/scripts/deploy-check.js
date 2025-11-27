#!/usr/bin/env node

/**
 * Pre-deployment validation script
 * Checks environment variables, builds, and validates configuration
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_VARS = ['NEXT_PUBLIC_API_URL'];
const OPTIONAL_ENV_VARS = ['NEXT_PUBLIC_AI_SERVICE_URL'];

let hasErrors = false;

console.log('🔍 Running pre-deployment checks...\n');

// Check 1: Environment variables
console.log('1️⃣ Checking environment variables...');
const envFile = path.join(__dirname, '..', '.env.local');
const envExample = path.join(__dirname, '..', '.env.example');

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  REQUIRED_ENV_VARS.forEach(varName => {
    if (!envVars[varName] && !process.env[varName]) {
      console.error(`   ❌ Missing required: ${varName}`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${varName} is set`);
    }
  });

  OPTIONAL_ENV_VARS.forEach(varName => {
    if (envVars[varName] || process.env[varName]) {
      console.log(`   ✅ ${varName} is set (optional)`);
    } else {
      console.log(`   ⚠️  ${varName} not set (optional, using default)`);
    }
  });
} else {
  console.log('   ⚠️  .env.local not found');
  console.log('   💡 This is OK if env vars are set in hosting platform');
  
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`   ❌ Missing required: ${varName} (not in .env.local or process.env)`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${varName} found in process.env`);
    }
  });
}

// Check 2: TypeScript compilation
console.log('\n2️⃣ Checking TypeScript compilation...');
try {
  const { execSync } = require('child_process');
  execSync('npm run typecheck', { stdio: 'pipe', cwd: path.join(__dirname, '..') });
  console.log('   ✅ TypeScript compilation successful');
} catch (error) {
  console.error('   ❌ TypeScript errors found');
  console.error('   Run: npm run typecheck');
  hasErrors = true;
}

// Check 3: Build test
console.log('\n3️⃣ Testing production build...');
try {
  const { execSync } = require('child_process');
  console.log('   Building... (this may take a minute)');
  execSync('npm run build', { 
    stdio: 'inherit', 
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('   ✅ Build successful');
} catch (error) {
  console.error('   ❌ Build failed');
  hasErrors = true;
}

// Check 4: File structure
console.log('\n4️⃣ Checking file structure...');
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.ts',
  'app/layout.tsx',
  'app/page.tsx',
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.error(`   ❌ Missing: ${file}`);
    hasErrors = true;
  }
});

// Check 5: API configuration
console.log('\n5️⃣ Checking API configuration...');
const configPath = path.join(__dirname, '..', 'lib', 'api', 'config.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  if (configContent.includes('NEXT_PUBLIC_API_URL')) {
    console.log('   ✅ API config uses environment variables');
  } else {
    console.error('   ❌ API config may have hardcoded URLs');
    hasErrors = true;
  }
} else {
  console.error('   ❌ API config file not found');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Pre-deployment checks FAILED');
  console.error('Please fix the errors above before deploying.');
  process.exit(1);
} else {
  console.log('✅ All pre-deployment checks passed!');
  console.log('🚀 Ready to deploy.');
  process.exit(0);
}

