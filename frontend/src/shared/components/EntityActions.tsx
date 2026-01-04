/**
 * Shared Components - Entity Actions
 *
 * INVARIANT: Actions are capability-driven, not module-driven.
 * INVARIANT: Only available capabilities are rendered.
 *
 * This component renders action buttons based on an entity's capabilities.
 */

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LearningEntity } from "@/shared/core/entity";
import type { ResolvedCapability, EntityCapability } from "@/shared/core/capabilities";
import { getAvailableCapabilities } from "@/shared/core/capabilities";
import {
    MessageSquare,
    Layers,
    FileQuestion,
    Brain,
    Download,
    FileText,
    type LucideIcon,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface EntityActionsProps {
    entity: LearningEntity;
    /** Which capabilities to show (default: all available) */
    show?: EntityCapability[];
    /** Callback when an action is triggered */
    onAction?: (capability: EntityCapability, entity: LearningEntity) => void;
    /** Button variant */
    variant?: "default" | "ghost" | "outline";
    /** Button size */
    size?: "default" | "sm" | "icon";
    /** Show labels or just icons */
    showLabels?: boolean;
}

// ============================================================================
// Capability Metadata
// ============================================================================

interface CapabilityMeta {
    label: string;
    icon: LucideIcon;
    description: string;
}

const CAPABILITY_META: Record<EntityCapability, CapabilityMeta> = {
    REFERENCE_IN_CHAT: {
        label: "Chat",
        icon: MessageSquare,
        description: "Reference in chat",
    },
    GENERATE_FLASHCARDS: {
        label: "Flashcards",
        icon: Layers,
        description: "Generate flashcards",
    },
    GENERATE_QUIZ: {
        label: "Quiz",
        icon: FileQuestion,
        description: "Generate quiz",
    },
    REINFORCE_GRAPH: {
        label: "Graph",
        icon: Brain,
        description: "Reinforce knowledge graph",
    },
    EXPORT: {
        label: "Export",
        icon: Download,
        description: "Export content",
    },
    SUMMARIZE: {
        label: "Summarize",
        icon: FileText,
        description: "Generate summary",
    },
};

// ============================================================================
// Component
// ============================================================================

export function EntityActions({
    entity,
    show,
    onAction,
    variant = "ghost",
    size = "sm",
    showLabels = false,
}: EntityActionsProps) {
    // Get available capabilities
    let capabilities = getAvailableCapabilities(entity.capabilities);

    // Filter to requested capabilities if specified
    if (show && show.length > 0) {
        capabilities = capabilities.filter((c) => show.includes(c.capability));
    }

    if (capabilities.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1">
            {capabilities.map((resolved) => (
                <ActionButton
                    key={resolved.capability}
                    resolved={resolved}
                    entity={entity}
                    onAction={onAction}
                    variant={variant}
                    size={size}
                    showLabels={showLabels}
                />
            ))}
        </div>
    );
}

// ============================================================================
// Action Button
// ============================================================================

interface ActionButtonProps {
    resolved: ResolvedCapability;
    entity: LearningEntity;
    onAction?: (capability: EntityCapability, entity: LearningEntity) => void;
    variant: "default" | "ghost" | "outline";
    size: "default" | "sm" | "icon";
    showLabels: boolean;
}

function ActionButton({
    resolved,
    entity,
    onAction,
    variant,
    size,
    showLabels,
}: ActionButtonProps) {
    const meta = CAPABILITY_META[resolved.capability];
    const Icon = meta.icon;

    const handleClick = () => {
        onAction?.(resolved.capability, entity);
    };

    const button = (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className="gap-1.5"
        >
            <Icon className="h-4 w-4" />
            {showLabels && <span>{meta.label}</span>}
        </Button>
    );

    if (showLabels) {
        return button;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
                <p>{meta.description}</p>
            </TooltipContent>
        </Tooltip>
    );
}
