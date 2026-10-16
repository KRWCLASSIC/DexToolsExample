import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'capacitor-dextools': path.resolve(__dirname, '../DexTools/src/index.ts')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
