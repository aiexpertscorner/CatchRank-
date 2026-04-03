import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: '/CatchRank-/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }

            if (id.includes('@google/genai')) {
              return 'ai-vendor';
            }

            if (id.includes('recharts')) {
              return 'charts-vendor';
            }

            if (id.includes('/motion/') || id.includes('framer-motion')) {
              return 'motion-vendor';
            }

            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }

            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }

            if (
              id.includes('date-fns') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('sonner')
            ) {
              return 'utils-vendor';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});