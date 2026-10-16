import { spawnSync, spawn } from 'node:child_process';

console.log('===================================');
console.log('  Streaming Android Logs for DexTools');
console.log('===================================');
console.log('[INFO] Press Ctrl+C to stop.\n');

// Clear logcat buffer first
spawnSync('adb', ['logcat', '-c'], { stdio: 'inherit', shell: true });

// Stream relevant tags
const child = spawn('adb', ['logcat', '-v', 'time', '-s', 'DexTools:V', 'DexToolsPlugin:V', 'DexRunnerService:V', 'Capacitor:V', 'chromium:V', '*:E'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
