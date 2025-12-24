import { motion, useMotionValue, useTransform, PanInfo, animate } from "framer-motion";
import { Brain, Zap, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FlashcardResponse } from "@/api/generated";
import { useState, useEffect } from "react";

interface ReviewCardProps {
    card: FlashcardResponse;
    isFlipped: boolean;
    onFlip: () => void;
    onSwipe: (quality: number) => void;
    disabled?: boolean;
}

export function ReviewCard({
    card,
    isFlipped,
    onFlip,
    onSwipe,
    disabled = false,
}: ReviewCardProps) {
    // Drag / Swipe Motion Values
    const x = useMotionValue(0);
    const tiltRotate = useTransform(x, [-300, 0, 300], [-10, 0, 10]);
    const dragOpacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
    const [isDragging, setIsDragging] = useState(false);

    // Flip Motion Values (Manual Culling)
    const flipRotation = useMotionValue(0);

    // Front face visible from 0 to 90 degrees
    const frontOpacity = useTransform(flipRotation, [89, 90], [1, 0]);
    const frontPointerEvents = useTransform(flipRotation, (v) => v < 90 ? "auto" : "none");

    // Back face visible from 90 to 180 degrees
    const backOpacity = useTransform(flipRotation, [90, 91], [0, 1]);
    const backPointerEvents = useTransform(flipRotation, (v) => v >= 90 ? "auto" : "none");

    // Animate flip state
    useEffect(() => {
        animate(flipRotation, isFlipped ? 180 : 0, {
            type: "spring",
            stiffness: 260,
            damping: 20,
        });
    }, [isFlipped, flipRotation]);

    // Swipe Thresholds
    const handleDragEnd = (_: any, info: PanInfo) => {
        setIsDragging(false);
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset < -100 || velocity < -500) {
            onSwipe(1); // Again
        } else if (offset > 100 || velocity > 500) {
            if (offset > 200) {
                onSwipe(5); // Easy
            } else {
                onSwipe(3); // Good
            }
        } else {
            // Reset
        }
    };

    const getOverlayColor = (offset: number) => {
        if (offset < -50) return "bg-red-500/20";
        if (offset > 50 && offset < 150) return "bg-amber-500/20";
        if (offset >= 150) return "bg-green-500/20";
        return "bg-transparent";
    };

    return (
        <div className="w-full max-w-2xl mx-auto h-96 perspective-1000 relative">
            {/* Swipe Indicators (Behind the card) */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-0">
                <div className="flex flex-col items-center gap-2 text-red-500/50">
                    <div className="p-4 rounded-full border-2 border-red-500/30">
                        <X size={32} />
                    </div>
                    <span className="font-mono text-sm tracking-wider">AGAIN</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-green-500/50">
                    <div className="p-4 rounded-full border-2 border-green-500/30">
                        <Check size={32} />
                    </div>
                    <span className="font-mono text-sm tracking-wider">GOOD / EASY</span>
                </div>
            </div>

            {/* Draggable Wrapper */}
            <motion.div
                className="w-full h-full relative z-10"
                drag={isFlipped && !disabled ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                style={{ x, rotate: tiltRotate, opacity: dragOpacity, cursor: isFlipped ? "grab" : "pointer" }}
                whileTap={{ cursor: isFlipped ? "grabbing" : "pointer" }}
                onClick={() => {
                    if (!isDragging && !disabled) {
                        onFlip();
                    }
                }}
            >
                {/* 3D Flipping Inner Container */}
                <motion.div
                    className="w-full h-full relative"
                    style={{ transformStyle: "preserve-3d", rotateY: flipRotation }}
                >
                    {/* ================= FRONT FACE ================= */}
                    <motion.div
                        className="absolute inset-0"
                        style={{
                            opacity: frontOpacity,
                            pointerEvents: frontPointerEvents,
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(0deg) translateZ(1px)" // Spatial separation
                        }}
                    >
                        <Card className="w-full h-full relative overflow-hidden bg-[#080a0e] border border-cyan-500/20 flex flex-col items-center justify-center p-8 shadow-2xl">
                            {/* Decorative Sci-Fi Elements */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-900 to-transparent opacity-30" />
                            <div className="absolute top-6 left-6 text-[10px] font-mono text-cyan-500/60 tracking-[0.2em] flex items-center gap-2">
                                <Brain size={14} />
                                :: NEURA_LINK ::
                            </div>

                            {/* Content */}
                            <h2 className="text-3xl md:text-4xl font-serif text-slate-200 text-center relative z-10 leading-relaxed">
                                {card.front_text}
                            </h2>

                            {/* Footer */}
                            <div className="absolute bottom-8 flex flex-col items-center gap-2 animate-pulse">
                                <div className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest">
                                    Tap to Decrypt
                                </div>
                                <div className="w-1 h-1 rounded-full bg-cyan-500" />
                            </div>
                        </Card>
                    </motion.div>

                    {/* ================= BACK FACE ================= */}
                    <motion.div
                        className="absolute inset-0"
                        style={{
                            opacity: backOpacity,
                            pointerEvents: backPointerEvents,
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg) translateZ(1px)" // Spatial separation
                        }}
                    >
                        <Card className="w-full h-full relative overflow-hidden bg-[#0a0c12] border border-purple-500/20 flex flex-col items-center justify-center p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                            {/* Dynamic Swipe Overlay */}
                            <motion.div
                                className={cn("absolute inset-0 z-0 transition-colors duration-200", getOverlayColor(x.get()))}
                                style={{ opacity: useTransform(x, [-150, 0, 150], [0.3, 0, 0.3]) }}
                            />

                            {/* Decorative Sci-Fi Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />
                            <div className="absolute top-6 right-6 text-[10px] font-mono text-purple-500/60 tracking-[0.2em] flex items-center gap-2">
                                :: DATA_CORE ::
                                <Zap size={14} />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 text-center w-full">
                                <p className="text-xl md:text-2xl font-sans text-white/90 leading-relaxed">
                                    {card.back_text}
                                </p>

                                {card.back_media_url && (
                                    <div className="mt-6 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                                        <img src={card.back_media_url} alt="Reference" className="max-h-40 object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Swipe Hints */}
                            <div className="absolute bottom-6 w-full px-12 flex justify-between text-[10px] font-mono text-white/20 uppercase tracking-widest">
                                <span>&lt; REJECT</span>
                                <span>ACCEPT &gt;</span>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}
