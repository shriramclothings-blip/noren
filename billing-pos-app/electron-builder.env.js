// This script runs electron-builder programmatically, bypassing npm install-app-deps
const { build } = require('electron-builder');

build({
  config: {
    npmRebuild: false,
    buildDependenciesFromSource: false,
    nodeGypRebuild: false,
  },
  targets: require('electron-builder').Platform.WINDOWS.createTarget(['nsis', 'portable'], require('electron-builder').Arch.x64),
}).then((result) => {
  console.log('BUILD SUCCESS:', result);
}).catch((err) => {
  console.error('BUILD FAILED:', err);
  process.exit(1);
});
