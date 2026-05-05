import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgrPlugin from 'vite-plugin-svgr';

// IP of the ESP32 webserver on the LAN. Change this when the ESP moves
// networks. The dev server proxies /api and /ws to it so the React app
// can run on localhost:3000 and still talk to real firmware.
const target = 'http://192.168.2.6';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: target.replace(/^http/, 'ws'),
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
    port: 3000,
  },
  plugins: [react(), viteTsconfigPaths(), svgrPlugin()],
  build: {
    outDir: '../webroot',
    emptyOutDir: true,
  },
});
