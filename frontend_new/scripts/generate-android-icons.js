/**
 * Generate Android Launcher Icons
 * 
 * This script generates all required Android launcher icon sizes from a source icon
 * and creates Android adaptive icon resources.
 * 
 * Run this once to generate icons:
 *   node scripts/generate-android-icons.js
 * 
 * Then rebuild the APK:
 *   npm run build:android
 *   or
 *   .\scripts\build-standalone-apk.ps1
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source icon path
const SOURCE_ICON = path.join(__dirname, '../src/assets/ketdik-icon.png.jpg');
const OUTPUT_DIR = path.join(__dirname, '../android/app/src/main/res');

// Android mipmap sizes (in dp, converted to px at different densities)
const ANDROID_SIZES = {
  'mipmap-mdpi': 48,      // 1x = 48x48px
  'mipmap-hdpi': 72,      // 1.5x = 72x72px
  'mipmap-xhdpi': 96,     // 2x = 96x96px
  'mipmap-xxhdpi': 144,   // 3x = 144x144px
  'mipmap-xxxhdpi': 192,  // 4x = 192x192px
};

// Adaptive icon foreground size (must be 108dp = 432px for xxxhdpi)
const ADAPTIVE_FOREGROUND_SIZE = 432;
const ADAPTIVE_BACKGROUND_COLOR = '#02152B';

async function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function generateAndroidIcons() {
  console.log('🎨 Generating Android launcher icons...\n');

  // Check if source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Source icon not found: ${SOURCE_ICON}`);
    console.error('   Please ensure assets/ketdik-icon.png exists');
    process.exit(1);
  }

  try {
    // Generate standard launcher icons for each density
    for (const [mipmapDir, size] of Object.entries(ANDROID_SIZES)) {
      const outputDir = path.join(OUTPUT_DIR, mipmapDir);
      await ensureDirectory(outputDir);

      const outputPath = path.join(outputDir, 'ic_launcher.png');
      const roundOutputPath = path.join(outputDir, 'ic_launcher_round.png');

      console.log(`📱 Generating ${mipmapDir} (${size}x${size}px)...`);

      // Generate square icon
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 2, g: 21, b: 43, alpha: 1 }, // #02152B
        })
        .png()
        .toFile(outputPath);

      // Generate round icon (same as square for now, Android will mask it)
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 2, g: 21, b: 43, alpha: 1 },
        })
        .png()
        .toFile(roundOutputPath);

      console.log(`   ✅ Created ${outputPath}`);
      console.log(`   ✅ Created ${roundOutputPath}`);
    }

    // Generate adaptive icon foreground (108dp = 432px for xxxhdpi)
    const adaptiveDir = path.join(OUTPUT_DIR, 'mipmap-anydpi-v26');
    await ensureDirectory(adaptiveDir);

    const foregroundDir = path.join(OUTPUT_DIR, 'mipmap-xxxhdpi');
    const foregroundPath = path.join(foregroundDir, 'ic_launcher_foreground.png');

    console.log(`\n📱 Generating adaptive icon foreground (${ADAPTIVE_FOREGROUND_SIZE}x${ADAPTIVE_FOREGROUND_SIZE}px)...`);

    await sharp(SOURCE_ICON)
      .resize(ADAPTIVE_FOREGROUND_SIZE, ADAPTIVE_FOREGROUND_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
      })
      .png()
      .toFile(foregroundPath);

    console.log(`   ✅ Created ${foregroundPath}`);

    // Create adaptive icon XML
    const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

    const adaptiveIconPath = path.join(adaptiveDir, 'ic_launcher.xml');
    fs.writeFileSync(adaptiveIconPath, adaptiveIconXml);
    console.log(`   ✅ Created ${adaptiveIconPath}`);

    // Create round adaptive icon XML
    const adaptiveIconRoundXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

    const adaptiveIconRoundPath = path.join(adaptiveDir, 'ic_launcher_round.xml');
    fs.writeFileSync(adaptiveIconRoundPath, adaptiveIconRoundXml);
    console.log(`   ✅ Created ${adaptiveIconRoundPath}`);

    // Create background color resource
    const valuesDir = path.join(OUTPUT_DIR, 'values');
    await ensureDirectory(valuesDir);

    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ADAPTIVE_BACKGROUND_COLOR}</color>
</resources>`;

    const colorsPath = path.join(valuesDir, 'colors.xml');
    fs.writeFileSync(colorsPath, colorsXml);
    console.log(`   ✅ Created ${colorsPath}`);

    console.log('\n✅ Android icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Rebuild the APK: npm run build:android');
    console.log('   2. Or use: .\\scripts\\build-standalone-apk.ps1');
    console.log('   3. Install on device and verify icon appears correctly\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run the script
generateAndroidIcons();
















