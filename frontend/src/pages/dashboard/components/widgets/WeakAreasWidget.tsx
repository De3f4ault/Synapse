import React from "react";
import { NeumorphicCard } from "@/components/neumorphic";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import type { WeakArea } from "@/api/generated";

interface WeakAreasWidgetProps {
  data: WeakArea[];
}

export const WeakAreasWidget: React.FC<WeakAreasWidgetProps> = ({ data }) => {
  return (
    <NeumorphicCard className="col-span-2 p-6 flex flex-col h-[380px]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-red-400">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Focus Areas</h3>
          <p className="text-xs text-slate-500">Suggested improvements</p>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto scrollbar-hide space-y-5 pr-2">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl nm-inset flex items-center justify-center mb-4 text-emerald-400/60">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-emerald-400 font-medium mb-1">
              No weak areas detected
            </p>
            <p className="text-xs text-slate-500">
              Complete study sessions to track areas that need focus
            </p>
          </div>
        ) : (
          data.slice(0, 5).map((area) => (
            <div key={area.topic} className="space-y-2 group">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                  {area.topic}
                </span>
                <span className="text-red-400 font-bold font-mono">
                  {(area.accuracy * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-500"
                  style={{ width: `${area.accuracy * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </NeumorphicCard>
  );
};
