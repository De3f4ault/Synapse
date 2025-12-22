import React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  getRootProps: any;
  getInputProps: any;
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
        "flex items-center gap-3 synapse-surface hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer border-dashed",
        isDragActive ? "border-cyan-500 bg-cyan-500/10" : "border-white/10",
      )}
    >
      <input {...getInputProps()} />
      <Upload className="text-cyan-400 w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-sm text-slate-300 font-mono uppercase">
        {isDragActive ? "Drop files here..." : "Click or drag files to upload"}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="text-[10px] text-slate-400 hover:text-white px-2"
      >
        CANCEL
      </button>
    </div>
  );
};
