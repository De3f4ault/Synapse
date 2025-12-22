import { CheckCircle2 } from "lucide-react";

/**
 * QueueEmpty - "System Idle" State
 */
export function QueueEmpty() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-60">
      <div className="p-4 rounded-full bg-emerald-500/5 border border-emerald-500/10 mb-4 animate-pulse-soft">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
        System Idle
      </h3>
      <p className="text-xs text-slate-500 mt-2 font-mono max-w-[200px]">
        All protocols completed. No pending actions in queue.
      </p>
    </div>
  );
}
