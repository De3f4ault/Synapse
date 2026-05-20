/**
 * TTSSection - Text-to-Speech toggle and rate control
 */

import { MessageSquare } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface TTSSectionProps {
  enabled: boolean;
  rate: number;
  onEnabledChange: (enabled: boolean) => void;
  onRateChange: (rate: number) => void;
}

export function TTSSection({
  enabled,
  rate,
  onEnabledChange,
  onRateChange,
}: TTSSectionProps) {
  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>Text-to-Speech</span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          className="h-4 w-7"
        />
      </div>
      {enabled && (
        <div className="grid grid-cols-[1fr,3fr] gap-3 items-center">
          <span className="text-xs text-muted-foreground">{rate.toFixed(1)}x</span>
          <Slider
            value={[rate]}
            min={0.5}
            max={2}
            step={0.1}
            onValueChange={(val) => onRateChange(val[0] ?? 1)}
            className="[&_.absolute]:bg-accent-olive"
          />
        </div>
      )}
    </div>
  );
}
