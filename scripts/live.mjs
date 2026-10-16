import { setupJavaEnv, getLocalIp, spawnCmd } from './utils.mjs';

console.log('===================================');
console.log('  DexTools WiFi Live Reload');
console.log('  Serves assets over WiFi.');
console.log('  Phone + PC must be on same network!');
console.log('===================================\n');

setupJavaEnv();

const preferredIp = process.argv[2];
const hostIp = await getLocalIp(preferredIp);

console.log(`[INFO] Using host IP: ${hostIp}`);
console.log('[INFO] Make sure your phone is on the same local network!\n');
console.log(`Starting live reload on ${hostIp}:5173... (Press Ctrl+C to stop)\n`);

spawnCmd('npx', ['cap', 'run', 'android', '-l', '--host', hostIp, '--port', '5173']);
