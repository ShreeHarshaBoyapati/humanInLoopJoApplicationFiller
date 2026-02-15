import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'));
  const PORT = parseInt(env.VITE_EXT_PORT || '3000');
  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      crx({ manifest }),
    ],
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
