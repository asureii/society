import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import glsl from 'vite-plugin-glsl';

const viteBase =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.VITE_BASE || '/';

export default defineConfig({
  base: viteBase,
  plugins: [
    react(),
    tailwindcss(),
    glsl(),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          gsap: ['gsap', 'lenis'],
        },
      },
    },
  },
});
