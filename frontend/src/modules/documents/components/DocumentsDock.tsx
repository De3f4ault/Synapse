/**
 * Documents Dock (Action Center)
 * 
 * Context-aware floating dock that provides:
 * 1. Global tools (Search, Filter, View) when idle.
 * 2. Bulk Actions (Download, Delete, Move) when items are selected.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Grid,
    List,
    Upload,
    X,
    FileText,
    Book,
    Trash2,
    Star,
    Archive,
    Download,
    FolderPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFolderStore } from "@/modules/documents/core/state/folderStore";

interface DocumentsDockProps {
    viewMode: "grid" | "list";
    onViewChange: (mode: "grid" | "list") => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    onUpload: () => void;
    onCreateFolder?: () => void;
    
    // Batch Actions
    onBatchDownload?: (ids: string[]) => void;
    onBatchDelete?: (ids: string[]) => void;
    onBatchFavorite?: (ids: string[]) => void;
    onBatchArchive?: (ids: string[]) => void;
}

export const DocumentsDock = ({
    viewMode,
    onViewChange,
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onUpload,
    onCreateFolder,
    onBatchDownload,
    onBatchDelete,
    onBatchFavorite,
    onBatchArchive
}: DocumentsDockProps) => {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const selectedItemIds = useFolderStore((state) => state.selectedItemIds);
    const clearSelection = useFolderStore((state) => state.clearSelection);
    
    // Derived state
    const selectionCount = selectedItemIds.size;
    const isSelectionMode = selectionCount > 0;

    const toggleSearch = () => {
        setIsSearchExpanded(!isSearchExpanded);
        if (isSearchExpanded) onSearchChange("");
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <AnimatePresence mode="wait">
                {isSelectionMode ? (
                    // ==========================================
                    // SELECTION MODE DOCK
                    // ==========================================
                    <motion.div
                        key="selection-dock"
                        className={cn(
                            "flex items-center gap-2 p-2 rounded-2xl",
                            "bg-card border border-primary/30",
                            "shadow-2xl shadow-ring-brand ring-1 ring-primary/20"
                        )}
                        initial={{ y: 20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                    >
                        {/* Selected Count Indicator */}
                        <div className="pl-4 pr-3 flex items-center gap-2 border-r border-border mr-1">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-black text-xs font-bold">
                                {selectionCount}
                            </span>
                            <span className="text-sm font-medium text-primary-foreground">Selected</span>
                            
                            <button 
                                onClick={() => clearSelection()}
                                className="ml-2 p-1 rounded-full hover:bg-muted text-primary/80/50 hover:text-primary-foreground transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Actions */}
                        <ActionBtn 
                            icon={Star} 
                            tooltip="Favorite" 
                            onClick={() => onBatchFavorite?.(Array.from(selectedItemIds))} 
                        />
                        <ActionBtn 
                            icon={Download} 
                            tooltip="Download" 
                            onClick={() => onBatchDownload?.(Array.from(selectedItemIds))} 
                        />
                        <ActionBtn 
                            icon={Archive} 
                            tooltip="Archive" 
                            onClick={() => onBatchArchive?.(Array.from(selectedItemIds))} 
                        />
                        <div className="w-px h-6 bg-foreground/10 mx-1" />
                        <ActionBtn 
                            icon={Trash2} 
                            tooltip="Delete" 
                            danger 
                            onClick={() => onBatchDelete?.(Array.from(selectedItemIds))} 
                        />
                    </motion.div>
                ) : (
                    // ==========================================
                    // DEFAULT MODE DOCK
                    // ==========================================
                    <motion.div
                        key="default-dock"
                        className={cn(
                            "flex items-center gap-2 p-2 rounded-2xl",
                            "bg-background/80 backdrop-blur-xl border border-border",
                            "shadow-2xl shadow-lg"
                        )}
                        initial={{ y: 20, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                    >
                        {/* Search Section */}
                        <div className="flex items-center">
                            <AnimatePresence>
                                {isSearchExpanded && (
                                    <motion.input
                                        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        animate={{ width: 240, opacity: 1, marginLeft: 8 }}
                                        exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        placeholder="Search documents..."
                                        className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground h-10"
                                        autoFocus
                                    />
                                )}
                            </AnimatePresence>
                            <button
                                onClick={toggleSearch}
                                className={cn(
                                    "p-3 rounded-xl transition-all",
                                    isSearchExpanded ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {isSearchExpanded ? <X size={20} /> : <Search size={20} />}
                            </button>
                        </div>

                        <div className="w-px h-8 bg-foreground/10 mx-1" />

                        {/* Quick Filters */}
                        <div className="flex items-center gap-1">
                            <FilterBtn 
                                active={activeFilter === 'all'} 
                                onClick={() => onFilterChange('All')} 
                                icon={Grid} 
                                label="All" 
                            />
                             <FilterBtn 
                                active={activeFilter === 'pdf'} 
                                onClick={() => onFilterChange('pdf')} 
                                icon={Book} 
                                label="Books" 
                            />
                             <FilterBtn 
                                active={activeFilter === 'paper'} 
                                onClick={() => onFilterChange('paper')} 
                                icon={FileText} 
                                label="Papers" 
                            />
                        </div>

                        <div className="w-px h-8 bg-foreground/10 mx-1" />

                        {/* View Toggle */}
                        <div className="flex items-center bg-foreground/5 rounded-xl p-1">
                            <button
                                onClick={() => onViewChange("grid")}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === "grid" ? "bg-foreground/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => onViewChange("list")}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === "list" ? "bg-foreground/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="ml-2 flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onCreateFolder}
                                className={cn(
                                    "p-3 rounded-xl flex items-center gap-2",
                                    "bg-foreground/10 text-foreground/80 hover:text-foreground hover:bg-foreground/15",
                                    "border border-border",
                                )}
                                title="New Folder"
                            >
                                <FolderPlus size={20} />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onUpload}
                                className={cn(
                                    "p-3 rounded-xl flex items-center gap-2",
                                    "bg-primary text-primary-foreground",
                                    "shadow-lg "
                                )}
                                title="Upload"
                            >
                                <Upload size={20} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper Components
const ActionBtn = ({ icon: Icon, onClick, danger, tooltip }: any) => (
    <motion.button
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className={cn(
            "p-3 rounded-xl transition-colors relative group",
            danger 
                ? "text-destructive hover:bg-destructive/10 hover:text-red-300" 
                : "text-primary-foreground hover:bg-primary/20 hover:text-foreground"
        )}
        title={tooltip}
    >
        <Icon size={20} />
    </motion.button>
);

const FilterBtn = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
            active
                ? "bg-white/15 text-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
    >
        <Icon size={16} />
        {active && (
            <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                className="whitespace-nowrap overflow-hidden"
            >
                {label}
            </motion.span>
        )}
    </button>
);
