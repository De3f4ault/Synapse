/**
 * CrateSection - Track list with drag-drop support
 */

import { Music, CloudRain, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TrackMeta } from "../../persistence/AudioDatabase";

interface CrateSectionProps {
  tracks: TrackMeta[];
  activeTrackId: string | null;
  onPlayTrack: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
}

export function CrateSection({
  tracks,
  activeTrackId,
  onPlayTrack,
  onRemoveTrack,
}: CrateSectionProps) {
  return (
    <div className="flex-1 min-h-[150px] bg-black/20 border-t border-white/5 flex flex-col">
      <div className="p-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider flex justify-between items-center">
        <span>The Crate</span>
        <Upload className="h-3 w-3 text-slate-600" />
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-2 space-y-1">
          {tracks.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-xs text-slate-600 border-2 border-dashed border-white/5 rounded-lg m-2">
              Drag & Drop audio here
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer",
                  activeTrackId === track.id && "bg-cyan-500/10"
                )}
                onClick={() => onPlayTrack(track.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={cn(
                      "p-1.5 rounded bg-white/5 text-slate-400",
                      activeTrackId === track.id && "text-cyan-400"
                    )}
                  >
                    {track.category === "music" ? (
                      <Music className="h-3.5 w-3.5" />
                    ) : (
                      <CloudRain className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm truncate",
                      activeTrackId === track.id
                        ? "text-cyan-400 font-medium"
                        : "text-slate-300"
                    )}
                  >
                    {track.name}
                  </span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTrack(track.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
