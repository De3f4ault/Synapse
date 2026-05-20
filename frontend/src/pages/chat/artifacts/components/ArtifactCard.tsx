/**
 * ArtifactCard - Claude-style compact artifact card
 * 
 * Design: Compact horizontal row with icon, title, subtitle, and download.
 * Matches Claude's artifact card appearance.
 */

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
    Code2, 
    Download, 
    FileCode,
    FileText,
    Globe,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import type { ArtifactBlock, ArtifactType } from '@/shared/rendering/schema';
import { useArtifactStore } from '../state/artifactStore';

interface ArtifactCardProps {
    artifact: ArtifactBlock;
    onExpand?: (artifactId: string) => void;
}

// Icon mapping based on artifact type
const ARTIFACT_ICONS: Record<ArtifactType, React.ElementType> = {
    'application/vnd.ant.code': Code2,
    'application/vnd.ant.react': FileCode,
    'text/html': Globe,
    'text/markdown': FileText,
    'image/svg+xml': FileText,
    'application/vnd.ant.mermaid': Sparkles,
};

// Human-readable type labels
const TYPE_LABELS: Record<ArtifactType, string> = {
    'application/vnd.ant.code': 'Code',
    'application/vnd.ant.react': 'React',
    'text/html': 'HTML',
    'text/markdown': 'MD',
    'image/svg+xml': 'SVG',
    'application/vnd.ant.mermaid': 'Diagram',
};

// File extension mapping for downloads
const FILE_EXTENSIONS: Record<string, string> = {
    typescript: 'ts',
    javascript: 'js',
    python: 'py',
    tsx: 'tsx',
    jsx: 'jsx',
    html: 'html',
    css: 'css',
    json: 'json',
    sql: 'sql',
    markdown: 'md',
    yaml: 'yaml',
    bash: 'sh',
    shell: 'sh',
};

function ArtifactCardComponent({ artifact, onExpand }: ArtifactCardProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const openArtifact = useArtifactStore((state) => state.openArtifact);
    
    const Icon = ARTIFACT_ICONS[artifact.artifactType] || FileText;
    const typeLabel = TYPE_LABELS[artifact.artifactType] || 'Document';
    
    // Download file
    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDownloading(true);
        
        const extension = FILE_EXTENSIONS[artifact.language || ''] || 
            (artifact.artifactType === 'text/markdown' ? 'md' : 'txt');
        const filename = artifact.filename || 
            `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${extension}`;
        
        const blob = new Blob([artifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Downloaded ${filename}`);
        setTimeout(() => setIsDownloading(false), 500);
    };
    
    // Expand to panel
    const handleExpand = () => {
        openArtifact(artifact);
        onExpand?.(artifact.artifactId);
    };
    
    return (
        <div 
            className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                "rounded-xl border border-border bg-card",
                "hover:border-border hover:bg-muted",
                "transition-all duration-150 cursor-pointer",
                "min-w-[280px] max-w-[400px]"
            )}
            onClick={handleExpand}
        >
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 p-2 rounded-lg bg-foreground/5">
                    <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground/70 truncate">
                        {artifact.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {typeLabel} · {artifact.artifactType === 'text/markdown' ? 'MD' : artifact.language?.toUpperCase() || 'TXT'}
                    </span>
                </div>
            </div>
            
            {/* Right: Download button */}
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                    "flex-shrink-0 px-4 py-1.5 rounded-lg",
                    "text-sm font-medium text-foreground/80",
                    "border border-border bg-foreground/5",
                    "hover:bg-muted hover:text-foreground",
                    "transition-colors duration-150",
                    isDownloading && "opacity-50"
                )}
            >
                {isDownloading ? 'Saving...' : 'Download'}
            </button>
        </div>
    );
}

export const ArtifactCard = memo(ArtifactCardComponent);

