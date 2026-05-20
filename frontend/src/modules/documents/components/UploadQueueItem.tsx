import { motion } from "framer-motion";
import { X, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadQueueItemProps {
    file: File;
    status: "uploading" | "success" | "error";
    progress?: number;
    error?: string;
    onRemove: () => void;
}

export function UploadQueueItem({
    file,
    status,
    progress = 0,
    error,
    onRemove,
}: UploadQueueItemProps) {
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                status === "error" && "border-destructive/50 bg-destructive/5",
                status === "success" && "border-green-500/50 bg-accent-olive/5",
                status === "uploading" && "border-primary/30 bg-primary/5"
            )}
        >
            {/* File Icon */}
            <div
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    status === "error" && "bg-destructive/10",
                    status === "success" && "bg-accent-olive/10",
                    status === "uploading" && "bg-primary/10"
                )}
            >
                <FileText
                    className={cn(
                        "h-5 w-5",
                        status === "error" && "text-destructive",
                        status === "success" && "text-accent-olive",
                        status === "uploading" && "text-primary"
                    )}
                />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                    {status === "uploading" && progress < 100 && (
                        <span className="ml-2">{Math.round(progress)}%</span>
                    )}
                    {error && (
                        <span className="ml-2 text-destructive">{error}</span>
                    )}
                </p>

                {/* Progress Bar */}
                {status === "uploading" && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                )}
            </div>

            {/* Status Icon / Remove Button */}
            <div className="flex items-center gap-2">
                {status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-accent-olive" />
                )}
                {status === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onRemove}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </motion.div>
    );
}

export default UploadQueueItem;
