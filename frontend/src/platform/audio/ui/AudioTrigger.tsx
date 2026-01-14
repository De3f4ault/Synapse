
import { useState, useRef, useEffect } from "react";
import { Headphones } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AudioPlayerPopover } from "./AudioPlayerPopover";
import { useAudioUIStore } from "../store/useAudioUIStore";
import { useSmartFlow } from "../hooks/useSmartFlow";

export function AudioTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { playIntent } = useAudioUIStore();

  // Activate Smart Flow (Auto-Ducking)
  useSmartFlow();

  // Close on Outside Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            "relative group p-2 rounded-full transition-colors",
            isOpen ? "bg-white/10 text-cyan-400" : "hover:bg-white/10 hover:text-cyan-400 text-slate-400",
            playIntent && !isOpen && "text-cyan-500" // Active state indication
        )}
      >
        <Headphones className="w-5 h-5" />
        {playIntent && (
            <span className="absolute top-2.5 right-2 min-w-[6px] min-h-[6px] bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && <AudioPlayerPopover onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

