import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChunkMetadata } from "../../core";

interface ChunkExplorerProps {
  chunks: ChunkMetadata[];
}

/**
 * Explore document chunks and their embeddings
 */
export const ChunkExplorer: React.FC<ChunkExplorerProps> = ({
  chunks,
}) => {
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  const toggleChunk = (id: number) => {
    setExpandedChunk(expandedChunk === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          Document Chunks
        </h3>
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/30"
        >
          {chunks.length} chunks
        </Badge>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {chunks.map((chunk, index) => (
            <Card
              key={chunk.id}
              className="bg-foreground/5 border-border overflow-hidden"
            >
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
                onClick={() => toggleChunk(chunk.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedChunk === chunk.id ? (
                      <ChevronDown size={16} className="text-primary" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm font-mono text-foreground/80">
                      Chunk #{index + 1}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {chunk.content.length} chars
                  </Badge>
                </div>
              </CardHeader>

              <AnimatePresence>
                {expandedChunk === chunk.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="bg-background/70 rounded-lg p-3 border border-border">
                        <p className="text-xs text-foreground/80 font-mono leading-relaxed">
                          {chunk.content}
                        </p>
                      </div>

                      {chunk.embedding && (
                        <div className="mt-3 text-[10px] text-muted-foreground">
                          Embedding: {chunk.embedding.length} dimensions
                        </div>
                      )}

                      {chunk.metadata && (
                        <div className="mt-3 space-y-1">
                          <div className="text-[10px] text-primary uppercase tracking-wider">
                            Metadata
                          </div>
                          <div className="bg-background/70 rounded p-2 text-xs text-muted-foreground font-mono">
                            {JSON.stringify(chunk.metadata, null, 2)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
