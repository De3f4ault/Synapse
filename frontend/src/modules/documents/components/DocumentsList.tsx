import { motion } from "framer-motion";
import { FileText, Download, Share2, Trash2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import type { EnhancedDocument } from "../core/types";
import { format } from "date-fns";

interface DocumentsListProps {
    documents: EnhancedDocument[];
}

export const DocumentsList = ({ documents }: DocumentsListProps) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
        >
            <GlassCard className="overflow-hidden border-white/5">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="text-left py-4 px-6 text-xs font-mono text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="text-left py-4 px-6 text-xs font-mono text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="text-left py-4 px-6 text-xs font-mono text-slate-500 uppercase tracking-wider">Size</th>
                            <th className="text-left py-4 px-6 text-xs font-mono text-slate-500 uppercase tracking-wider">Date Modified</th>
                            <th className="text-right py-4 px-6 text-xs font-mono text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc, i) => (
                            <motion.tr
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="group hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-none"
                            >
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                                {doc.filename}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-xs font-mono text-slate-400 uppercase bg-white/5 px-2 py-1 rounded border border-white/5">
                                        {doc.type}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-sm text-slate-500 font-mono">
                                        {doc.size}
                                    </span>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-sm text-slate-500">
                                        {doc.updated_at ? format(new Date(doc.updated_at), "MMM d, yyyy") : "-"}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                            <Download size={16} />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                            <Share2 size={16} />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </GlassCard>
        </motion.div>
    );
};
