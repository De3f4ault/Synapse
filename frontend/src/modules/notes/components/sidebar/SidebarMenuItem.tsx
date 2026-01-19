import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarMenuItemProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  to?: string;
  active?: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  postfix?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SidebarMenuItem = React.forwardRef<HTMLDivElement, SidebarMenuItemProps>(
  (
    {
      icon,
      label,
      to,
      active,
      disabled,
      collapsed,
      onCollapsedChange,
      postfix,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const location = useLocation();
    const isActive = active !== undefined ? active : (to ? location.pathname === to : false);
    const isCollapsible = onCollapsedChange !== undefined;

    const content = (
      <div
        ref={ref}
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 min-h-[32px]",
          "text-sm font-medium rounded-md cursor-pointer transition-colors",
          "hover:bg-[#FFFFFF0A]",
          isActive ? "bg-[#FFFFFF10] text-blue-400" : "text-zinc-400",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {/* Icon & Collapse Arrow Container */}
        <div className="flex items-center gap-2 shrink-0">
          {isCollapsible && (
            <div
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onCollapsedChange?.(!collapsed);
              }}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  collapsed && "-rotate-90"
                )}
              />
            </div>
          )}
          
          {icon && (
            <span className={cn("flex items-center justify-center", isActive && "text-blue-400")}>
              {icon}
            </span>
          )}
        </div>

        {/* Label */}
        <div className="flex-1 truncate">{label}</div>

        {/* Postfix (Actions) */}
        {postfix && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {postfix}
          </div>
        )}
      </div>
    );

    if (to && !disabled) {
      return (
        <Link to={to} className="block w-full">
          {content}
        </Link>
      );
    }

    return content;
  }
);

SidebarMenuItem.displayName = "SidebarMenuItem";
