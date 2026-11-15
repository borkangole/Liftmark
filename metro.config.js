const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations ship as .sql files.
config.resolver.sourceExts.push('sql');
// expo-sqlite on web uses a wasm build.
config.resolver.assetExts.push('wasm');

module.exports = config;
