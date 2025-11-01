#!/usr/bin/env node

/**
 * React Native Android Build Script
 * Fixes common issues and provides better error handling
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n');
console.log('?'.repeat(60));
console.log('  VisaBuddy Android Build - Fixed');
console.log('?'.repeat(60));
console.log('');

// Check prerequisites
console.log('✓ Checking Android SDK...');
const androidHome = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
if (!fs.existsSync(androidHome)) {
    console.error('✗ Android SDK not found at:', androidHome);
    process.exit(1);
}

console.log('✓ Android SDK found at:', androidHome);
console.log('');

// Run npx react-native run-android with proper CLI
console.log('Starting React Native build...\n');

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = [
    'react-native',
    'run-android',
    '--active-arch-only',
    '--no-jetifier'
];

const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        ANDROID_HOME: androidHome
    }
});

proc.on('close', (code) => {
    if (code === 0) {
        console.log('\n✓ Build completed successfully!');
    } else {
        console.error('\n✗ Build failed with code:', code);
    }
    process.exit(code);
});

proc.on('error', (error) => {
    console.error('✗ Error:', error.message);
    process.exit(1);
});