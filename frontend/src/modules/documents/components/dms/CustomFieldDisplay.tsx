/**
 * CustomFieldDisplay — Renders a custom field value based on its data type
 *
 * Ported from Paperless-ngx data/custom-field.ts (69 lines):
 *   CustomFieldDataType enum with 10 types:
 *     string, url, date, boolean, integer, float, monetary,
 *     documentlink, select, longtext
 *
 * Each type renders differently:
 *   - string/longtext → plain text
 *   - url → clickable link with icon
 *   - date → formatted date string
 *   - boolean → toggle/check icon
 *   - integer/float → number with locale formatting
 *   - monetary → currency format
 *   - documentlink → chip linking to another document
 *   - select → colored badge from select_options
 */

import { cn } from "@/lib/utils";
import {
  Link as LinkIcon,
  Check,
  X,
  FileText,
  Calendar,
  Hash,
  DollarSign,
  AlignLeft,
  Type,
  Tag,
} from "lucide-react";

// ============================================================================
// Types (exact match of Paperless CustomFieldDataType L3-14)
// ============================================================================

export enum CustomFieldDataType {
  String = "string",
  Url = "url",
  Date = "date",
  Boolean = "boolean",
  Integer = "integer",
  Float = "float",
  Monetary = "monetary",
  DocumentLink = "documentlink",
  Select = "select",
  LongText = "longtext",
}

/** Matching Paperless DATA_TYPE_LABELS L16-57 */
export const DATA_TYPE_LABELS: Record<CustomFieldDataType, string> = {
  [CustomFieldDataType.Boolean]: "Boolean",
  [CustomFieldDataType.Date]: "Date",
  [CustomFieldDataType.Integer]: "Integer",
  [CustomFieldDataType.Float]: "Number",
  [CustomFieldDataType.Monetary]: "Monetary",
  [CustomFieldDataType.String]: "Text",
  [CustomFieldDataType.Url]: "URL",
  [CustomFieldDataType.DocumentLink]: "Document Link",
  [CustomFieldDataType.Select]: "Select",
  [CustomFieldDataType.LongText]: "Long Text",
};

/** Matching Paperless CustomField interface L59-68 */
export interface CustomField {
  id: number;
  data_type: CustomFieldDataType;
  name: string;
  created?: string;
  extra_data?: {
    select_options?: Array<{ label: string; id: string }>;
    default_currency?: string;
  };
  document_count?: number;
}

export interface CustomFieldInstance {
  field: number;
  value: unknown;
}

// ============================================================================
// Type → Icon mapping
// ============================================================================

const typeIcons: Record<CustomFieldDataType, typeof Type> = {
  [CustomFieldDataType.String]: Type,
  [CustomFieldDataType.Url]: LinkIcon,
  [CustomFieldDataType.Date]: Calendar,
  [CustomFieldDataType.Boolean]: Check,
  [CustomFieldDataType.Integer]: Hash,
  [CustomFieldDataType.Float]: Hash,
  [CustomFieldDataType.Monetary]: DollarSign,
  [CustomFieldDataType.DocumentLink]: FileText,
  [CustomFieldDataType.Select]: Tag,
  [CustomFieldDataType.LongText]: AlignLeft,
};

// ============================================================================
// Props
// ============================================================================

interface CustomFieldDisplayProps {
  field: CustomField;
  value: unknown;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CustomFieldDisplay({
  field,
  value,
  className,
}: CustomFieldDisplayProps) {
  const Icon = typeIcons[field.data_type] || Type;

  const renderValue = () => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">Not set</span>;
    }

    switch (field.data_type) {
      case CustomFieldDataType.String:
        return <span className="text-foreground/70">{String(value)}</span>;

      case CustomFieldDataType.LongText:
        return (
          <p className="text-foreground/70 text-xs leading-relaxed whitespace-pre-wrap line-clamp-3">
            {String(value)}
          </p>
        );

      case CustomFieldDataType.Url:
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2 flex items-center gap-1"
          >
            <LinkIcon size={10} />
            {String(value).replace(/^https?:\/\//, "").slice(0, 40)}
          </a>
        );

      case CustomFieldDataType.Date:
        return (
          <span className="text-foreground/70">
            {new Date(String(value)).toLocaleDateString()}
          </span>
        );

      case CustomFieldDataType.Boolean:
        return value ? (
          <Check size={14} className="text-accent-olive" />
        ) : (
          <X size={14} className="text-destructive" />
        );

      case CustomFieldDataType.Integer:
        return (
          <span className="text-foreground/70 font-mono">
            {Number(value).toLocaleString()}
          </span>
        );

      case CustomFieldDataType.Float:
        return (
          <span className="text-foreground/70 font-mono">
            {Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </span>
        );

      case CustomFieldDataType.Monetary: {
        const currency = field.extra_data?.default_currency || "USD";
        return (
          <span className="text-foreground/70 font-mono">
            {Number(value).toLocaleString(undefined, {
              style: "currency",
              currency,
            })}
          </span>
        );
      }

      case CustomFieldDataType.DocumentLink:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-info/10 text-info text-xs">
            <FileText size={10} />
            Doc #{String(value)}
          </span>
        );

      case CustomFieldDataType.Select: {
        const options = field.extra_data?.select_options || [];
        const selected = options.find((o) => o.id === String(value));
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent/10 text-accent text-xs">
            {selected?.label || String(value)}
          </span>
        );
      }

      default:
        return <span className="text-foreground/70">{String(value)}</span>;
    }
  };

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Icon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
          {field.name}
        </p>
        <div className="text-sm">{renderValue()}</div>
      </div>
    </div>
  );
}
