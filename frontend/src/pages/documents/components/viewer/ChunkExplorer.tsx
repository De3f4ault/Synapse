import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChunkMetadata } from "../../types/documents.types";

interface ChunkExplorerProps {
  chunks: ChunkMetadata[];
  documentId: number;
}

/**
 * Explore document chunks and their embeddings
 */
export const ChunkExplorer: React.FC<ChunkExplorerProps> = ({
  chunks,
  documentId,
}) => {
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  const toggleChunk = (id: number) => {
    setExpandedChunk(expandedChunk === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText size={18} className="text-cyan-400" />
          Document Chunks
        </h3>
        <Badge
          variant="outline"
          className="bg-cyan-950/30 text-cyan-400 border-cyan-500/30"
        >
          {chunks.length} chunks
        </Badge>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {chunks.map((chunk, index) => (
            <Card
              key={chunk.id}
              className="bg-white/5 border-white/10 overflow-hidden"
            >
              <CardHeader
                className="cursor-pointer hover:bg-white/5 transition-colors p-4"
                onClick={() => toggleChunk(chunk.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedChunk === chunk.id ? (
                      <ChevronDown size={16} className="text-cyan-400" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    )}
                    <CardTitle className="text-sm font-mono text-slate-300">
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
                      <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-slate-300 font-mono leading-relaxed">
                          {chunk.content}
                        </p>
                      </div>

                      {chunk.embedding && (
                        <div className="mt-3 text-[10px] text-slate-500">
                          Embedding: {chunk.embedding.length} dimensions
                        </div>
                      )}

                      {chunk.metadata && (
                        <div className="mt-3 space-y-1">
                          <div className="text-[10px] text-cyan-400 uppercase tracking-wider">
                            Metadata
                          </div>
                          <div className="bg-black/40 rounded p-2 text-xs text-slate-400 font-mono">
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
