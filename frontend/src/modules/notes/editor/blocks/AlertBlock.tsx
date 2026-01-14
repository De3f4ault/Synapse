import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react"; // We might replace this with Radix later, but for now let's stick to standard if possible,
// BUT we agreed to use Radix/Tailwind.
// BlockNote's createReactBlockSpec renders inside the editor.
// If we want a dropdown menu for the icon, we need a component.
// Synapse has Radix. Let's use a simple HTML/Tailwind implementation for the block itself
// and maybe skip the complex menu for v1, or build a simple click-to-cycle.

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

// The types of alerts
export const ALERT_TYPES = {
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    title: "Warning",
  },
  error: {
    icon: X,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    title: "Error",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    title: "Info",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    title: "Success",
  },
} as const;

type AlertType = keyof typeof ALERT_TYPES;

export const AlertBlock = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning",
        values: ["warning", "error", "info", "success"] as AlertType[],
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const alertTypeKey = (props.block.props.type as AlertType) || "warning";
      const config = ALERT_TYPES[alertTypeKey];
      const Icon = config.icon;

      return (
        <div
          className={`my-2 flex w-full rounded-lg border p-4 ${config.bg} ${config.border}`}
          data-alert-type={alertTypeKey}
        >
          {/* Icon - Click to cycle types */}
          <div
            className={`mr-4 cursor-pointer select-none ${config.color}`}
            contentEditable={false}
            onClick={() => {
              const types = Object.keys(ALERT_TYPES) as AlertType[];
              const currentIndex = types.indexOf(alertTypeKey);
              const nextType = types[(currentIndex + 1) % types.length];

              props.editor.updateBlock(props.block, {
                type: "alert",
                props: { type: nextType },
              });
            }}
          >
            <Icon size={24} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1" ref={props.contentRef} />
        </div>
      );
    },
  },
);
