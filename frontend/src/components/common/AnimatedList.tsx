import { ReactNode } from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    staggerDelay?: number;
    duration?: number;
    direction?: "up" | "down" | "left" | "right";
}

/**
 * AnimatedList Component
 *
 * Stagger-in animation for lists of items.
 * Children fade in and slide up/down/left/right with a stagger delay.
 *
 * Features:
 * - Configurable stagger delay between items
 * - Multiple slide directions
 * - Customizable duration and initial delay
 * - Works with any children (automatically wraps each child)
 * - Accessible (no animation for prefers-reduced-motion)
 *
 * @example
 * <AnimatedList>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </AnimatedList>
 *
 * // Custom timing
 * <AnimatedList staggerDelay={0.1} direction="left">
 *   {items.map(item => <ItemCard key={item.id} {...item} />)}
 * </AnimatedList>
 */
export function AnimatedList({
    children,
    className,
    delay = 0,
    staggerDelay = 0.05,
    duration = 0.4,
    direction = "up",
}: AnimatedListProps) {
    // Container variants for stagger animation
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                delayChildren: delay,
                staggerChildren: staggerDelay,
            },
        },
    };

    // Get initial position based on direction
    const getInitialPosition = () => {
        switch (direction) {
            case "up":
                return { y: 20, x: 0 };
            case "down":
                return { y: -20, x: 0 };
            case "left":
                return { x: 20, y: 0 };
            case "right":
                return { x: -20, y: 0 };
        }
    };

    // Item variants for individual items
    const itemVariants: Variants = {
        hidden: {
            opacity: 0,
            ...getInitialPosition(),
        },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                duration,
                ease: "easeOut",
            },
        },
    };

    return (
        <motion.div
        className={cn(className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        >
        {Array.isArray(children)
            ? children.map((child, index) => (
                <motion.div key={index} variants={itemVariants}>
                {child}
                </motion.div>
            ))
            : <motion.div variants={itemVariants}>{children}</motion.div>
        }
        </motion.div>
    );
}

/**
 * AnimatedListItem Component
 *
 * Individual item wrapper for more control.
 * Use when you need custom keys or more complex list structures.
 *
 * @example
 * <motion.ul variants={containerVariants} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <AnimatedListItem key={item.id}>
 *       <ItemComponent {...item} />
 *     </AnimatedListItem>
 *   ))}
 * </motion.ul>
 */
export function AnimatedListItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const itemVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 20,
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                ease: "easeOut",
            },
        },
    };

    return (
        <motion.div className={cn(className)} variants={itemVariants}>
        {children}
        </motion.div>
    );
}

/**
 * Container variants export for custom implementations
 */
export const listContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

export const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut",
        },
    },
};
