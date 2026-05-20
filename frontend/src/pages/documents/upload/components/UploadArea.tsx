import React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
    getRootProps: () => Record<string, unknown>;
    getInputProps: () => Record<string, unknown>;
    isDragActive: boolean;
    onCancel: () => void;
}

/**
 * Drag and drop upload area
 */
export const UploadArea: React.FC<UploadAreaProps> = ({
    getRootProps,
    getInputProps,
    isDragActive,
    onCancel,
}) => {
    return (
        <div
            {...getRootProps()}
            className={cn(
                "flex items-center gap-3 synapse-surface hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer border-dashed",
                isDragActive ? "border-primary bg-primary/10" : "border-border",
            )}
        >
            <input {...getInputProps()} />
            <Upload className="text-primary w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-sm text-foreground/80 font-mono uppercase">
                {isDragActive ? "Drop files here..." : "Click or drag files to upload"}
            </span>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2"
            >
                CANCEL
            </button>
        </div>
    );
};
