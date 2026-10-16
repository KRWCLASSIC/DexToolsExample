import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dgram from 'node:dgram';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
export const ROOT_DIR = path.resolve(__filename, '..', '..');
export const ANDROID_DIR = path.join(ROOT_DIR, 'android');
export const BUILDS_DIR = path.join(ROOT_DIR, 'builds');

/**
 * Configure JAVA_HOME from Android Studio if not already set in environment
 */
export function setupJavaEnv() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  const candidates = isWin
    ? [
        'C:\\Program Files\\Android\\Android Studio\\jbr',
        'C:\\Program Files\\Android\\Android Studio\\jre',
        'C:\\Program Files\\Android\\android-studio\\jbr',
        'C:\\Program Files\\Android\\android-studio\\jre',
        path.join(process.env.LOCALAPPDATA || '', 'Android', 'android-studio', 'jbr'),
      ]
    : isMac
    ? [
        '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
        '/Applications/Android Studio.app/Contents/jre/Contents/Home',
      ]
    : [
        '/opt/android-studio/jbr',
        '/opt/android-studio/jre',
        path.join(os.homedir(), '.local/share/android-studio/jbr'),
        '/usr/lib/jvm/java-17-openjdk',
        '/usr/lib/jvm/default-java',
      ];

  // 1. Always prioritize Android Studio bundled Java 17 JBR
  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      process.env.JAVA_HOME = p;
      const binPath = path.join(p, 'bin');
      if (fs.existsSync(binPath)) {
        process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
      }
      console.log(`[INFO] Auto-detected Android Studio JBR (Java 17): ${p}\n`);
      return;
    }
  }

  // 2. Fallback to existing environment JAVA_HOME if valid
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    console.log(`[INFO] Using environment JAVA_HOME: ${process.env.JAVA_HOME}\n`);
    return;
  }

  console.warn('[WARNING] Android Studio Java not found in standard paths. Using system Java.');
}

/**
 * Detect the exact active IPv4 address connected to the local network / default gateway.
 * Uses OS kernel routing socket query (0ms latency, 0 packets sent, no regex guessing).
 */
export async function getLocalIp(preferredIp) {
  if (preferredIp) return preferredIp;

  try {
    const ip = await new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      socket.connect(80, '1.1.1.1', () => {
        try {
          const addr = socket.address().address;
          socket.close();
          resolve(addr);
        } catch (e) {
          reject(e);
        }
      });
      socket.on('error', reject);
    });

    if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
      return ip;
    }
  } catch {}

  return '127.0.0.1';
}

/**
 * Run synchronous shell command with inherited stdout/stderr
 */
export function runCmd(cmd, args = [], options = {}) {
  const isWin = process.platform === 'win32';
  const fullCmd = [cmd, ...args].join(' ');
  const res = spawnSync(isWin ? 'cmd.exe' : '/bin/sh', [isWin ? '/c' : '-c', fullCmd], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });

  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

/**
 * Run interactive async command
 */
export function spawnCmd(cmd, args = [], options = {}) {
  const isWin = process.platform === 'win32';
  const fullCmd = [cmd, ...args].join(' ');
  const child = spawn(isWin ? 'cmd.exe' : '/bin/sh', [isWin ? '/c' : '-c', fullCmd], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  return child;
}
