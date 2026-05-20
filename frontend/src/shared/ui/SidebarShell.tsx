/**
 * SidebarShell — Shared sidebar container with collapse/expand behavior
 *
 * All module sidebars (Chat, Flashcards, Quizzes, Documents, Knowledge)
 * inherit this shell for uniform UX:
 *
 * COLLAPSED mode:
 *   - Floating rounded pill (w-16) with icon-only buttons + tooltips
 *   - Expand toggle, primary action, optional extra icons
 *
 * EXPANDED mode:
 *   - Full-width panel (w-[272px]) with rounded edges
 *   - Header: collapse toggle + primary action label + optional search
 *   - Scrollable content area
 *   - Optional footer hint
 *
 * Collapse state is persisted via localStorage per `storageKey`.
 */

import { useState, useEffect, type ReactNode, type ElementType } from "react";
import {
  PanelLeftClose,
  PanelLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export interface CollapsedAction {
  icon: ElementType;
  label: string;
  onClick: () => void;
}

export interface SidebarShellProps {
  /** localStorage key for persisting collapse state */
  storageKey: string;

  /** Module title (e.g. "Flashcards", "Quizzes") */
  title: string;

  /** Icon shown next to the title */
  titleIcon: ElementType;

  /** Primary CTA button in the header */
  primaryAction: {
    label: string;
    icon: ElementType;
    onClick: () => void;
  };

  /** Optional secondary action (e.g. "AI Generate") */
  secondaryAction?: {
    label: string;
    icon: ElementType;
    onClick: () => void;
  };

  /** Additional icon buttons shown in collapsed rail */
  collapsedActions?: CollapsedAction[];

  /** Stats line below the title (e.g. "11 Decks") */
  statsLine?: ReactNode;

  /** Search configuration */
  searchable?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;

  /** Footer hint text */
  footerHint?: string;

  /** Main content area — receives isCollapsed flag */
  children: (isCollapsed: boolean) => ReactNode;

  /** Extra content rendered inside the collapsed rail (e.g. popover triggers) */
  collapsedExtra?: ReactNode;

  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SidebarShell({
  storageKey,
  title,
  titleIcon: TitleIcon,
  primaryAction,
  secondaryAction,
  collapsedActions = [],
  statsLine,
  searchable = false,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Filter...",
  footerHint,
  children,
  collapsedExtra,
  className,
}: SidebarShellProps) {
  // Collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(isCollapsed));
  }, [isCollapsed, storageKey]);

  const handleToggle = () => setIsCollapsed(!isCollapsed);

  const PrimaryIcon = primaryAction.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-16" : "w-[272px]",
        isCollapsed
          ? "my-3 ml-2 rounded-2xl border border-border bg-card/90 backdrop-blur-xl"
          : "h-full rounded-2xl border-r border-border bg-background",
        className,
      )}
    >
      {/* ================================================================ */}
      {/* COLLAPSED — Icon rail with tooltips                              */}
      {/* ================================================================ */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-1 py-3 px-1">
          {/* Expand toggle */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleToggle}
                >
                  <PanelLeft className="size-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                <p>Expand Sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Primary action */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={primaryAction.onClick}
                >
                  <PrimaryIcon className="size-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                <p>{primaryAction.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Secondary action */}
          {secondaryAction && SecondaryIcon && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={secondaryAction.onClick}
                  >
                    <SecondaryIcon className="size-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                  <p>{secondaryAction.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Divider */}
          {(collapsedActions.length > 0 || collapsedExtra) && (
            <div className="w-6 h-px bg-border my-1" />
          )}

          {/* Extra collapsed actions */}
          {collapsedActions.map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <TooltipProvider key={i} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={action.onClick}
                    >
                      <ActionIcon className="size-[18px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                    <p>{action.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Extra collapsed content (e.g. history popover) */}
          {collapsedExtra}
        </div>
      )}

      {/* ================================================================ */}
      {/* EXPANDED — Header                                                */}
      {/* ================================================================ */}
      {!isCollapsed && (
        <div className="flex items-center gap-2 p-3 border-b border-border">
          {/* Collapse toggle */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                  onClick={handleToggle}
                >
                  <PanelLeftClose className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                <p>Collapse</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Primary action label */}
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-2 h-9 rounded-lg hover:bg-muted text-foreground/80 hover:text-foreground text-sm"
            onClick={primaryAction.onClick}
          >
            <PrimaryIcon className="size-4" />
            {primaryAction.label}
          </Button>

          {/* Search icon (if searchable) */}
          {searchable && onSearchChange && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => {/* Focus search input */}}
            >
              <Search className="size-4" />
            </Button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* EXPANDED — Search input                                          */}
      {/* ================================================================ */}
      {!isCollapsed && searchable && onSearchChange && (
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-muted/30 border-border h-9 text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* EXPANDED — Stats + Secondary action                              */}
      {/* ================================================================ */}
      {!isCollapsed && (statsLine || secondaryAction) && (
        <div className="px-4 py-3 border-b border-border space-y-3">
          {statsLine && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              {statsLine}
            </div>
          )}
          {secondaryAction && SecondaryIcon && (
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={secondaryAction.onClick}
            >
              <SecondaryIcon className="size-4" />
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Content area                                                     */}
      {/* ================================================================ */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          {children(isCollapsed)}
        </div>
      )}

      {/* ================================================================ */}
      {/* Footer hint                                                      */}
      {/* ================================================================ */}
      {!isCollapsed && footerHint && (
        <div className="p-4 mx-3 mb-3 rounded-xl bg-muted/30 border border-border shrink-0">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            {footerHint}
          </p>
        </div>
      )}
    </div>
  );
}
