import { motion } from "framer-motion";
import { FileText, Book, Image as ImageIcon, MoreVertical, File } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import type { EnhancedDocument } from "../core/types";

interface DocumentCardProps {
    document: EnhancedDocument;
    onClick?: () => void;
    thumbnailUrl?: string | null;
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
            return "text-red-400 bg-red-500/10 border-red-500/20";
        case "epub":
            return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        case "jpg":
        case "png":
            return "text-purple-400 bg-purple-500/10 border-purple-500/20";
        case "md":
            return "text-blue-400 bg-blue-500/10 border-blue-500/20";
        default:
            return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
};

export const DocumentCard = ({ document, onClick, thumbnailUrl }: DocumentCardProps) => {
    // using document.type created by the hook
    const Icon = getDocumentIcon(document.type || "unknown");
    const colorClass = getFormatColor(document.type || "unknown");

    // Prefer passed thumbnail url (from batch API), fallback to document property if any
    const finalThumbnail = thumbnailUrl || document.thumbnail_url;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{
                scale: 1.02,
                rotateX: 2,
                rotateY: 2,
                z: 10,
                transition: { type: "spring", stiffness: 300 }
            }}
            className="group perspective-1000"
        >
            <div onClick={onClick} className="cursor-pointer h-full relative preserve-3d">
                <GlassCard
                    className="h-[280px] flex flex-col p-0 overflow-hidden relative border-white/5 hover:border-cyan-500/30 transition-colors"
                    hover
                >
                    {/* Cover Preview Area */}
                    <div className={cn(
                        "flex-1 flex items-center justify-center relative overflow-hidden",
                        "bg-gradient-to-br from-white/[0.02] to-white/[0.05]"
                    )}>
                        {/* Abstract Background Pattern - visible only if no thumbnail */}
                        {!finalThumbnail && (
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/40 via-transparent to-transparent" />
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
                                className={cn("p-4 rounded-2xl border backdrop-blur-md shadow-2xl", colorClass)}
                                whileHover={{ scale: 1.1, rotate: -5 }}
                            >
                                <Icon size={48} strokeWidth={1.5} />
                            </motion.div>
                        )}

                        {/* Status Indicator */}
                        {document.status === "processing" && (
                            <div className="absolute top-3 right-3 z-10">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Content Footer */}
                    <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10 z-10 relative">
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition-colors" title={document.filename}>
                                    {document.filename}
                                </h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className={cn(
                                        "text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border",
                                        colorClass,
                                        finalThumbnail ? "bg-black/50 border-white/20" : ""
                                    )}>
                                        {document.type}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate">
                                        {document.size}
                                    </span>
                                </div>
                            </div>

                            <button className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </motion.div>
    );
};
