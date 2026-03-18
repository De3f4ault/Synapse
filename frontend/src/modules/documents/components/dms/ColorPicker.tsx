/**
 * ColorPicker — Tag color selector
 *
 * Pre-defined palette + custom hex input.
 * Shows selected color as a filled circle with checkmark.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

// Paperless-ngx default palette — 18 colors
const PRESET_COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f",
  "#2ecc71", "#1abc9c", "#3498db",
  "#9b59b6", "#e91e63", "#795548",
  "#607d8b", "#34495e", "#c0392b",
  "#d35400", "#27ae60", "#16a085",
  "#2980b9", "#8e44ad", "#2c3e50",
];

/**
 * Auto-compute text color (black or white) based on background luminance.
 */
export function getContrastColor(hex: string): string {
  const rgb = hex.replace("#", "");
  const r = parseInt(rgb.substring(0, 2), 16);
  const g = parseInt(rgb.substring(2, 4), 16);
  const b = parseInt(rgb.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function ColorPicker({
  value,
  onChange,
  label = "Color",
  className,
}: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(value || "#3498db");

  const handleCustomChange = (hex: string) => {
    setCustomHex(hex);
    // Only apply if valid hex
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 h-9 px-3 rounded-md border border-white/10 bg-white/5",
              "hover:bg-white/10 transition-colors w-full text-left"
            )}
          >
            <span
              className="w-5 h-5 rounded-full border border-white/20 shrink-0"
              style={{ backgroundColor: value || "#3498db" }}
            />
            <span className="text-sm text-slate-300 font-mono">
              {value || "#3498db"}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-64 bg-card border-white/10"
          align="start"
        >
          {/* Preset grid */}
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setCustomHex(color);
                }}
                className={cn(
                  "w-8 h-8 rounded-lg border-2 transition-all",
                  "hover:scale-110 hover:shadow-lg",
                  value === color
                    ? "border-white shadow-md"
                    : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              >
                {value === color && (
                  <Check
                    size={14}
                    className="mx-auto"
                    style={{ color: getContrastColor(color) }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Custom hex */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <span
              className="w-8 h-8 rounded-lg border border-white/20 shrink-0"
              style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : "#333" }}
            />
            <Input
              value={customHex}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="#3498db"
              className="h-8 font-mono text-xs bg-white/5 border-white/10"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
