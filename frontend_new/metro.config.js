// Metro config for React Native 0.72+
// Must use CommonJS (require/module.exports)
// This file is NOT bundled, it's used by Metro bundler only

const path = require('path');

// Project root
const projectRoot = __dirname;

// Metro config
const config = {
  projectRoot: projectRoot,
  watchFolders: [projectRoot],
  
  resolver: {
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs', 'mjs'],
    assetExts: [
      'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp',
      'm4v', 'mov', 'mp4', 'mpeg', 'mpg', 'webm',
      'aac', 'aiff', 'caf', 'm4a', 'mp3', 'wav',
      'html', 'pdf', 'yaml', 'yml',
      'otf', 'ttf', 'woff', 'woff2',
    ],
  },
  
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  
  server: {
    port: 8081,
  },
};

module.exports = config;
