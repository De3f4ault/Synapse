/**
 * Shared Components - Entity Preview
 *
 * INVARIANT: Renders any entity type without knowing the source module.
 * INVARIANT: Actions are capability-driven via EntityActions.
 *
 * This is the polymorphic component for displaying learning entities.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LearningEntity, EntityType } from "@/shared/core/entity";
import type { EntityCapability } from "@/shared/core/capabilities";
import { EntityActions } from "./EntityActions";
import { MODULE_LABELS } from "@/shared/core/modules";
import {
    FileText,
    StickyNote,
    Layers,
    HelpCircle,
    Brain,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface EntityPreviewProps {
    entity: LearningEntity;
    /** Display variant */
    variant?: "card" | "list" | "chip";
    /** Action capabilities to show (default: all available) */
    showActions?: EntityCapability[];
    /** Callback when an action is triggered */
    onAction?: (capability: EntityCapability, entity: LearningEntity) => void;
    /** Callback when the entity is clicked */
    onClick?: (entity: LearningEntity) => void;
    /** Additional className */
    className?: string;
}

// ============================================================================
// Entity Type Metadata
// ============================================================================

interface EntityTypeMeta {
    icon: LucideIcon;
    color: string;
    bgColor: string;
}

const ENTITY_TYPE_META: Record<EntityType, EntityTypeMeta> = {
    document: {
        icon: FileText,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
    },
    note: {
        icon: StickyNote,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
    },
    flashcard: {
        icon: Layers,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
    },
    quiz: {
        icon: HelpCircle,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
    },
    concept: {
        icon: Brain,
        color: "text-pink-500",
        bgColor: "bg-pink-500/10",
    },
};

// ============================================================================
// Component
// ============================================================================

export function EntityPreview({
    entity,
    variant = "card",
    showActions,
    onAction,
    onClick,
    className,
}: EntityPreviewProps) {
    const meta = ENTITY_TYPE_META[entity.type];
    const Icon = meta.icon;

    if (variant === "chip") {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "gap-1.5 cursor-pointer hover:bg-accent/50 transition-colors",
                    meta.bgColor,
                    className
                )}
                onClick={() => onClick?.(entity)}
            >
                <Icon className={cn("h-3 w-3", meta.color)} />
                <span className="max-w-[150px] truncate">
                    {entity.title || `${entity.type}:${entity.id}`}
                </span>
            </Badge>
        );
    }

    if (variant === "list") {
        return (
            <div
                className={cn(
                    "flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer",
                    className
                )}
                onClick={() => onClick?.(entity)}
            >
                <div className={cn("p-2 rounded-md", meta.bgColor)}>
                    <Icon className={cn("h-4 w-4", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                        {entity.title || `Untitled ${entity.type}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {MODULE_LABELS[entity.sourceModule]}
                    </p>
                </div>
                <EntityActions
                    entity={entity}
                    show={showActions}
                    onAction={onAction}
                    size="icon"
                />
            </div>
        );
    }

    // Default: card variant
    return (
        <Card
            className={cn(
                "hover:border-primary/50 transition-colors cursor-pointer",
                className
            )}
            onClick={() => onClick?.(entity)}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("p-2 rounded-md shrink-0", meta.bgColor)}>
                            <Icon className={cn("h-4 w-4", meta.color)} />
                        </div>
                        <CardTitle className="text-base truncate">
                            {entity.title || `Untitled ${entity.type}`}
                        </CardTitle>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                        {entity.type}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {MODULE_LABELS[entity.sourceModule]} •{" "}
                        {new Date(entity.createdAt).toLocaleDateString()}
                    </p>
                    <EntityActions
                        entity={entity}
                        show={showActions}
                        onAction={onAction}
                        size="sm"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
