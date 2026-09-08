import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'https://noren-iqk3.onrender.com';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5176,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
                return 'ui';
              }
              if (id.includes('socket.io-client')) {
                return 'socket';
              }
            }
          },
        },
      },
    },
  };
});
