/**
 * Header - Synapse Command Deck (Unified Aesthetic)
 *
 * - Matches Chat Page "Pill" design
 * - Uses Theme Primary Colors
 * - Clean, floating layout
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BookOpen,
  FileText,
  FileQuestion,
  MessageSquare,
  FileStack,
  Atom,
  // Bell,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Search,
  Grid,
  X,
  Plus,
  CreditCard,
  ClipboardList,
  Upload,
  Share2,
  StickyNote,
  Files,
  Loader2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { useWebSocket } from "@/api/websocket/hooks/useWebSocket";
import { useCmdKSearch } from "@/api/unified-search";
import { AudioTrigger } from "@/platform/audio";
import { NotificationCenter } from "@/components/layout/NotificationCenter";

interface HeaderProps {
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Flashcards", href: "/flashcards", icon: BookOpen },
  { label: "Notes", href: "/notes", icon: FileText },
  { label: "Docs", href: "/documents", icon: FileStack },
  { label: "Quizzes", href: "/quizzes", icon: FileQuestion },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Graph", href: "/knowledge", icon: Share2 },
];

const quickActions = [
  {
    label: "Create Deck",
    icon: CreditCard,
    href: "/flashcards",
    desc: "Flashcards",
  },
  { label: "Write Note", icon: BookOpen, href: "/notes", desc: "Knowledge" },
  { label: "Upload Doc", icon: Upload, href: "/documents", desc: "Resource" },
  {
    label: "Start Chat",
    icon: MessageSquare,
    href: "/chat",
    desc: "AI Session",
  },
  {
    label: "Create Quiz",
    icon: ClipboardList,
    href: "/quizzes",
    desc: "Assessment",
  },
];

export function Header({ className }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const launcherRef = useRef<HTMLDivElement>(null);

  // State Management
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { isConnected: wsConnected } = useWebSocket();

  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setControlPanelOpen(false);
    setLauncherOpen(false);
  }, [location.pathname]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        launcherRef.current &&
        !launcherRef.current.contains(event.target as Node)
      ) {
        setLauncherOpen(false);
      }
    };
    if (launcherOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [launcherOpen]);

  const handleLogout = () => {
    clearAuth();
    navigate("/auth/login");
  };

  const displayName = user?.full_name || "User";
  const displayEmail = user?.email || "user@synapse.ai";

  return (
    <>
      {/* Main Header Bar */}
      <motion.header
        className={cn(
          "h-20 flex items-center justify-between px-4 sm:px-6 z-40 relative pointer-events-none",
          className,
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        {/* 1. Brand + Mobile Launcher */}
        <div
          className="flex items-center gap-4 z-50 relative pointer-events-auto bg-black/20 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl"
          ref={launcherRef}
        >
          {/* Mobile Waffle Trigger */}
          <button
            onClick={() => setLauncherOpen(!launcherOpen)}
            className={cn(
              "lg:hidden p-2 rounded-full transition-all active:scale-95 border",
              launcherOpen
                ? "bg-primary/10 text-primary border-primary/20"
                : "hover:bg-white/5 text-slate-400 border-transparent",
            )}
          >
            {launcherOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Grid className="w-5 h-5" />
            )}
          </button>

          {/* Brand Identity */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-8 h-8 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 border-l-transparent"
              />
              <Atom className="w-5 h-5 text-cyan-400 relative z-10" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-sans text-lg text-white font-bold tracking-tight leading-none group-hover:text-cyan-400 transition-colors">
                SYNAPSE
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    wsConnected ? "bg-emerald-500" : "bg-red-500",
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-wider leading-none",
                    wsConnected ? "text-slate-400" : "text-red-400",
                  )}
                >
                  {wsConnected ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            </div>
          </button>

          {/* Mobile App Launcher with Inline Search */}
          <AnimatePresence>
            {launcherOpen && (
              <MobileLauncherWithSearch
                navItems={navItems}
                navigate={navigate}
                onClose={() => setLauncherOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* 2. Desktop Navigation Dock */}
        <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          <div
            className={cn(
              "flex items-center gap-1 p-1.5 rounded-full border border-white/10 transition-all duration-500 shadow-2xl",
              "bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/10",
            )}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);

              return (
                <TooltipProvider key={item.href} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(item.href)}
                        className={cn(
                          "relative px-5 py-3 rounded-full group transition-all duration-300",
                          isActive
                            ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            : "hover:bg-white/5 text-slate-400 hover:text-slate-200",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {isActive && <span className="sr-only">(Active)</span>}
                        {item.badge && (
                          <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="text-xs font-medium bg-black/90 border-white/10 text-white"
                    >
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </nav>

        {/* 3. Right Actions */}
        <div className="flex items-center gap-3 z-50 pointer-events-auto bg-black/20 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl">
          {/* Inline Search */}
          <DesktopInlineSearch navigate={navigate} />

          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-white/10 hover:text-cyan-400 text-slate-400"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 bg-[#0a0a0f]/95 border-white/10 backdrop-blur-3xl"
            >
              <DropdownMenuLabel className="text-xs font-medium text-slate-500 px-2 py-1.5 uppercase tracking-wider">
                Quick Create
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={() => navigate(action.href)}
                    className="gap-3 p-2 cursor-pointer focus:bg-white/5 focus:text-white group"
                  >
                    <div className="p-1.5 rounded-md bg-white/5 text-slate-400 group-focus:text-cyan-400 transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-300 group-focus:text-white">
                        {action.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {action.desc}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Focus Audio Trigger */}
          <AudioTrigger />

          {/* Notifications */}
          <NotificationCenter />

          {/* User Avatar - Control Panel Trigger */}
          <button
            onClick={() => setControlPanelOpen(true)}
            className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <User className="w-4 h-4" />
            </div>
          </button>
        </div>
      </motion.header>

      {/* Control Panel Slide-out */}
      <AnimatePresence>
        {controlPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setControlPanelOpen(false)}
              className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-80 bg-card border-l border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="h-20 flex items-center justify-between px-6 border-b border-border bg-muted/20">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    Control Center
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    System settings & profile
                  </p>
                </div>
                <button
                  onClick={() => setControlPanelOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* User Profile */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-bold">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {displayEmail}
                  </p>
                </div>

                <div className="space-y-1">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={toggleTheme}
                  >
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                    Theme: {theme === "dark" ? "Dark" : "Light"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-muted/20">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile Launcher with Inline Search
// =============================================================================

interface MobileLauncherProps {
  navItems: NavItem[];
  navigate: (path: string) => void;
  onClose: () => void;
}

function MobileLauncherWithSearch({ navItems, navigate, onClose }: MobileLauncherProps) {
  const [mobileSearch, setMobileSearch] = useState("");

  // Use the unified search API
  const {
    navigationResults,
    diagnosticResults,
    isLoading,
  } = useCmdKSearch(mobileSearch, mobileSearch.length >= 2);

  const hasResults = navigationResults.length > 0 || diagnosticResults.length > 0;

  const handleResultClick = (href: string) => {
    onClose();
    navigate(href);
  };

  // Map entity type to icon
  const getIcon = (type: string) => {
    switch (type) {
      case "note":
        return <StickyNote className="w-4 h-4" />;
      case "document":
        return <Files className="w-4 h-4" />;
      case "flashcard":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  // Map entity to href
  const getHref = (result: typeof navigationResults[0]) => {
    const type = result.id.type;
    const id = result.id.id;
    switch (type) {
      case "note":
        return `/notes/${id}`;
      case "document":
        return `/documents/${id}`;
      case "flashcard":
        return result.url || "/flashcards";
      default:
        return "/";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute top-16 left-0 w-[300px] bg-[#0a0a0f]/95 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-3xl max-h-[70vh] flex flex-col"
    >
      {/* Search Input */}
      <div className="p-3 border-b border-white/5 flex-shrink-0">
        <div className="relative">
          {isLoading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          )}
          <input
            type="text"
            placeholder="Search everything..."
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            className="w-full bg-white/5 rounded-md py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all border border-transparent focus:border-cyan-500/20"
            autoFocus
          />
        </div>
      </div>

      {/* Search Results (when searching) */}
      {mobileSearch.length >= 2 && hasResults && (
        <div className="flex-1 overflow-y-auto max-h-[200px] border-b border-white/5">
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Results
            </div>
            {navigationResults.slice(0, 5).map((result) => (
              <button
                key={`${result.id.type}-${result.id.id}`}
                onClick={() => handleResultClick(getHref(result))}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="p-1.5 rounded-md bg-white/5 text-slate-400">
                  {getIcon(result.id.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {result.title}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {result.id.type} • {result.snippet?.slice(0, 50)}...
                  </div>
                </div>
              </button>
            ))}
            {diagnosticResults.slice(0, 3).map((result) => (
              <button
                key={`diag-${result.id.id}`}
                onClick={() => handleResultClick(`/study?focus=${result.id.id}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {result.title}
                  </div>
                  <div className="text-[10px] text-amber-400/80">
                    Learning insight
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {mobileSearch.length >= 2 && !hasResults && !isLoading && (
        <div className="p-4 text-center text-sm text-slate-500 border-b border-white/5">
          No results for "{mobileSearch}"
        </div>
      )}

      {/* App Grid */}
      <div className="p-3 grid grid-cols-3 gap-2 flex-shrink-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => handleResultClick(item.href)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors border border-white/5 group-hover:border-cyan-500/30">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Desktop Inline Search with Dropdown Results
// =============================================================================

interface DesktopInlineSearchProps {
  navigate: (path: string) => void;
}

function DesktopInlineSearch({ navigate }: DesktopInlineSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search hook
  const {
    navigationResults,
    diagnosticResults,
    isLoading,
  } = useCmdKSearch(query, query.length >= 2);

  const hasResults = navigationResults.length > 0 || diagnosticResults.length > 0;

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setQuery("");
      }
    };
    if (isExpanded) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // ESC to close
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsExpanded(false);
      setQuery("");
    }
  };

  const handleResultClick = (href: string) => {
    setIsExpanded(false);
    setQuery("");
    navigate(href);
  };

  // Map entity type to icon
  const getIcon = (type: string) => {
    switch (type) {
      case "note":
        return <StickyNote className="w-3.5 h-3.5" />;
      case "document":
        return <Files className="w-3.5 h-3.5" />;
      case "flashcard":
        return <BookOpen className="w-3.5 h-3.5" />;
      default:
        return <Search className="w-3.5 h-3.5" />;
    }
  };

  // Map entity to href
  const getHref = (result: typeof navigationResults[0]) => {
    const type = result.id.type;
    const id = result.id.id;
    switch (type) {
      case "note":
        return `/notes/${id}`;
      case "document":
        return `/documents/${id}`;
      case "flashcard":
        return result.url || "/flashcards";
      default:
        return "/";
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      {/* Collapsed State - Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center bg-white/5 border border-transparent rounded-full px-3 py-1.5 hover:bg-white/10 transition-all cursor-text group"
        >
          <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 mr-2" />
          <span className="text-xs text-slate-500 group-hover:text-slate-300 font-medium mr-2">
            Search
          </span>
          <kbd className="text-[9px] font-mono bg-black/40 px-1.5 rounded border border-white/10 text-slate-500">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Expanded State - Input with Dropdown */}
      {isExpanded && (
        <div className="relative">
          {/* Input */}
          <div className="flex items-center bg-white/10 border border-cyan-500/30 rounded-full px-3 py-1.5 min-w-[280px]">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin mr-2" />
            ) : (
              <Search className="w-3.5 h-3.5 text-cyan-400 mr-2" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search everything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none flex-1"
            />
            <button
              onClick={() => { setIsExpanded(false); setQuery(""); }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Dropdown Results */}
          {query.length >= 2 && (
            <div className="absolute top-full mt-2 right-0 w-[320px] bg-[#0a0a0f]/95 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-3xl max-h-[400px] overflow-y-auto">
              {isLoading && (
                <div className="p-4 text-center text-sm text-slate-500">
                  Searching...
                </div>
              )}

              {!isLoading && hasResults && (
                <div className="p-2">
                  {/* Navigation Results */}
                  {navigationResults.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Content
                      </div>
                      {navigationResults.slice(0, 6).map((result) => (
                        <button
                          key={`${result.id.type}-${result.id.id}`}
                          onClick={() => handleResultClick(getHref(result))}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="p-1.5 rounded-md bg-white/5 text-slate-400">
                            {getIcon(result.id.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {result.title}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {result.id.type}
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Diagnostic Results */}
                  {diagnosticResults.length > 0 && (
                    <>
                      <div className="px-2 py-1 mt-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Learning Insights
                      </div>
                      {diagnosticResults.slice(0, 3).map((result) => (
                        <button
                          key={`diag-${result.id.id}`}
                          onClick={() => handleResultClick(`/study?focus=${result.id.id}`)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                            <Brain className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {result.title}
                            </div>
                            <div className="text-[10px] text-amber-400/80">
                              {result.signals.is_weak_area ? "Weak area" : "Concept"}
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {!isLoading && !hasResults && query.length >= 2 && (
                <div className="p-4 text-center text-sm text-slate-500">
                  No results for "{query}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
