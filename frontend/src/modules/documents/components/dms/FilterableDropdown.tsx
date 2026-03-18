/**
 * FilterableDropdown — Searchable dropdown for DMS taxonomy selection
 *
 * Modeled after Paperless-ngx's filterable-dropdown.component.ts.
 * Uses cmdk + Radix Popover for accessible, keyboard-navigable selection.
 */

import { useState, useMemo, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  Cross2Icon,
  PlusIcon,
  CheckIcon,
} from "@radix-ui/react-icons";

// ============================================================================
// Types
// ============================================================================

export interface DropdownItem {
  id: number | string;
  name: string;
  color?: string; // for tags
  count?: number; // document count
}

interface FilterableDropdownProps {
  /** Label shown on trigger button */
  label: string;
  /** Items to choose from */
  items: DropdownItem[];
  /** Currently selected item IDs */
  selectedIds: (number | string)[];
  /** Callback when selection changes */
  onChange: (ids: (number | string)[]) => void;
  /** Single select (radio) vs multi select (checkboxes) */
  multiple?: boolean;
  /** Show "Create new" action at the bottom */
  allowCreate?: boolean;
  /** Callback when user creates a new item */
  onCreate?: (name: string) => void;
  /** Show document count next to each item */
  showCounts?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** If true, show a "Not assigned" option */
  nullable?: boolean;
  /** Icon to show on the trigger */
  icon?: React.ReactNode;
  /** Custom class for the trigger button */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FilterableDropdown({
  label,
  items,
  selectedIds,
  onChange,
  multiple = false,
  allowCreate = false,
  onCreate,
  showCounts = false,
  searchPlaceholder = "Search…",
  nullable = false,
  icon,
  className,
  disabled = false,
}: FilterableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filtered items based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  // Selected item names for display on trigger
  const selectedNames = useMemo(() => {
    return items
      .filter((item) => selectedIds.includes(item.id))
      .map((item) => item.name);
  }, [items, selectedIds]);

  // Toggle selection
  const handleSelect = useCallback(
    (id: number | string) => {
      if (multiple) {
        const newIds = selectedIds.includes(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id];
        onChange(newIds);
      } else {
        onChange(selectedIds.includes(id) ? [] : [id]);
        setOpen(false);
      }
    },
    [multiple, selectedIds, onChange]
  );

  // Handle "Not assigned" click
  const handleNotAssigned = useCallback(() => {
    onChange([]);
    if (!multiple) setOpen(false);
  }, [multiple, onChange]);

  // Handle create new from search text
  const handleCreate = useCallback(() => {
    if (search.trim() && onCreate) {
      onCreate(search.trim());
      setSearch("");
    }
  }, [search, onCreate]);

  // Clear all
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange([]);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between gap-2 text-sm font-normal",
            selectedIds.length > 0 && "border-primary/50",
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {icon}
            {selectedNames.length === 0 ? (
              <span className="text-muted-foreground">{label}</span>
            ) : selectedNames.length === 1 ? (
              selectedNames[0]
            ) : (
              <span>
                {selectedNames[0]}
                <Badge
                  variant="secondary"
                  className="ml-1 px-1 py-0 text-xs"
                >
                  +{selectedNames.length - 1}
                </Badge>
              </span>
            )}
          </span>
          <span className="flex items-center gap-0.5">
            {selectedIds.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
                className="rounded-sm p-0.5 hover:bg-accent"
              >
                <Cross2Icon className="h-3 w-3" />
              </span>
            )}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {allowCreate && search.trim() ? (
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm"
                  onClick={handleCreate}
                >
                  <PlusIcon className="h-4 w-4" />
                  Create &quot;{search.trim()}&quot;
                </button>
              ) : (
                "No results found."
              )}
            </CommandEmpty>

            <CommandGroup>
              {nullable && (
                <CommandItem
                  onSelect={handleNotAssigned}
                  className="text-muted-foreground italic"
                >
                  <span className="flex-1">Not assigned</span>
                  {selectedIds.length === 0 && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              )}

              {filtered.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => handleSelect(item.id)}
                  >
                    {item.color && (
                      <span
                        className="mr-2 h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{item.name}</span>
                    {showCounts && item.count !== undefined && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {item.count}
                      </span>
                    )}
                    {isSelected && (
                      <CheckIcon className="h-4 w-4 text-primary ml-1" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {allowCreate && search.trim() && filtered.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreate}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
