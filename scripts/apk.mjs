import fs from 'node:fs';
import path from 'node:path';
import { setupJavaEnv, runCmd, ANDROID_DIR, BUILDS_DIR } from './utils.mjs';

console.log('===================================');
console.log('  Building DexTools APK (Debug)');
console.log('===================================\n');

setupJavaEnv();

console.log('[1/4] Building Vite project...');
runCmd('npm', ['run', 'build']);

if (!fs.existsSync(ANDROID_DIR)) {
  console.log('[2/4] Android platform not found! Adding it now...');
  runCmd('npm', ['install', '@capacitor/android', '@capacitor/cli']);
  runCmd('npx', ['cap', 'add', 'android']);
} else {
  console.log('[2/4] Syncing web assets to Android...');
  runCmd('npx', ['cap', 'sync', 'android']);
}

console.log('[3/4] Building APK with Gradle...');
const isWin = process.platform === 'win32';
const gradlewCmd = isWin ? 'gradlew.bat' : './gradlew';

runCmd(gradlewCmd, ['assembleDebug'], { cwd: ANDROID_DIR });

console.log('[4/4] Exporting APK to builds folder...');
if (!fs.existsSync(BUILDS_DIR)) {
  fs.mkdirSync(BUILDS_DIR, { recursive: true });
}

const apkSource = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDest = path.join(BUILDS_DIR, 'DexToolsExample.apk');

if (fs.existsSync(apkSource)) {
  fs.copyFileSync(apkSource, apkDest);
  console.log('\n===================================');
  console.log('  [SUCCESS] APK built successfully!');
  console.log(`  Location: builds/DexToolsExample.apk`);
  console.log('===================================');
} else {
  console.error('\n[ERROR] Output APK file was not found at expected path:', apkSource);
  process.exit(1);
}
