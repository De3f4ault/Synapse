/**
 * RouteContextProvider - React Router Integration
 *
 * Connects React Router's location to AudioContextResolver.
 * Integrated in router.tsx wrapping protected routes.
 * Automatically detects context from URL and updates audio behavior.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { audioContextResolver } from './AudioContextResolver';

interface RouteContextProviderProps {
  children: React.ReactNode;
}

export function RouteContextProvider({ children }: RouteContextProviderProps) {
  const location = useLocation();

  useEffect(() => {
    audioContextResolver.setRoute(location.pathname);
    
    // Refresh ListeningModel for new context
    try {
      const { listeningModel } = require('../intelligence/ListeningModel');
      listeningModel.refreshForContext(audioContextResolver.getContext());
    } catch {
      // Intelligence layer not loaded yet
    }
  }, [location.pathname]);

  return <>{children}</>;
}
