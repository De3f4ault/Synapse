import React from "react";
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProcessingStatusProps {
  status: string;
  progress?: number;
  message?: string;
}

/**
 * Display document processing status with visual indicators
 */
export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  progress,
  message,
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bgColor: "bg-emerald-950/30",
          borderColor: "border-emerald-500/30",
          label: "Completed",
        };
      case "processing":
        return {
          icon: Loader2,
          color: "text-amber-400",
          bgColor: "bg-amber-950/30",
          borderColor: "border-amber-500/30",
          label: "Processing",
          animate: true,
        };
      case "failed":
        return {
          icon: AlertCircle,
          color: "text-red-400",
          bgColor: "bg-red-950/30",
          borderColor: "border-red-500/30",
          label: "Failed",
        };
      default:
        return {
          icon: Clock,
          color: "text-slate-400",
          bgColor: "bg-slate-950/30",
          borderColor: "border-slate-500/30",
          label: "Pending",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <Badge
        variant="outline"
        className={cn(
          "px-3 py-1.5",
          config.bgColor,
          config.borderColor,
          config.color,
        )}
      >
        <Icon size={14} className={cn(config.animate && "animate-spin")} />
        <span className="ml-2">{config.label}</span>
      </Badge>

      {status === "processing" && progress !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {message && <p className="text-xs text-slate-400 font-mono">{message}</p>}
    </div>
  );
};
