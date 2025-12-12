import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Breadcrumbs Component (ENHANCED)
 *
 * Navigation breadcrumbs with:
 * - Clickable links
 * - Icons for each level
 * - Overflow handling (show "..." for hidden items)
 * - Dropdown for hidden breadcrumbs
 * - Responsive design
 */

interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: React.ReactNode;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    maxItems?: number; // Maximum items to show before collapsing
}

export function Breadcrumbs({ items, maxItems = 4 }: BreadcrumbsProps) {
    const shouldCollapse = items.length > maxItems;

    // If collapsing, show first, last, and "..." for middle items
    const visibleItems = shouldCollapse
    ? [
        items[0],
        ...items.slice(1, -1),
        items[items.length - 1],
    ]
    : items;

    const hiddenItems = shouldCollapse ? items.slice(1, -1) : [];

    return (
        <nav className="flex items-center" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-1 sm:space-x-2">
        {/* Home Icon (always first) */}
        <li className="flex items-center">
        {items[0]?.href ? (
            <Link
            to={items[0].href}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
            <Home className="h-4 w-4" />
            </Link>
        ) : (
            <span className="flex items-center text-muted-foreground">
            <Home className="h-4 w-4" />
            </span>
        )}
        </li>

        {/* Remaining items */}
        {items.slice(1).map((item, index) => {
            const isLast = index === items.length - 2;
            const shouldHide = shouldCollapse && index > 0 && index < items.length - 2;

            // Hidden items dropdown
            if (shouldHide && index === 1) {
                return (
                    <Fragment key="dropdown">
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-muted-foreground hover:text-foreground"
                    >
                    <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                    {hiddenItems.map((hiddenItem, hiddenIndex) => (
                        <DropdownMenuItem key={hiddenIndex} asChild>
                        {hiddenItem.href ? (
                            <Link to={hiddenItem.href} className="flex items-center gap-2">
                            {hiddenItem.icon}
                            {hiddenItem.label}
                            </Link>
                        ) : (
                            <span className="flex items-center gap-2">
                            {hiddenItem.icon}
                            {hiddenItem.label}
                            </span>
                        )}
                        </DropdownMenuItem>
                    ))}
                    </DropdownMenuContent>
                    </DropdownMenu>
                    </Fragment>
                );
            }

            if (shouldHide) {
                return null;
            }

            return (
                <Fragment key={index}>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <li className="flex items-center">
                {item.href && !isLast ? (
                    <Link
                    to={item.href}
                    className={cn(
                        'flex items-center gap-1.5 text-sm font-medium transition-colors',
                        'text-muted-foreground hover:text-foreground'
                    )}
                    >
                    {item.icon}
                    <span className="truncate max-w-[200px]">{item.label}</span>
                    </Link>
                ) : (
                    <span
                    className={cn(
                        'flex items-center gap-1.5 text-sm font-medium',
                        isLast ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    >
                    {item.icon}
                    <span className="truncate max-w-[200px]">{item.label}</span>
                    </span>
                )}
                </li>
                </Fragment>
            );
        })}
        </ol>
        </nav>
    );
}
