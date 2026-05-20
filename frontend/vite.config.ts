import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
// Forced restart for new deps
export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // Force deduplication of Prosemirror modules to prevent "Duplicate use of selection JSON ID"
            'prosemirror-state': path.resolve(__dirname, 'node_modules/prosemirror-state'),
            'prosemirror-view': path.resolve(__dirname, 'node_modules/prosemirror-view'),
            'prosemirror-model': path.resolve(__dirname, 'node_modules/prosemirror-model'),
            'prosemirror-transform': path.resolve(__dirname, 'node_modules/prosemirror-transform'),
        },
    },

    server: {
        port: 3000,
        host: true, // Listen on all addresses
        allowedHosts: true, // Allow ngrok and other external hosts

        // Proxy API requests to backend on port 8000
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },

            // Proxy WebSocket connections to port 8000
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
                    'query-vendor': ['@tanstack/react-query'],
                    'ui-vendor': ['framer-motion', 'recharts'],
                    'editor-vendor': [
                        '@tiptap/react',
                        '@tiptap/core',
                        '@tiptap/starter-kit',
                        'prosemirror-state',
                        'prosemirror-view',
                        'prosemirror-model',
                        'prosemirror-transform'
                    ],
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
            'axios',
            'zustand',
            'framer-motion',
            'recharts',
        ],
    },

    // Environment variables prefix
    envPrefix: 'VITE_',
});
