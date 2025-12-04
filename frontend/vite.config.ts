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

<<<<<<< HEAD
                            // Proxy API requests to backend on port 8000
=======
                            // Proxy API requests to backend
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
                            proxy: {
                                '/api': {
                                    target: 'http://localhost:8000',
                            changeOrigin: true,
                            secure: false,
                            rewrite: (path) => path, // Keep /api prefix
                                },

<<<<<<< HEAD
                            // Proxy WebSocket connections to port 8000
=======
                            // Proxy WebSocket connections
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
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
