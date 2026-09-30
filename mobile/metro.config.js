const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Get the default config
const config = getDefaultConfig(__dirname);

config.transformer.minifierConfig = {
  compress: {
    // The option below removes all console logs statements in production.
    drop_console: true,
  },
};
// Use NativeWind
module.exports = withNativeWind(config, { input: "./src/global.css" });
