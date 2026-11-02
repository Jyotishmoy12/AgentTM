import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: '../internal/server/ui', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: {
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:7331', changeOrigin: true, configure(proxy) {
      // Development only: the backend still receives its own trusted origin.
      proxy.on('proxyReq', request => { request.removeHeader('origin'); request.removeHeader('sec-fetch-site'); });
    } } },
  },
});
