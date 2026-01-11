import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Grid,
    List,
    Filter,
    Upload,
    X,
    FileText,
    Book
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentsDockProps {
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    onUpload: () => void;
}

export const DocumentsDock = ({
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onUpload
}: DocumentsDockProps) => {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    const toggleSearch = () => {
        setIsSearchExpanded(!isSearchExpanded);
        if (isSearchExpanded) onSearchChange("");
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                className={cn(
                    "flex items-center gap-2 p-2 rounded-2xl",
                    "bg-black/60 backdrop-blur-xl border border-white/10",
                    "shadow-2xl shadow-black/50"
                )}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Search Section */}
                <div className="flex items-center">
                    <AnimatePresence>
                        {isSearchExpanded && (
                            <motion.input
                                initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                animate={{ width: 200, opacity: 1, marginLeft: 8 }}
                                exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search docs..."
                                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 h-10"
                                autoFocus
                            />
                        )}
                    </AnimatePresence>
                    <button
                        onClick={toggleSearch}
                        className={cn(
                            "p-3 rounded-xl transition-all",
                            isSearchExpanded ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {isSearchExpanded ? <X size={20} /> : <Search size={20} />}
                    </button>
                </div>

                <div className="w-px h-8 bg-white/10 mx-1" />

                {/* Filters */}
                <div className="flex items-center gap-1">
                    {[
                        { id: "all", label: "All", icon: Filter },
                        { id: "pdf", label: "Books", icon: Book },
                        { id: "paper", label: "Papers", icon: FileText },
                    ].map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => onFilterChange(filter.id)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                                activeFilter === filter.id
                                    ? "bg-white/15 text-white shadow-lg"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <filter.icon size={16} />
                            {activeFilter === filter.id && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                >
                                    {filter.label}
                                </motion.span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 mx-1" />

                {/* View Toggle */}
                <div className="flex items-center bg-white/5 rounded-xl p-1">
                    <button
                        onClick={() => onViewChange("grid")}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === "grid" ? "bg-white/10 text-cyan-400 shadow-sm" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Grid size={18} />
                    </button>
                    <button
                        onClick={() => onViewChange("list")}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            viewMode === "list" ? "bg-white/10 text-cyan-400 shadow-sm" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <List size={18} />
                    </button>
                </div>

                {/* Upload Action */}
                <div className="ml-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onUpload}
                        className={cn(
                            "p-3 rounded-xl flex items-center gap-2",
                            "bg-gradient-to-r from-cyan-600 to-blue-600 text-white",
                            "shadow-lg shadow-cyan-500/20"
                        )}
                    >
                        <Upload size={20} />
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};
