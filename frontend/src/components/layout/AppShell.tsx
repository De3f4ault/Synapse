/**
 * AppShell - Oracle Theme (Sidebar Removed)
 * "Neural Container" - Simplified layout with header-only navigation
 *
 * Location: components/layout/AppShell.tsx
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";

import { GridPattern } from "@/components/ui/grid-pattern";

/**
 * AppShell Component
 *
 * Provides the main layout structure:
 * - Fixed header at top with all navigation
 * - Full-height content area below
 * - No sidebar (consolidated into header)
 */

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header - Flex Item (No Overlap) */}
      <Header className="flex-none z-50" />

      {/* Main Content Area - Fills remaining space */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Render child routes or passed children */}
        {children || <Outlet />}
      </main>

      {/* Global Background - Grid Pattern */}
      <GridPattern className="pointer-events-none -z-10" />
    </div>
  );
}

export default AppShell;
