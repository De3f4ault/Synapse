import { motion } from "framer-motion";
import { FileText, Book, Image as ImageIcon, MoreVertical, File } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import type { EnhancedDocument } from "../core/types";

interface DocumentCardProps {
    document: EnhancedDocument;
    onClick?: (e?: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    thumbnailUrl?: string | null;
    /** Enable drag-to-folder functionality */
    draggable?: boolean;
    isSelected?: boolean;
}

const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case "pdf":
            return Book;
        case "epub":
            return Book;
        case "jpg":
        case "png":
        case "jpeg":
            return ImageIcon;
        case "txt":
        case "md":
        case "docx":
            return FileText;
        default:
            return File;
    }
};

const getFormatColor = (type: string) => {
    switch (type.toLowerCase()) {
        case "pdf":
            return "text-destructive bg-destructive/10 border-destructive/20";
        case "epub":
            return "text-warning bg-warning/10 border-warning/20";
        case "jpg":
        case "png":
            return "text-accent bg-accent/10 border-accent/20";
        case "md":
            return "text-info bg-info/10 border-blue-500/20";
        default:
            return "text-muted-foreground bg-slate-500/10 border-border/20";
    }
};

export const DocumentCard = ({ document, onClick, onContextMenu, thumbnailUrl, draggable = true, isSelected }: DocumentCardProps) => {
    // useDraggable for drag-to-folder
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `doc-${document.id}`,
        data: { type: 'document', document },
        disabled: !draggable,
    });

    // using document.type created by the hook
    const Icon = getDocumentIcon(document.type || "unknown");
    const colorClass = getFormatColor(document.type || "unknown");

    // Prefer passed thumbnail url (from batch API), fallback to document property if any
    const finalThumbnail = thumbnailUrl || document.thumbnail_url;

    return (
        <motion.div
            ref={setNodeRef}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 1.05 : 1 }}
            whileHover={!isDragging ? {
                scale: 1.02,
                rotateX: 2,
                rotateY: 2,
                z: 10,
                transition: { type: "spring", stiffness: 300 }
            } : undefined}
            className={cn("group perspective-1000", isDragging && "z-50")}
            {...attributes}
            {...listeners}
        >
            <div onClick={onClick} onContextMenu={onContextMenu} className="cursor-pointer h-full relative preserve-3d">
                <GlassCard
                    className="h-[280px] p-0 overflow-hidden relative border-border hover:border-primary/30 transition-colors"
                    hover
                >
                    {/* Flex container INSIDE GlassCard to properly handle layout */}
                    <div className="h-full flex flex-col">
                        {/* Cover Preview Area - TOP (flex-1 to fill available space) */}
                        <div className={cn(
                            "flex-1 flex items-center justify-center relative overflow-hidden min-h-0",
                            "bg-gradient-to-br from-white/[0.02] to-white/[0.05]"
                        )}>
                            {/* Abstract Background Pattern - visible only if no thumbnail */}
                            {!finalThumbnail && (
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent" />
                            )}

                            {/* Thumbnail or Icon */}
                            {finalThumbnail ? (
                                <div className="absolute inset-0">
                                    <img
                                        src={finalThumbnail}
                                        alt={document.filename}
                                        className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                            ) : (
                                <motion.div
                                    className={cn(
                                        "p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all", 
                                        colorClass,
                                        // Selected State overrides
                                        isSelected ? "ring-2 ring-primary bg-primary/20" : ""
                                    )}
                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                >
                                    <Icon size={48} strokeWidth={1.5} />
                                </motion.div>
                            )}

                            {/* Status Indicator — show for all in-progress pipeline states */}
                            {["parsing", "parsed", "chunking", "pending"].includes(document.processing_status ?? "") && (
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Content Footer - BOTTOM (fixed height) */}
                        <div className="shrink-0 p-4 bg-background/70 backdrop-blur-md border-t border-border z-10 relative">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-foreground/70 truncate group-hover:text-primary transition-colors" title={document.filename}>
                                        {document.filename}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={cn(
                                            "text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border",
                                            colorClass,
                                            finalThumbnail ? "bg-black/50 border-border" : ""
                                        )}>
                                            {document.type}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {document.size}
                                        </span>
                                    </div>
                                </div>

                                <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </motion.div>
    );
};
