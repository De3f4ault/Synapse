/**
 * MatchingAlgorithmPicker — Selector for matching algorithm + match pattern
 *
 * Displays the 7 Paperless-ngx matching algorithms:
 * NONE, ANY, ALL, LITERAL, REGEX, FUZZY, AUTO
 * with a text input for the match pattern and case sensitivity toggle.
 */

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchingAlgorithm, MATCHING_ALGORITHM_LABELS } from "../../core/types/dms";

interface MatchingAlgorithmPickerProps {
  algorithm: MatchingAlgorithm;
  onAlgorithmChange: (algorithm: MatchingAlgorithm) => void;
  match: string;
  onMatchChange: (match: string) => void;
  isInsensitive: boolean;
  onInsensitiveChange: (insensitive: boolean) => void;
  className?: string;
}

const ALGORITHM_DESCRIPTIONS: Record<MatchingAlgorithm, string> = {
  [MatchingAlgorithm.NONE]: "No automatic matching",
  [MatchingAlgorithm.ANY]: "Document contains any of these words",
  [MatchingAlgorithm.ALL]: "Document contains all of these words",
  [MatchingAlgorithm.LITERAL]: "Document contains this exact string",
  [MatchingAlgorithm.REGEX]: "Document matches this regular expression",
  [MatchingAlgorithm.FUZZY]: "Document contains a word similar to this",
  [MatchingAlgorithm.AUTO]: "Learn matching from existing documents",
};

export function MatchingAlgorithmPicker({
  algorithm,
  onAlgorithmChange,
  match,
  onMatchChange,
  isInsensitive,
  onInsensitiveChange,
  className,
}: MatchingAlgorithmPickerProps) {
  const showMatchInput = algorithm !== MatchingAlgorithm.NONE && algorithm !== MatchingAlgorithm.AUTO;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Algorithm selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Matching algorithm
        </Label>
        <Select
          value={String(algorithm)}
          onValueChange={(v) => onAlgorithmChange(Number(v) as MatchingAlgorithm)}
        >
          <SelectTrigger className="bg-foreground/5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MATCHING_ALGORITHM_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {ALGORITHM_DESCRIPTIONS[algorithm]}
        </p>
      </div>

      {/* Match pattern */}
      {showMatchInput && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {algorithm === MatchingAlgorithm.REGEX ? "Pattern" : "Match text"}
          </Label>
          <Input
            value={match}
            onChange={(e) => onMatchChange(e.target.value)}
            placeholder={
              algorithm === MatchingAlgorithm.REGEX
                ? "e.g. invoice|receipt"
                : algorithm === MatchingAlgorithm.ANY
                ? "word1 word2 word3"
                : "Enter text to match..."
            }
            className={cn(
              "bg-foreground/5 border-border",
              algorithm === MatchingAlgorithm.REGEX && "font-mono text-sm"
            )}
          />
        </div>
      )}

      {/* Case sensitivity */}
      {showMatchInput && (
        <div className="flex items-center justify-between">
          <Label className="text-sm text-foreground/80">
            Case insensitive
          </Label>
          <Switch
            checked={isInsensitive}
            onCheckedChange={onInsensitiveChange}
          />
        </div>
      )}
    </div>
  );
}
