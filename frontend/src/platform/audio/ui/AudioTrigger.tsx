/**
 * AudioTrigger - Header Button + Dropdown Command Bar
 * 
 * The button toggles visibility of the AudioCommandBar as a dropdown
 * anchored below the headphones icon.
 */

import { useRef, useEffect } from "react";
import { Headphones } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AudioCommandBar } from "./command-bar";
import { useAudioUIStore } from "../store/useAudioUIStore";
import { useSmartFlow } from "../hooks/useSmartFlow";

export function AudioTrigger() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { playIntent, commandBarVisible, toggleCommandBar, setCommandBarVisible } = useAudioUIStore();

  // Activate Smart Flow (Auto-Ducking)
  useSmartFlow();

  // Click outside to close
  useEffect(() => {
    if (!commandBarVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCommandBarVisible(false);
      }
    };

    // Delay to prevent immediate close on the toggle click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [commandBarVisible, setCommandBarVisible]);

  return (
    <div ref={containerRef} className="relative">
      {/* Header Button */}
      <button 
        onClick={toggleCommandBar}
        className={cn(
          "relative group p-2 rounded-full transition-colors",
          commandBarVisible 
            ? "bg-foreground/10 text-primary" 
            : "hover:bg-muted hover:text-primary text-muted-foreground",
          playIntent && !commandBarVisible && "text-primary"
        )}
        title={commandBarVisible ? "Hide Audio Controls" : "Show Audio Controls"}
      >
        <Headphones className="w-5 h-5" />
        {playIntent && (
          <span className="absolute top-2.5 right-2 min-w-[6px] min-h-[6px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        )}
      </button>

      {/* Dropdown Command Bar */}
      <AnimatePresence>
        {commandBarVisible && <AudioCommandBar />}
      </AnimatePresence>
    </div>
  );
}
