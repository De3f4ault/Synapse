import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Skeleton } from "./SkeletonCard";

interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
    className?: string;
}

/**
 * SkeletonTable Component
 *
 * Placeholder skeleton for table data while loading.
 *
 * Features:
 * - Configurable rows and columns
 * - Optional header row
 * - Shimmer animation
 * - Alternating row backgrounds (zebra striping)
 * - Responsive column widths
 *
 * @example
 * // Basic table
 * <SkeletonTable rows={10} columns={5} />
 *
 * // Without header
 * <SkeletonTable rows={8} columns={4} showHeader={false} />
 *
 * // Custom styling
 * <SkeletonTable rows={15} columns={6} className="border rounded-lg" />
 */
export function SkeletonTable({
    rows = 5,
    columns = 4,
    showHeader = true,
    className,
}: SkeletonTableProps) {
    // Generate random but consistent widths for columns
    const columnWidths = Array.from({ length: columns }, () => {
        return 60 + Math.random() * 30; // 60-90%
    });

    return (
        <div className={cn("rounded-md border", className)} aria-busy="true" aria-label="Loading table">
        <Table>
        {showHeader && (
            <TableHeader>
            <TableRow>
            {Array.from({ length: columns }).map((_, colIndex) => (
                <TableHead key={colIndex}>
                <Skeleton
                className="h-4"
                style={{ width: `${columnWidths[colIndex]}%` }}
                />
                </TableHead>
            ))}
            </TableRow>
            </TableHeader>
        )}
        <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow
            key={rowIndex}
            className={cn(rowIndex % 2 === 0 && "bg-muted/20")}
            >
            {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                <Skeleton
                className="h-4"
                style={{
                    width: `${
                        columnWidths[colIndex] - Math.random() * 20
                    }%`,
                }}
                />
                </TableCell>
            ))}
            </TableRow>
        ))}
        </TableBody>
        </Table>
        </div>
    );
}

/**
 * SkeletonTableWithActions Component
 *
 * Table skeleton with action buttons in the last column
 */
export function SkeletonTableWithActions({
    rows = 5,
    columns = 4,
    className,
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div className={cn("rounded-md border", className)} aria-busy="true" aria-label="Loading table">
        <Table>
        <TableHeader>
        <TableRow>
        {Array.from({ length: columns }).map((_, colIndex) => (
            <TableHead key={colIndex}>
            <Skeleton className="h-4 w-3/4" />
            </TableHead>
        ))}
        <TableHead className="w-[100px]">
        <Skeleton className="h-4 w-16" />
        </TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                <Skeleton className="h-4 w-4/5" />
                </TableCell>
            ))}
            <TableCell>
            <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            </div>
            </TableCell>
            </TableRow>
        ))}
        </TableBody>
        </Table>
        </div>
    );
}

/**
 * SkeletonTableCompact Component
 *
 * Compact table skeleton with smaller cells
 */
export function SkeletonTableCompact({
    rows = 10,
    columns = 3,
    className,
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div className={cn("rounded-md border", className)} aria-busy="true" aria-label="Loading table">
        <Table>
        <TableHeader>
        <TableRow>
        {Array.from({ length: columns }).map((_, colIndex) => (
            <TableHead key={colIndex} className="h-8">
            <Skeleton className="h-3 w-2/3" />
            </TableHead>
        ))}
        </TableRow>
        </TableHeader>
        <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex} className="h-10">
                <Skeleton className="h-3 w-3/4" />
                </TableCell>
            ))}
            </TableRow>
        ))}
        </TableBody>
        </Table>
        </div>
    );
}
