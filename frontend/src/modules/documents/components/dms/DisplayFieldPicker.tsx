/**
 * DisplayFieldPicker — Column configuration dropdown
 *
 * Lets users choose which columns appear in table view / which fields show on cards.
 * Mirrors Paperless-ngx's column picker with checkbox toggles.
 */

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GearIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { DisplayField, DEFAULT_DISPLAY_FIELDS } from "../../core/types/dms";

interface DisplayFieldPickerProps {
  activeFields: DisplayField[];
  onChange: (fields: DisplayField[]) => void;
  className?: string;
}

const FIELD_OPTIONS: { field: DisplayField; label: string }[] = [
  { field: DisplayField.TITLE, label: "Title" },
  { field: DisplayField.ASN, label: "ASN" },
  { field: DisplayField.CORRESPONDENT, label: "Correspondent" },
  { field: DisplayField.DOCUMENT_TYPE, label: "Document type" },
  { field: DisplayField.STORAGE_PATH, label: "Storage path" },
  { field: DisplayField.TAGS, label: "Tags" },
  { field: DisplayField.CREATED, label: "Created" },
  { field: DisplayField.ADDED, label: "Added" },
  { field: DisplayField.NOTES, label: "Notes" },
  { field: DisplayField.OWNER, label: "Owner" },
  { field: DisplayField.SHARED, label: "Shared" },
  { field: DisplayField.PAGE_COUNT, label: "Pages" },
];

export function DisplayFieldPicker({
  activeFields,
  onChange,
  className,
}: DisplayFieldPickerProps) {
  const [open, setOpen] = useState(false);

  const toggle = (field: DisplayField) => {
    if (activeFields.includes(field)) {
      // Don't allow removing the last field
      if (activeFields.length <= 1) return;
      onChange(activeFields.filter((f) => f !== field));
    } else {
      onChange([...activeFields, field]);
    }
  };

  const resetToDefaults = () => {
    onChange([...DEFAULT_DISPLAY_FIELDS]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
        >
          <GearIcon className="h-3.5 w-3.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          {FIELD_OPTIONS.map(({ field, label }) => (
            <label
              key={field}
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm cursor-pointer hover:bg-accent transition-colors"
            >
              <Checkbox
                checked={activeFields.includes(field)}
                onCheckedChange={() => toggle(field)}
                className="h-3.5 w-3.5"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="border-t border-border mt-2 pt-2">
          <button
            onClick={resetToDefaults}
            className="w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-sm hover:bg-accent transition-colors text-left"
          >
            Reset to defaults
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
