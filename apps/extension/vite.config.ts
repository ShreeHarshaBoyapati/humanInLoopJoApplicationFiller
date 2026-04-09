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
  const WEB_APP_URL = env.VITE_WEB_APP_URL || 'http://localhost:3001';

  // Transform manifest to inject web app URL for auth sync content script
  const transformedManifest = { ...manifest };

  // Add web app domain to content_scripts for auth sync
  if (transformedManifest.content_scripts) {
    transformedManifest.content_scripts.push({
      matches: [`${WEB_APP_URL}/*`],
      js: ['./src/content/auth-sync.ts'],
      run_at: 'document_start',
    });
  }

  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      crx({ manifest: transformedManifest }),
    ],
    envDir: '../..',
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
