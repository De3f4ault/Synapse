/**
 * SettingsPage — User settings UI grouped by category
 *
 * Organized to match Paperless-ngx settings categories from
 * data/ui-settings.ts (293 lines, SETTINGS_KEYS):
 *   - Appearance: dark mode, theme color, slim sidebar
 *   - Documents: list size, native PDF viewer, date format
 *   - Notifications: new docs, success, failed, suppress on dashboard
 *   - Features: notes, audit log
 *   - Bulk Edit: confirmation dialogs, apply on close
 *   - Trash: auto-empty delay
 */

import { cn } from "@/lib/utils";
import { GlassCard } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  FileText,
  Trash2,
  RotateCcw,
  Settings,
  Palette,
  StickyNote,
  History,
  Layers,
} from "lucide-react";
import { useUserSettings, SETTINGS_KEYS } from "../../hooks/useUserSettings";

// ============================================================================
// Helpers
// ============================================================================

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && (
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors",
        checked ? "bg-cyan-500" : "bg-white/10"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

interface SectionProps {
  title: string;
  icon: typeof Settings;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
        <Icon size={14} className="text-cyan-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="divide-y divide-white/[0.03] px-4">
        {children}
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Component
// ============================================================================

export function SettingsPage() {
  const { get, set, resetAll } = useUserSettings();

  return (
    <div className="flex flex-col gap-5 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={22} className="text-cyan-400" />
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          className="text-xs text-slate-400 hover:text-white"
        >
          <RotateCcw size={12} className="mr-1.5" />
          Reset all
        </Button>
      </div>

      {/* Appearance */}
      <Section title="Appearance" icon={Palette}>
        <SettingRow
          label="Use system theme"
          description="Follow OS dark/light preference"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.DARK_MODE_USE_SYSTEM)}
            onChange={(v) => set(SETTINGS_KEYS.DARK_MODE_USE_SYSTEM, v)}
          />
        </SettingRow>

        {!get<boolean>(SETTINGS_KEYS.DARK_MODE_USE_SYSTEM) && (
          <SettingRow label="Dark mode">
            <Toggle
              checked={get<boolean>(SETTINGS_KEYS.DARK_MODE_ENABLED)}
              onChange={(v) => set(SETTINGS_KEYS.DARK_MODE_ENABLED, v)}
            />
          </SettingRow>
        )}

        <SettingRow
          label="Slim sidebar"
          description="Compact sidebar with icons only"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.SLIM_SIDEBAR)}
            onChange={(v) => set(SETTINGS_KEYS.SLIM_SIDEBAR, v)}
          />
        </SettingRow>
      </Section>

      {/* Documents */}
      <Section title="Documents" icon={FileText}>
        <SettingRow
          label="Documents per page"
          description="Number of documents shown in list view"
        >
          <select
            value={get<number>(SETTINGS_KEYS.DOCUMENT_LIST_SIZE)}
            onChange={(e) =>
              set(SETTINGS_KEYS.DOCUMENT_LIST_SIZE, Number(e.target.value))
            }
            className="px-2 py-1 rounded text-xs bg-white/[0.04] border border-white/10 text-slate-200"
          >
            {[25, 50, 100, 150].map((n) => (
              <option key={n} value={n} className="bg-slate-800">
                {n}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow
          label="Native PDF viewer"
          description="Use browser's built-in PDF viewer"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.USE_NATIVE_PDF_VIEWER)}
            onChange={(v) => set(SETTINGS_KEYS.USE_NATIVE_PDF_VIEWER, v)}
          />
        </SettingRow>

        <SettingRow label="Date format">
          <select
            value={get<string>(SETTINGS_KEYS.DATE_FORMAT)}
            onChange={(e) => set(SETTINGS_KEYS.DATE_FORMAT, e.target.value)}
            className="px-2 py-1 rounded text-xs bg-white/[0.04] border border-white/10 text-slate-200"
          >
            {["mediumDate", "shortDate", "longDate", "yyyy-MM-dd"].map((f) => (
              <option key={f} value={f} className="bg-slate-800">
                {f}
              </option>
            ))}
          </select>
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <SettingRow
          label="New document received"
          description="Notify when a new document is being processed"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.NOTIFICATIONS_NEW_DOCUMENT)}
            onChange={(v) => set(SETTINGS_KEYS.NOTIFICATIONS_NEW_DOCUMENT, v)}
          />
        </SettingRow>

        <SettingRow label="Processing success">
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.NOTIFICATIONS_SUCCESS)}
            onChange={(v) => set(SETTINGS_KEYS.NOTIFICATIONS_SUCCESS, v)}
          />
        </SettingRow>

        <SettingRow label="Processing failed">
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.NOTIFICATIONS_FAILED)}
            onChange={(v) => set(SETTINGS_KEYS.NOTIFICATIONS_FAILED, v)}
          />
        </SettingRow>

        <SettingRow
          label="Suppress on dashboard"
          description="Don't show notifications on the dashboard"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.NOTIFICATIONS_SUPPRESS_DASHBOARD)}
            onChange={(v) =>
              set(SETTINGS_KEYS.NOTIFICATIONS_SUPPRESS_DASHBOARD, v)
            }
          />
        </SettingRow>
      </Section>

      {/* Features */}
      <Section title="Features" icon={Layers}>
        <SettingRow
          label="Document notes"
          description="Enable notes on documents"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.NOTES_ENABLED)}
            onChange={(v) => set(SETTINGS_KEYS.NOTES_ENABLED, v)}
          />
        </SettingRow>

        <SettingRow
          label="Audit log"
          description="Track document changes in a history log"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.AUDITLOG_ENABLED)}
            onChange={(v) => set(SETTINGS_KEYS.AUDITLOG_ENABLED, v)}
          />
        </SettingRow>

        <SettingRow
          label="Confirm bulk edits"
          description="Show confirmation dialog before bulk operations"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.BULK_EDIT_CONFIRMATION)}
            onChange={(v) => set(SETTINGS_KEYS.BULK_EDIT_CONFIRMATION, v)}
          />
        </SettingRow>

        <SettingRow
          label="Warn on unsaved view changes"
          description="Prompt before leaving a saved view with unsaved changes"
        >
          <Toggle
            checked={get<boolean>(SETTINGS_KEYS.SAVED_VIEWS_WARN_UNSAVED)}
            onChange={(v) => set(SETTINGS_KEYS.SAVED_VIEWS_WARN_UNSAVED, v)}
          />
        </SettingRow>
      </Section>

      {/* Trash */}
      <Section title="Trash" icon={Trash2}>
        <SettingRow
          label="Auto-empty after"
          description="Days before trashed documents are permanently deleted"
        >
          <select
            value={get<number>(SETTINGS_KEYS.EMPTY_TRASH_DELAY)}
            onChange={(e) =>
              set(SETTINGS_KEYS.EMPTY_TRASH_DELAY, Number(e.target.value))
            }
            className="px-2 py-1 rounded text-xs bg-white/[0.04] border border-white/10 text-slate-200"
          >
            {[7, 14, 30, 60, 90].map((n) => (
              <option key={n} value={n} className="bg-slate-800">
                {n} days
              </option>
            ))}
          </select>
        </SettingRow>
      </Section>
    </div>
  );
}
