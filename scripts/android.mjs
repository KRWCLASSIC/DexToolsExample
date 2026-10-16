import fs from 'node:fs';
import { setupJavaEnv, runCmd, ANDROID_DIR } from './utils.mjs';

console.log('===================================');
console.log('  Building & Deploying DexTools to Android');
console.log('===================================\n');

setupJavaEnv();

console.log('[1/3] Building Vite project...');
runCmd('npm', ['run', 'build']);

if (!fs.existsSync(ANDROID_DIR)) {
  console.log('[2/3] Android platform not found! Adding it now...');
  runCmd('npm', ['install', '@capacitor/android', '@capacitor/cli']);
  runCmd('npx', ['cap', 'add', 'android']);
} else {
  console.log('[2/3] Syncing web assets to Android...');
  runCmd('npx', ['cap', 'sync', 'android']);
}

console.log('[3/3] Deploying to connected Android device...');
console.log('Make sure your phone is plugged in with USB Debugging enabled!\n');
runCmd('npx', ['cap', 'run', 'android']);
