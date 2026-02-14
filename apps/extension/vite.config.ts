import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'));
  const PORT = parseInt(env.VITE_EXT_PORT || '3000');
  return {
    plugins: [react(), crx({ manifest })],
    server: {
      port: PORT,
      strictPort: true,
      hmr: {
        port: PORT,
      },
      cors: {
        origin: /chrome-extension:\/\//,
      },
    },
    legacy: {
      skipWebSocketTokenCheck: true,
    },
  };
});
