import { runCmd } from './utils.mjs';

console.log('===================================');
console.log('  Sync Assets to Android Project');
console.log('===================================\n');

console.log('[1/2] Building Vite project...');
runCmd('npm', ['run', 'build']);

console.log('[2/2] Syncing web assets only (no Gradle rebuild)...');
runCmd('npx', ['cap', 'sync', 'android']);

console.log('\n===================================');
console.log('  [SUCCESS] Assets synced!');
console.log('  Re-launch the app on your phone.');
console.log('===================================');
