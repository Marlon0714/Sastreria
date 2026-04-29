const { getDefaultConfig } = require("expo/metro-config");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // expo-sqlite web worker imports wa-sqlite.wasm; enable wasm asset resolution.
  config.resolver ??= {};
  config.resolver.assetExt ??= [];
  // Required for expo-sqlite web in SDK 54: worker imports internal wasm path.
  config.resolver.unstable_enablePackageExports = false;
  if (!config.resolver.assetExt.includes("wasm")) {
    config.resolver.assetExt.push("wasm");
  }

  return config;
})();
