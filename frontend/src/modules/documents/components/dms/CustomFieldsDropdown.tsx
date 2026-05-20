/**
 * CustomFieldsDropdown — Dropdown to add/remove custom fields on a document
 *
 * Ported from Paperless-ngx custom-fields-dropdown.component.ts:
 *   - Lists all available custom fields
 *   - Shows which are already applied to the current document
 *   - Toggle to add/remove field from document
 *   - Type badge showing the data type
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Check, ChevronDown, Search } from "lucide-react";
import {
  DATA_TYPE_LABELS,
} from "./CustomFieldDisplay";
import type { CustomField } from "./CustomFieldDisplay";

// ============================================================================
// Props
// ============================================================================

interface CustomFieldsDropdownProps {
  /** All available custom fields */
  availableFields: CustomField[];
  /** IDs of fields already on the document */
  appliedFieldIds: Set<number>;
  /** Toggle callback — adds if not present, removes if present */
  onToggle: (fieldId: number) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CustomFieldsDropdown({
  availableFields,
  appliedFieldIds,
  onToggle,
  className,
}: CustomFieldsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = availableFields.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs",
          "border border-dashed border-muted-foreground/20 text-muted-foreground",
          "hover:border-primary/30 hover:text-primary transition-colors"
        )}
      >
        <Plus size={12} />
        Add field
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Click-outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className={cn(
            "absolute top-full mt-1 left-0 z-50 w-64",
            "bg-card/95 backdrop-blur-xl border border-border rounded-xl",
            "shadow-xl shadow-black/30 overflow-hidden"
          )}>
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-foreground placeholder-slate-500 outline-none"
                autoFocus
              />
            </div>

            {/* Field list */}
            <div className="max-h-[240px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No fields found
                </div>
              ) : (
                filtered.map((field) => {
                  const isApplied = appliedFieldIds.has(field.id);
                  return (
                    <button
                      key={field.id}
                      onClick={() => onToggle(field.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left",
                        "hover:bg-muted/30 transition-colors",
                        isApplied && "bg-primary/[0.04]"
                      )}
                    >
                      {/* Check indicator */}
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                        isApplied
                          ? "border-primary bg-primary/20"
                          : "border-border"
                      )}>
                        {isApplied && <Check size={10} className="text-primary" />}
                      </div>

                      {/* Field info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/70 truncate">{field.name}</p>
                      </div>

                      {/* Type badge */}
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground shrink-0">
                        {DATA_TYPE_LABELS[field.data_type] || field.data_type}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
