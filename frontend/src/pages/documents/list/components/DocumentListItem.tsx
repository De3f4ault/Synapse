import React from "react";
import { Loader2, ScanLine } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { GlassCard } from "@/shared/ui";
import type { EnhancedDocument } from "../../core";

interface DocumentListItemProps {
    doc: EnhancedDocument;
    index: number;
    onSelect: (doc: EnhancedDocument) => void;
    onDelete?: () => void;
    logAction: (msg: string) => void;
}

/**
 * FileIcon Component - Simple file type icon
 */
const FileIcon: React.FC<{ type: string; className?: string }> = ({
    type: _type,
    className,
}) => {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
};

/**
 * DocumentListItem - Paperless-style Card with Thumbnail Preview
 * 
 * This is the list-view/action-heavy variant for document displays.
 * For the hub/grid visual identity, use DocumentCard from modules/documents.
 */
export const DocumentListItem = React.forwardRef<HTMLDivElement, DocumentListItemProps>(
    ({ doc, index: _index, onSelect, logAction }, ref) => {
        const [imgError, setImgError] = React.useState(false);
        const token = useAuthStore((state) => state.token);

        // Native browser lazy-loading via dedicated endpoint
        const imgSrc = `/api/v1/documents/${doc.id}/thumb?token=${token}`;

        return (
            <GlassCard
                ref={ref}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                hover
                onClick={() => {
                    onSelect(doc);
                    logAction(`OPEN: ${doc.filename}`);
                }}
                className="group w-full aspect-[3/4] flex flex-col"
            >
                {/* Thumbnail Area */}
                <div className="flex-1 w-full relative bg-muted/30 overflow-hidden">
                    {!imgError &&
                        (doc.type === "pdf" ||
                            ["jpg", "png", "jpeg", "webp"].includes(doc.type)) ? (
                        <div className="w-full h-full relative">
                            {/* Main Thumbnail */}
                            <img
                                src={imgSrc}
                                alt={doc.filename}
                                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                onError={() => setImgError(true)}
                                loading="lazy"
                            />
                            {/* Gradient Overlay for text readability if needed (though footer covers it) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center p-8 bg-muted/10 group-hover:bg-muted/20 transition-colors">
                            <FileIcon
                                type={doc.type}
                                className="w-16 h-16 text-muted-foreground/50 group-hover:text-primary/70 transition-colors"
                            />
                        </div>
                    )}

                    {/* Status Badge (Absolute Top Right) */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {doc.processing_status === "processing" && (
                            <span className="bg-warning/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 animate-pulse">
                                <Loader2 size={10} className="animate-spin" /> PROC
                            </span>
                        )}
                        {doc.ocr_performed && (
                            <span
                                className="bg-accent-olive/90 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1"
                                title="OCR Text Available"
                            >
                                <ScanLine size={10} /> OCR
                            </span>
                        )}
                    </div>
                </div>

                {/* Footer Area */}
                <div className="h-auto min-h-[80px] bg-background/70 backdrop-blur-md p-3 border-t border-border flex flex-col justify-between relative z-10">
                    <div className="space-y-1">
                        <h3
                            className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors"
                            title={doc.filename}
                        >
                            {doc.filename}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="uppercase tracking-wider">{doc.type}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-secondary font-medium">
                            {doc.sector}
                        </span>

                        {/* Hover Action Indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0 duration-300">
                            <div className="p-1 rounded-full bg-primary/10 text-primary">
                                <ScanLine size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>
        );
    },
);

DocumentListItem.displayName = "DocumentListItem";
