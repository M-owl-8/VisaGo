#!/usr/bin/env node

/**
 * Railway-specific deployment validation
 * Checks Railway-specific requirements before deployment
 */

const fs = require('fs');
const path = require('path');

let hasErrors = false;
let hasWarnings = false;

console.log('🚂 Railway Deployment Validation\n');

// Check 1: Root directory structure
console.log('1️⃣ Checking project structure...');
const webDir = path.join(__dirname, '..');
const packageJson = path.join(webDir, 'package.json');
const nextConfig = path.join(webDir, 'next.config.js');
const railwayJson = path.join(webDir, 'railway.json');

if (fs.existsSync(packageJson)) {
  console.log('   ✅ package.json found');
} else {
  console.error('   ❌ package.json not found');
  hasErrors = true;
}

if (fs.existsSync(nextConfig)) {
  console.log('   ✅ next.config.js found');
} else {
  console.error('   ❌ next.config.js not found');
  hasErrors = true;
}

if (fs.existsSync(railwayJson)) {
  console.log('   ✅ railway.json found');
} else {
  console.log('   ⚠️  railway.json not found (optional, Railway will auto-detect)');
  hasWarnings = true;
}

// Check 2: Environment variables
console.log('\n2️⃣ Checking environment variables...');
const requiredVars = ['NEXT_PUBLIC_API_URL'];
const optionalVars = ['NEXT_PUBLIC_AI_SERVICE_URL', 'NODE_ENV', 'PORT'];

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} is set: ${process.env[varName]}`);
  } else {
    console.error(`   ❌ ${varName} is NOT set (REQUIRED for Railway)`);
    console.error(`      Set this in Railway Dashboard → Variables`);
    hasErrors = true;
  }
});

optionalVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} is set: ${process.env[varName]}`);
  } else {
    console.log(`   ⚠️  ${varName} not set (optional)`);
    hasWarnings = true;
  }
});

// Check 3: Next.js build
console.log('\n3️⃣ Testing Next.js build...');
try {
  const { execSync } = require('child_process');
  console.log('   Building... (this may take a minute)');
  execSync('npm run build', { 
    stdio: 'inherit', 
    cwd: webDir,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('   ✅ Build successful');
} catch (error) {
  console.error('   ❌ Build failed');
  console.error('   Fix build errors before deploying to Railway');
  hasErrors = true;
}

// Check 4: Railway-specific files
console.log('\n4️⃣ Checking Railway configuration...');
const nixpacksToml = path.join(webDir, 'nixpacks.toml');
if (fs.existsSync(nixpacksToml)) {
  console.log('   ✅ nixpacks.toml found (Railway will use this)');
} else {
  console.log('   ⚠️  nixpacks.toml not found (Railway will auto-detect Next.js)');
  hasWarnings = true;
}

// Check 5: Port configuration
console.log('\n5️⃣ Checking port configuration...');
const packageContent = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
const startScript = packageContent.scripts?.start || '';
if (startScript.includes('PORT') || startScript.includes('-p')) {
  console.log('   ⚠️  Start script has hardcoded port');
  console.log('   💡 Railway sets PORT automatically, remove hardcoded port');
  hasWarnings = true;
} else {
  console.log('   ✅ Start script uses Railway-provided PORT');
}

// Check 6: Output mode
console.log('\n6️⃣ Checking Next.js output mode...');
const nextConfigContent = fs.readFileSync(nextConfig, 'utf-8');
if (nextConfigContent.includes("output: 'standalone'")) {
  console.log('   ✅ Using standalone output (optimized for Railway)');
} else {
  console.log('   ⚠️  Not using standalone output');
  console.log('   💡 Consider adding: output: "standalone" to next.config.js');
  hasWarnings = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Railway deployment validation FAILED');
  console.error('Please fix the errors above before deploying to Railway.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Railway deployment validation passed with warnings');
  console.log('Review warnings above, but deployment should work.');
  process.exit(0);
} else {
  console.log('✅ All Railway deployment checks passed!');
  console.log('🚀 Ready to deploy to Railway.');
  process.exit(0);
}

