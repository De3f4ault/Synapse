import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/synapse-theme.css'; // Global Synapse Theme
import './styles/glass.css';
import './styles/animations.css';
import './styles/scrollbar.css';
import './styles/markdown.css';
import './styles/neumorphic.css'; // Neumorphic Design System
import './api/client'; // Initialize API client

/**
 * Application Entry Point
 */

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Failed to find root element');
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);
