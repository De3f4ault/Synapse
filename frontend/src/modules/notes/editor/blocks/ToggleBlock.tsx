import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { ChevronRight, ChevronDown } from "lucide-react";

export const ToggleBlock = createReactBlockSpec(
  {
    type: "toggle",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      isOpen: {
        default: true, // Default to open
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const isOpen = props.block.props.isOpen;

      const handleToggle = () => {
        props.editor.updateBlock(props.block, {
          type: "toggle",
          props: { isOpen: !isOpen },
        });

        // Note: BlockNote doesn't natively hide children based on a prop.
        // The display logic for children usually happens in the editor view/theme.
        // However, for v1, we focus on the visual toggle state.
        // Real child hiding requires modifying the view or using extensive CSS selection
        // based on the [data-is-open] attribute we'll set.

        // ATTENTION: Standard BlockNote toggle lists handle children visibility internally if using list items.
        // For a custom block, we might rely on CSS to hide the .bn-block-children sibling?
        // Let's set the attribute and handle it in CSS.
      };

      return (
        <div
          className="toggle-block my-1 flex items-start"
          data-is-open={isOpen}
        >
          {/* Toggle Icon */}
          <div
            className="mr-2 mt-1 cursor-pointer select-none text-slate-500 transition-colors hover:text-cyan-400"
            contentEditable={false}
            onClick={handleToggle}
          >
            {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1" ref={props.contentRef} />
        </div>
      );
    },
  },
);
