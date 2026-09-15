import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const isHttps = process.env.HTTPS === 'true' || process.argv.includes('--https');

  return {
    plugins: [
      react(),
      isHttps ? basicSsl() : null,
    ].filter(Boolean),
    server: {
      host: true,
      port: 5173,
      https: isHttps ? {} : undefined,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
  };
});
