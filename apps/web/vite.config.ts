import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');

  const webAppUrl = env.VITE_WEB_APP_URL;
  const hostname = webAppUrl ? new URL(webAppUrl).hostname : 'localhost';
  const port = env.VITE_WEB_APP_PORT ? Number(env.VITE_WEB_APP_PORT) : 5173;

  return {
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
    envDir: '../../',
    server: {
      host: hostname,
      port,
    },
  };
});
