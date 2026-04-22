const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-native-web": path.resolve(projectRoot, "node_modules/react-native-web"),
  "scheduler": path.resolve(projectRoot, "node_modules/scheduler"),
};

// Exclude transient/temp workspace directories from the file watcher to prevent
// ENOENT crashes when directories are deleted while Metro is watching them.
const blockList = [
  /[/\\]\.local[/\\].*/,
  /[/\\]attached_assets[/\\].*/,
  /[/\\]\.git[/\\].*/,
];
config.resolver.blockList = blockList;

module.exports = config;
