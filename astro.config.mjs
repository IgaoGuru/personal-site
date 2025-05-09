// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    build: {
      rollupOptions: {
        input: {
          main: './src/pages/mediantrees.astro',
        },
      },
    },
    optimizeDeps: {
      include: ['@xyflow/react']
    }
  }
});