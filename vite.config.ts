import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Map of chunk name -> list of package prefixes to group into it
const VENDOR_CHUNKS: Record<string, string[]> = {
  'vendor-react':  ['react', 'react-dom', 'react-router-dom', 'react-error-boundary'],
  'vendor-motion': ['framer-motion'],
  'vendor-monaco': ['@monaco-editor', 'monaco-editor'],
  'vendor-charts': ['recharts'],
  'vendor-xterm':  ['@xterm'],
  'vendor-query':  ['@tanstack'],
  'vendor-icons':  ['lucide-react'],
  'vendor-utils':  ['clsx', 'tailwind-merge', 'date-fns', 'zustand', 'sonner'],
}

import { reactRouter } from '@react-router/dev/vite'

export default defineConfig({
  plugins: [reactRouter(), tailwindcss()],

  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  build: {
    // oxc is the built-in minifier in Vite 8.x (replaces esbuild)
    minify: 'oxc',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    target: 'es2020',
    rollupOptions: {
      output: {
        // Use a function form (correct type) for manualChunks
        manualChunks(id: string) {
          for (const [chunk, pkgs] of Object.entries(VENDOR_CHUNKS)) {
            if (pkgs.some(pkg => id.includes(`/node_modules/${pkg}`))) {
              return chunk
            }
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
})