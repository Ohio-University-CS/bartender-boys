const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const assetExts = new Set(config.resolver.assetExts || []);
assetExts.add('glb');
assetExts.add('gltf');
config.resolver.assetExts = Array.from(assetExts);

module.exports = config;
