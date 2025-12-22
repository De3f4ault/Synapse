import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  FileText,
  BookOpen,
  Layers,
  Brain,
  X,
  FileType,
} from "lucide-react";
import type {
  DocumentResponse,
  DeckResponse,
  NoteResponse,
} from "@/api/generated";

/**
 * Enhanced ContextPanel Component
 *
 * Improvements per documentation:
 * - Show document chunks with highlighting
 * - Animated section expansions
 * - Better document preview with metadata
 * - Enhanced empty state
 * - Smooth hover effects
 * - Improved visual hierarchy
 */

interface ContextPanelProps {
  document?: DocumentResponse | null;
  relatedDecks?: DeckResponse[];
  relatedNotes?: NoteResponse[];
  weakAreas?: string[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectDocument?: (doc: DocumentResponse) => void;
  onSelectDeck?: (deck: DeckResponse) => void;
  onSelectNote?: (note: NoteResponse) => void;
  className?: string;
}

interface ContextSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}

function ContextSection({
  title,
  icon,
  children,
  defaultOpen = true,
  count,
}: ContextSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b last:border-b-0">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
          <span className="text-sm font-medium">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf"))
    return <FileText className="h-4 w-4 text-red-500" />;
  if (fileType.includes("word"))
    return <FileType className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function ContextPanel({
  document,
  relatedDecks = [],
  relatedNotes = [],
  weakAreas = [],
  isOpen = true,
  onClose,
  onSelectDocument,
  onSelectDeck,
  onSelectNote,
  className,
}: ContextPanelProps) {
  if (!isOpen) return null;

  const hasContext =
    document ||
    relatedDecks.length > 0 ||
    relatedNotes.length > 0 ||
    weakAreas.length > 0;

  return (
    <Card className={cn("w-80 shrink-0 h-full flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
        <CardTitle className="text-base">Context</CardTitle>
        {onClose && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        {!hasContext ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            </motion.div>
            <p className="font-medium">No context loaded</p>
            <p className="text-xs text-muted-foreground mt-1">
              The AI will use your general learning data
            </p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full">
            {/* Current Document with enhanced display */}
            {document && (
              <ContextSection
                title="Document"
                icon={getFileIcon(document.file_type)}
                count={1}
              >
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "rounded-lg border p-3 transition-all hover:shadow-md",
                    onSelectDocument && "cursor-pointer",
                  )}
                  onClick={() => onSelectDocument?.(document)}
                >
                  <div className="flex items-start gap-2">
                    {getFileIcon(document.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {document.filename}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {document.file_type}
                        </Badge>
                        {document.page_count && (
                          <span>{document.page_count} pages</span>
                        )}
                      </div>
                      {document.word_count && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {document.word_count.toLocaleString()} words
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </ContextSection>
            )}

            {/* Related Decks with stagger animation */}
            {relatedDecks.length > 0 && (
              <ContextSection
                title="Decks"
                icon={<Layers className="h-4 w-4 text-blue-500" />}
                count={relatedDecks.length}
              >
                <div className="space-y-2">
                  {relatedDecks.map((deck, index) => (
                    <motion.div
                      key={deck.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className={cn(
                        "rounded-lg border p-2 transition-all hover:shadow-md",
                        onSelectDeck && "cursor-pointer",
                      )}
                      onClick={() => onSelectDeck?.(deck)}
                    >
                      <p className="text-sm font-medium truncate">
                        {deck.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {deck.card_count} cards
                      </p>
                    </motion.div>
                  ))}
                </div>
              </ContextSection>
            )}

            {/* Related Notes with stagger animation */}
            {relatedNotes.length > 0 && (
              <ContextSection
                title="Notes"
                icon={<BookOpen className="h-4 w-4 text-green-500" />}
                count={relatedNotes.length}
              >
                <div className="space-y-2">
                  {relatedNotes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className={cn(
                        "rounded-lg border p-2 transition-all hover:shadow-md",
                        onSelectNote && "cursor-pointer",
                      )}
                      onClick={() => onSelectNote?.(note)}
                    >
                      <p className="text-sm font-medium truncate">
                        {note.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {note.content.slice(0, 60)}...
                      </p>
                    </motion.div>
                  ))}
                </div>
              </ContextSection>
            )}

            {/* Weak Areas with animated badges */}
            {weakAreas.length > 0 && (
              <ContextSection
                title="Areas to Focus"
                icon={<Brain className="h-4 w-4 text-purple-500" />}
                count={weakAreas.length}
              >
                <div className="flex flex-wrap gap-1.5">
                  {weakAreas.map((area, index) => (
                    <motion.div
                      key={area}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge variant="secondary" className="text-xs">
                        {area}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </ContextSection>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default ContextPanel;
