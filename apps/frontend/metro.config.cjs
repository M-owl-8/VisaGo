const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Remove problematic options
config.server = config.server || {};
delete config.server.forwardClientLogs;

config.watcher = config.watcher || {};
delete config.watcher.unstable_lazySha1;
delete config.watcher.unstable_workerThreads;
delete config.watcher.unstable_autoSaveCache;

// Fix for Windows path issues
config.resolver = config.resolver || {};
config.resolver.blockList = [
  /node_modules\/.*\.expo/,
  /\.expo$/,
  /__tests__/,
];

module.exports = config;