import { createReactInlineContentSpec } from "@blocknote/react";

// The Mention inline content.
export const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      user: {
        default: "Unknown",
      },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span className="mx-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-sm font-medium text-cyan-300">
        @{props.inlineContent.props.user}
      </span>
    ),
  },
);
