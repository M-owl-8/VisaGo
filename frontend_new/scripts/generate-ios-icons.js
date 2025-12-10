/**
 * Generate iOS App Icons
 * 
 * This script generates all required iOS app icon sizes from a source icon
 * and updates the AppIcon.appiconset folder.
 * 
 * Run this once to generate icons:
 *   node scripts/generate-ios-icons.js
 * 
 * Then rebuild the iOS app:
 *   npm run build:ios
 *   or
 *   cd ios && pod install && xcodebuild ...
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source icon path
const SOURCE_ICON = path.join(__dirname, '../src/assets/ketdik-icon.png.jpg');
const OUTPUT_DIR = path.join(__dirname, '../ios/frontend_new/Images.xcassets/AppIcon.appiconset');

// iOS icon sizes (from Contents.json structure)
const IOS_ICON_SIZES = [
  // iPhone icons
  { idiom: 'iphone', size: '20x20', scale: '2x', filename: 'Icon-App-20x20@2x.png', pixels: 40 },
  { idiom: 'iphone', size: '20x20', scale: '3x', filename: 'Icon-App-20x20@3x.png', pixels: 60 },
  { idiom: 'iphone', size: '29x29', scale: '2x', filename: 'Icon-App-29x29@2x.png', pixels: 58 },
  { idiom: 'iphone', size: '29x29', scale: '3x', filename: 'Icon-App-29x29@3x.png', pixels: 87 },
  { idiom: 'iphone', size: '40x40', scale: '2x', filename: 'Icon-App-40x40@2x.png', pixels: 80 },
  { idiom: 'iphone', size: '40x40', scale: '3x', filename: 'Icon-App-40x40@3x.png', pixels: 120 },
  { idiom: 'iphone', size: '60x60', scale: '2x', filename: 'Icon-App-60x60@2x.png', pixels: 120 },
  { idiom: 'iphone', size: '60x60', scale: '3x', filename: 'Icon-App-60x60@3x.png', pixels: 180 },
  // iOS Marketing (App Store)
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', filename: 'Icon-App-1024x1024@1x.png', pixels: 1024 },
];

async function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function generateIOSIcons() {
  console.log('🍎 Generating iOS app icons...\n');

  // Check if source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Source icon not found: ${SOURCE_ICON}`);
    console.error('   Please ensure assets/ketdik-icon.png exists');
    process.exit(1);
  }

  try {
    await ensureDirectory(OUTPUT_DIR);

    // Generate all icon sizes
    const generatedIcons = [];
    for (const iconConfig of IOS_ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, iconConfig.filename);
      const size = iconConfig.pixels;

      console.log(`📱 Generating ${iconConfig.filename} (${size}x${size}px)...`);

      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 2, g: 21, b: 43, alpha: 1 }, // #02152B
        })
        .png()
        .toFile(outputPath);

      console.log(`   ✅ Created ${outputPath}`);

      generatedIcons.push({
        idiom: iconConfig.idiom,
        scale: iconConfig.scale,
        size: iconConfig.size,
        filename: iconConfig.filename,
      });
    }

    // Generate Contents.json
    const contentsJson = {
      images: generatedIcons.map(icon => ({
        idiom: icon.idiom,
        scale: icon.scale,
        size: icon.size,
        filename: icon.filename,
      })),
      info: {
        author: 'xcode',
        version: 1,
      },
    };

    const contentsPath = path.join(OUTPUT_DIR, 'Contents.json');
    fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2));
    console.log(`\n   ✅ Created ${contentsPath}`);

    console.log('\n✅ iOS icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Open Xcode: cd ios && open frontend_new.xcworkspace');
    console.log('   2. Verify AppIcon is set in project settings');
    console.log('   3. Rebuild: npm run build:ios\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run the script
generateIOSIcons();





















