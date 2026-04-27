import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    target: 'es2022',
  },
});
