import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TimeflowAnimationProps {
    onStepChange?: (step: number) => void;
}

export const TimeflowAnimation = ({ onStepChange }: TimeflowAnimationProps) => {
    const [t, setT] = useState(0);

    // Cycle Duration: 8s (Infinite Loop)
    const DURATION = 8000;

    useEffect(() => {
        let start = Date.now();
        const loop = () => {
            const now = Date.now();
            const elapsed = (now - start) % DURATION;
            const normalizedT = elapsed / DURATION; // 0 to 1
            setT(normalizedT);

            // Calculate active step based on phase
            // Phase 1: Record (0s - 1.5s) -> Step 0 (0 - 0.1875)
            // Phase 2: Crash (1.5s - 2.2s) -> Step 1 (0.1875 - 0.275)
            // Phase 3: Rewind (2.2s - 3.2s) -> Step 2 (0.275 - 0.4)
            // Phase 4: Fork (3.2s - 5s) -> Step 3 (0.4 - 0.625)
            // Phase 5: Ship (5s - 6.5s) -> Step 4 (0.625 - 0.8125)
            // Phase 6: Reset (6.5s - 8s) -> Step 4 (hold) or Reset (-1)

            if (onStepChange) {
                if (normalizedT < 0.1875) onStepChange(0); // Record
                else if (normalizedT < 0.275) onStepChange(1); // Replay (Crash)
                else if (normalizedT < 0.4) onStepChange(2); // Inspect (Rewind)
                else if (normalizedT < 0.625) onStepChange(3); // Fork
                else if (normalizedT < 0.8125) onStepChange(4); // Ship
                else onStepChange(-1); // Reset/Fade
            }

            requestAnimationFrame(loop);
        };
        const handle = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(handle);
    }, [onStepChange]);

    // Derived Values for animation logic
    const recordProgress = Math.min(Math.max(t / 0.1875, 0), 1);
    const isCrashed = t >= 0.1875;

    // Rewind: 2.2s starts (0.275) ends 3.2s (0.4)
    // We want to scrub back from Crash Point (approx 350px) to Fork Point (approx 250px)
    const rewindProgress = t >= 0.275 && t < 0.4
        ? (t - 0.275) / 0.125
        : (t >= 0.4 ? 1 : 0);

    // Fork Growth: 3.2s (0.4) to 5s (0.625)
    const forkProgress = t >= 0.4 && t < 0.625
        ? (t - 0.4) / 0.225
        : (t >= 0.625 ? 1 : 0);

    // Ship: 5s (0.625)
    const isShipped = t >= 0.625;

    return (
        <div className="w-full h-[500px] bg-card/50 border border-border rounded-2xl backdrop-blur-xl relative overflow-hidden flex items-center justify-center shadow-2xl text-foreground">

            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "40px 40px" }}
            />

            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 600 400">
                <defs>
                    <filter id="glow-brand" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 1. BASELINE (The Past) */}
                <motion.path
                    d="M 50 200 L 400 200"
                    fill="none"
                    stroke={t > 0.4 ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))"} // Dims after fork
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{
                        pathLength: isCrashed ? 1 : recordProgress,
                        opacity: t > 0.8125 ? 0 : 1 // Fade out on reset
                    }}
                    transition={{ duration: 0 }}
                />

                {/* 2. CRASH POINT */}
                <motion.g animate={{ opacity: isCrashed && t < 0.8125 ? 1 : 0 }}>
                    <circle cx="400" cy="200" r="6" fill="#ef4444" filter="url(#glow-red)" />
                    {/* Impact Pulse (Phase 2) */}
                    {t >= 0.1875 && t < 0.275 && (
                        <circle cx="400" cy="200" r="20" stroke="#ef4444" strokeWidth="1" fill="none" opacity="0.5">
                            <animate attributeName="r" from="6" to="30" dur="0.7s" repeatCount="1" />
                            <animate attributeName="opacity" from="1" to="0" dur="0.7s" repeatCount="1" />
                        </circle>
                    )}
                </motion.g>

                {/* 3. REWIND / HEAD (The Time Machine) */}
                {/* Using a dot that travels forward, then backwards */}
                <motion.circle
                    r="4"
                    fill="#4682b4"
                    filter="url(#glow-brand)"
                    animate={{
                        cx: t < 0.1875 ? 50 + (350 * recordProgress) : // Forward
                            t < 0.275 ? 400 : // Crash Stop
                                t < 0.4 ? 400 - (150 * rewindProgress) : // Rewind to Fork (250)
                                    t < 0.625 ? 250 + (300 * forkProgress) : // Fork Travel (approx)
                                        550, // End
                        cy: t < 0.4 ? 200 : // Main line
                            200, // Visual simplification: keep dot on line for now, or animate accurately if needed. 
                        // For exact curve following we'd need motion path. 
                        // Given time constraints, letting the LINE grow is the hero, dot can fade or just move linearly.
                        opacity: (t >= 0.4) ? 0 : (t > 0.8125 ? 0 : 1) // Hide dot after fork starts, let the line growth take over
                    }}
                />

                {/* 4. NEW BRANCH (The Future) */}
                <motion.path
                    d="M 250 200 C 300 200, 300 120, 350 120 L 550 120"
                    fill="none"
                    stroke="#4682b4"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{
                        pathLength: t >= 0.4 ? forkProgress : 0,
                        opacity: t > 0.8125 ? 0 : 1
                    }}
                    filter="url(#glow-brand)"
                    transition={{ duration: 0 }}
                />

                {/* 5. SHIP VERIFIED */}
                <motion.g animate={{ opacity: isShipped && t < 0.8125 ? 1 : 0 }}>
                    <circle cx="550" cy="120" r="6" fill="#22c55e" />
                    <text x="550" y="100" textAnchor="middle" fill="#22c55e" fontSize="10" fontFamily="monospace" fontWeight="bold">FIX VERIFIED</text>
                    {/* Success Pulse */}
                    <circle cx="550" cy="120" r="20" stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.5">
                        <animate attributeName="r" from="6" to="30" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                </motion.g>

            </svg>
        </div>
    );
};
