import React from "react";
import { EntityIdentity } from "@/shared/core/entity";
import { useLearningContext } from "@/shared/context";
import { EntityPreview } from "@/shared/components";

interface ChatEntityPreviewProps {
    entityRef: EntityIdentity;
}

import { executeCapability } from "@/shared/platform";
import type { LearningEntity } from "@/shared/core/entity";
import type { EntityCapability } from "@/shared/core/capabilities";

export const ChatEntityPreview: React.FC<ChatEntityPreviewProps> = ({ entityRef }) => {
    const { context, isLoading } = useLearningContext(entityRef);
    const { entity } = context || {};

    const handleAction = (capability: EntityCapability, entity: LearningEntity) => {
        executeCapability(
            capability,
            entity,
            { reason: "chat_user_request" }
        );
    };

    if (isLoading) {
        return (
            <div className="animate-pulse h-16 w-full bg-muted/20 rounded-lg border border-border/50 transition-all duration-500 ease-in-out" />
        );
    }

    if (!entity) {
        return null; // Graceful degradation
    }

    return (
        <div className="my-3 transition-opacity duration-300 animate-in fade-in slide-in-from-bottom-2">
            <EntityPreview
                entity={entity}
                variant="card"
                onAction={handleAction}
                className="bg-card/50 hover:bg-card/80 transition-colors border-primary/10 hover:border-primary/30"
            />
        </div>
    );
};
