// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { astroImageTools } from "astro-imagetools";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), astroImageTools],
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