import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

                            resolve: {
                                alias: {
                                    '@': path.resolve(__dirname, './src'),
                                },
                            },

                            server: {
                                port: 3000,
                            host: true, // Listen on all addresses

                            // Proxy API requests to backend
                            proxy: {
                                '/api': {
                                    target: 'http://localhost:8000',
                            changeOrigin: true,
                            secure: false,
                            rewrite: (path) => path, // Keep /api prefix
                                },

                            // Proxy WebSocket connections
                            '/ws': {
                                target: 'ws://localhost:8000',
                            ws: true,
                            changeOrigin: true,
                            },
                            },
                            },

                            build: {
                                outDir: 'dist',
                            sourcemap: true,

                            // Optimize chunk splitting
                            rollupOptions: {
                                output: {
                                    manualChunks: {
                                        // Vendor chunks
                                        'react-vendor': ['react', 'react-dom'],
                            'query-vendor': ['@tanstack/react-query', '@tanstack/react-router'],
                            'ui-vendor': ['framer-motion', 'recharts'],
                            'editor-vendor': ['@blocknote/react', '@blocknote/core'],
                                    },
                                },
                            },

                            // Increase chunk size warning limit
                            chunkSizeWarningLimit: 1000,
                            },

                            // Optimize dependencies
                            optimizeDeps: {
                                include: [
                                    'react',
                                    'react-dom',
                                    '@tanstack/react-query',
                                    '@tanstack/react-router',
                                    'axios',
                                    'zustand',
                                    'framer-motion',
                                    'recharts',
                                ],
                            },

                            // Environment variables prefix
                            envPrefix: 'VITE_',
});
