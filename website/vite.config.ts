import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: { home: 'index.html', docs: 'docs.html' },
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'react-vendor';
          if (/\/src\/components\/(atoms\/(Brand|Icon)|molecules\/CodeBlock)\.tsx$/.test(path))
            return 'shared-ui';
        },
      },
    },
  },
});
