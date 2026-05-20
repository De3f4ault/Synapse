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
    <div className="flex-1 min-h-[150px] bg-background/50 border-t border-border flex flex-col">
      <div className="p-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between items-center">
        <span>The Crate</span>
        <Upload className="h-3 w-3 text-muted-foreground" />
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-2 space-y-1">
          {tracks.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg m-2">
              Drag & Drop audio here
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                  activeTrackId === track.id && "bg-primary/10"
                )}
                onClick={() => onPlayTrack(track.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={cn(
                      "p-1.5 rounded bg-foreground/5 text-muted-foreground",
                      activeTrackId === track.id && "text-primary"
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
                        ? "text-primary font-medium"
                        : "text-foreground/80"
                    )}
                  >
                    {track.name}
                  </span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
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
