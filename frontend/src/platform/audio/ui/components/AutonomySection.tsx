/**
 * AutonomySection - Autonomy toggle with description
 */

import { Switch } from "@/components/ui/switch";

interface AutonomySectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function AutonomySection({
  enabled,
  onEnabledChange,
}: AutonomySectionProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Autonomy</span>
        <span className="text-[10px] text-muted-foreground">Audio adapts to context</span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onEnabledChange}
        className="h-4 w-7"
      />
    </div>
  );
}
