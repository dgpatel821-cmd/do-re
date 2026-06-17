const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .cjs to the source extensions to fix pdf-lib resolution issues
config.resolver.sourceExts.push('cjs');

module.exports = config;
