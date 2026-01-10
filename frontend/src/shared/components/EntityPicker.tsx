/**
 * Shared Components - Entity Picker
 *
 * INVARIANT: Allows selecting entities across modules.
 * INVARIANT: Uses context resolution, not direct module imports.
 *
 * A modal/popover for picking learning entities.
 */

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityPreview } from "./EntityPreview";
import type { LearningEntity, EntityType } from "@/shared/core/entity";
import { Search, Plus } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface EntityPickerProps {
    /** Entities to choose from */
    entities: LearningEntity[];
    /** Currently selected entities */
    selected?: LearningEntity[];
    /** Filter to specific entity types */
    filterTypes?: EntityType[];
    /** Callback when selection changes */
    onSelect: (entities: LearningEntity[]) => void;
    /** Allow multiple selection */
    multiple?: boolean;
    /** Trigger element */
    trigger?: React.ReactNode;
    /** Dialog title */
    title?: string;
}

// ============================================================================
// Component
// ============================================================================

export function EntityPicker({
    entities,
    selected = [],
    filterTypes,
    onSelect,
    multiple = false,
    trigger,
    title = "Select Entity",
}: EntityPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [localSelected, setLocalSelected] = useState<LearningEntity[]>(selected);

    // Filter entities
    const filteredEntities = useMemo(() => {
        let result = entities;

        // Filter by type
        if (filterTypes && filterTypes.length > 0) {
            result = result.filter((e) => filterTypes.includes(e.type));
        }

        // Filter by search
        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter(
                (e) =>
                    e.title?.toLowerCase().includes(query) ||
                    e.type.toLowerCase().includes(query)
            );
        }

        return result;
    }, [entities, filterTypes, search]);

    const handleEntityClick = (entity: LearningEntity) => {
        if (multiple) {
            const isSelected = localSelected.some(
                (s) => s.id === entity.id && s.type === entity.type
            );
            if (isSelected) {
                setLocalSelected((prev) =>
                    prev.filter((s) => !(s.id === entity.id && s.type === entity.type))
                );
            } else {
                setLocalSelected((prev) => [...prev, entity]);
            }
        } else {
            onSelect([entity]);
            setOpen(false);
        }
    };

    const handleConfirm = () => {
        onSelect(localSelected);
        setOpen(false);
    };

    const isEntitySelected = (entity: LearningEntity) =>
        localSelected.some((s) => s.id === entity.id && s.type === entity.type);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Entity
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search entities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Type filters */}
                    {filterTypes && filterTypes.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {filterTypes.map((type) => (
                                <Badge key={type} variant="secondary">
                                    {type}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Entity list */}
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-2">
                            {filteredEntities.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No entities found
                                </p>
                            ) : (
                                filteredEntities.map((entity) => (
                                    <div
                                        key={`${entity.type}:${entity.id}`}
                                        className={
                                            isEntitySelected(entity)
                                                ? "ring-2 ring-primary rounded-md"
                                                : ""
                                        }
                                    >
                                        <EntityPreview
                                            entity={entity}
                                            variant="list"
                                            onClick={handleEntityClick}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {/* Actions */}
                    {multiple && (
                        <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                {localSelected.length} selected
                            </p>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleConfirm}>Confirm</Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
