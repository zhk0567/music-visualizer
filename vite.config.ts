import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples/jsm/postprocessing')) {
            return 'three-postprocessing';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'demo.wav'],
      manifest: {
        name: '音乐可视化',
        short_name: 'Visualizer',
        description: '浏览器端音乐可视化 — 频谱、波形、粒子、圆盘',
        theme_color: '#5858a8',
        background_color: '#5858a8',
        display: 'standalone',
        start_url: base,
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wav,woff2}'],
      },
    }),
  ],
});
