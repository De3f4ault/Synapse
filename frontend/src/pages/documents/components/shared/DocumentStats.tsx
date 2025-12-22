import React from "react";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DocumentResponse } from "@/api/generated";

interface DocumentStatsProps {
  documents: DocumentResponse[];
}

/**
 * Display aggregate statistics about documents
 */
export const DocumentStats: React.FC<DocumentStatsProps> = ({ documents }) => {
  const stats = {
    total: documents.length,
    completed: documents.filter((d) => d.processing_status === "completed")
      .length,
    processing: documents.filter((d) => d.processing_status === "processing")
      .length,
    failed: documents.filter((d) => d.processing_status === "failed").length,
    totalSize: documents.reduce((sum, doc) => sum + doc.file_size, 0),
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const statCards = [
    {
      label: "Total Documents",
      value: stats.total,
      icon: FileText,
      color: "text-cyan-400",
      bgColor: "bg-cyan-950/30",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-950/30",
    },
    {
      label: "Processing",
      value: stats.processing,
      icon: Loader2,
      color: "text-amber-400",
      bgColor: "bg-amber-950/30",
    },
    {
      label: "Failed",
      value: stats.failed,
      icon: AlertCircle,
      color: "text-red-400",
      bgColor: "bg-red-950/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="bg-white/5 border-white/10 overflow-hidden"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon size={20} className={stat.color} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Storage Used</span>
            <span className="text-lg font-bold text-white font-mono">
              {formatBytes(stats.totalSize)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
