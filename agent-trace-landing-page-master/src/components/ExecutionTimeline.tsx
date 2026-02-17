import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

export const ExecutionTimeline = () => {
  const [state, setState] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Exact State Map Duration: 8.5s
  const CYCLE_DURATION = 8500;

  useEffect(() => {
    setHasLoaded(true);
    const startTime = Date.now();

    const updateLoop = () => {
      const elapsed = (Date.now() - startTime) % CYCLE_DURATION;

      // STATE MAPPING
      // State 0: Idle (0 - 0.6s)
      // State 1: Recorded Execution (0.6 - 2.0s)
      // State 2: Failure Occurs (2.0 - 2.7s)
      // State 3: Deterministic Rewind (2.7 - 3.8s)
      // State 4: Fork Point (3.8 - 4.5s)
      // State 5: Re-execution (4.5 - 6.0s)
      // State 6: Successful Fix (6.0 - 7.0s)
      // State 7: Settle / Reset (7.0 - 8.5s)

      if (elapsed < 600) setState(0);
      else if (elapsed < 2000) setState(1);
      else if (elapsed < 2700) setState(2);
      else if (elapsed < 3800) setState(3);
      else if (elapsed < 4500) setState(4);
      else if (elapsed < 6000) setState(5);
      else if (elapsed < 7000) setState(6);
      else setState(7);

      requestAnimationFrame(updateLoop);
    };

    const handle = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-20 px-4 mb-20 bg-muted/20 rounded-xl border border-border p-8 backdrop-blur-sm overflow-hidden">

      {/* NARRATIVE LABEL (Single Semantic Idea) */}
      <div className="absolute top-6 left-0 right-0 text-center z-30 pointer-events-none h-8 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/80 border border-border backdrop-blur-md transition-all duration-300 shadow-sm">
          {state >= 1 && state <= 6 && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
          <span className="text-xs font-mono tracking-wide text-foreground/90 transition-opacity duration-300">
            {state === 1 && "Recorded execution"}
            {state === 2 && "Failure reproduced"}
            {state === 3 && "Replaying exact execution"}
            {state === 4 && "Execution forked"}
            {state === 5 && "Fix verified in sandbox"}
            {state === 6 && "Execution fixed"}
            {(state === 0 || state === 7) && <span className="opacity-50">System Ready</span>}
          </span>
        </div>
      </div>

      {/* Main timeline container */}
      <div className="relative h-64 w-full">
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 800 200" preserveAspectRatio="none">

          <defs>
            <style>
              {`
                 .path-base { transition: stroke-opacity 0.5s ease; }
               `}
            </style>
          </defs>

          {/* STATIC AXIS */}
          <line x1="0" y1="190" x2="800" y2="190" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="text-foreground" />
          {[0, 200, 400, 600, 800].map((x, i) => (
            <line key={i} x1={x} y1="190" x2={x} y2="194" stroke="currentColor" strokeOpacity="0.2" className="text-foreground" />
          ))}

          {/* LAYER 1: EXECUTION PATH */}

          {/* Main Reality (Fails) */}
          <motion.path
            d="M 50 140 L 400 140"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="path-base"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: hasLoaded ? 1 : 0,
              opacity: hasLoaded ? 1 : 0,
              strokeOpacity: (state === 0 || state === 7) ? 0.2 : (state >= 4 ? 0.3 : 1),
              stroke: (state === 3) ? "hsl(210, 100%, 70%)" : "hsl(var(--primary))", // Cool Overlay on Rewind
              strokeDasharray: (state === 3) ? "4 4" : "0 0" // Dashed on Rewind
            }}
            transition={{
              pathLength: { duration: 0.8, ease: "easeOut", delay: 0.2 },
              opacity: { duration: 0.5, delay: 0.1 },
              strokeOpacity: { duration: 0.5 },
              stroke: { duration: 0.3 },
              strokeDasharray: { duration: 0.3 }
            }}
          />

          {/* Crash Dip */}
          <motion.path
            d="M 400 140 L 420 160"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: (state === 2 || state === 3) ? 1 : 0 }} // Visible only on crash & rewind
            transition={{ duration: 0.2 }}
          />

          {/* Ghost Connector (Diff View) */}
          <motion.path
            d="M 320 140 L 320 90"
            fill="none"
            stroke="hsl(210, 100%, 70%)"
            strokeWidth="1"
            strokeDasharray="2 4"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: state === 4 ? 0.5 : 0,
              pathLength: state === 4 ? 1 : 0
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Forked Reality (Success) */}
          <motion.path
            d="M 320 140 C 350 140, 320 90, 380 90 L 750 90"
            fill="none"
            stroke="hsl(var(--primary))" // Will turn green on fix
            strokeWidth="3" // Slightly brighter/thicker
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: state >= 5 ? 1 : 0,
              opacity: state >= 4 ? 1 : 0,
              stroke: state >= 6 ? "hsl(var(--success))" : "hsl(var(--primary))"
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

        </svg>

        {/* REALITY SHIFT TINT (State 4) */}
        {state === 4 && (
          <motion.div
            className="absolute inset-0 bg-blue-500/5 mix-blend-overlay z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {/* LAYER 2: TIME CURSOR (Vertical Playhead) */}
        <motion.div
          className="absolute top-0 bottom-0 w-px bg-foreground/40 z-10"
          style={{ boxShadow: "0 0 10px 1px rgba(125,125,125,0.1)" }}
          animate={{
            left: state === 0 ? "6.25%"   // 50px at start
              : state === 1 ? "50%"     // 400px (Crash)
                : state === 2 ? "50%"     // Pause at Crash
                  : state === 3 ? "40%"     // Rewind to 320px
                    : state === 4 ? "40%"     // Pause at Fork
                      : state === 5 ? "93.75%"  // Forward to End (750px)
                        : state === 6 ? "93.75%"  // Pause at End
                          : "6.25%"                 // Reset
          }}
          transition={{
            duration: state === 1 ? 1.4  // Slow record
              : state === 3 ? 1.1  // Deterministic Rewind
                : state === 5 ? 1.5  // Re-exec
                  : state === 7 ? 1.5  // Soft Reset
                    : 0,                 // Pauses are instant (held by keyframe)
            ease: (state === 1 || state === 5) ? "easeInOut" : "linear" // Magnetic Snap Effect
          }}
        >
          {/* Playhead Dot */}
          <div className="absolute top-[140px] -translate-x-1/2 w-2 h-2 bg-foreground rounded-full shadow-lg transition-all duration-500"
            style={{ top: state >= 5 ? "90px" : "140px" }} // Jumps to upper track on fork
          />
        </motion.div>


        {/* NODES & SEMANTIC MARKERS */}

        {/* Crash Marker (State 2) */}
        <motion.div
          className="absolute left-[50%] top-[140px] -translate-x-1/2 -translate-y-1/2 z-20"
          animate={{
            scale: state === 2 ? [1, 1.2, 1] : 0,
            opacity: state === 2 ? 1 : 0,
            x: state === 2 ? [-2, 2, -2, 2, 0] : 0 // Micro-shock shake
          }}
          transition={{
            scale: { duration: 0.3 },
            x: { duration: 0.2, type: "tween" }
          }}
        >
          <div className="text-destructive font-bold text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">✕</div>

          {/* Ripple Effect */}
          {state === 2 && (
            <motion.div
              className="absolute inset-0 rounded-full border border-destructive"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </motion.div>

        {/* Fork Marker (State 4) */}
        <motion.div
          className="absolute left-[40%] top-[140px] -translate-x-1/2 -translate-y-1/2 z-20"
          animate={{
            scale: state >= 4 ? 1 : 0,
            opacity: state >= 4 ? 1 : 0,
            scaleX: state === 4 ? [1, 1.5, 1] : 1 // "Reality Split" Stretch
          }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-3 h-3 border-2 border-blue-400 bg-background rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
        </motion.div>

        {/* Success Marker (State 6) */}
        <motion.div
          className="absolute left-[93.75%] top-[90px] -translate-x-1/2 -translate-y-1/2 z-20"
          animate={{ scale: state === 6 ? [0.8, 1.2, 1] : 0, opacity: state === 6 ? 1 : 0 }}
        >
          <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center shadow-[0_0_15px_var(--success)]">
            <span className="text-black text-[10px] font-bold">✓</span>
          </div>
        </motion.div>

      </div>

      {/* LAYER 3: EVENT LOG (Bottom) */}
      <div className="mt-8 border-t border-border/50 pt-4">
        <div className="flex justify-between px-4 pb-2 mb-2">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Active Event Log</span>
          <span className="text-[10px] font-mono text-muted-foreground/50">READ_ONLY</span>
        </div>

        <div className="flex items-center justify-between gap-1">
          {[
            { id: "INIT", stateReq: 1 },
            { id: "PLAN", stateReq: 1 },
            { id: "EXEC", stateReq: 1 },
            { id: "ERR", stateReq: 2, color: "text-destructive" },
            { id: "FORK", stateReq: 4, color: "text-blue-400" },
            { id: "RE-EXEC", stateReq: 5 },
            { id: "FIX", stateReq: 6, color: "text-success" }
          ].map((ev, i) => {
            // Logic for highlighting based on state progression
            const isHighlighted =
              (state === 1 && i <= 2) || // Recorded: Init, Plan, Exec
              (state === 2 && i === 3) || // Failure: Err
              (state === 3 && i <= 2) || // Rewind: Back to Exec
              (state === 4 && i === 4) || // Fork: Fork
              (state === 5 && i === 5) || // Re-exec: Re-exec
              (state === 6 && i === 6);   // Fix: Fix

            return (
              <div
                key={i}
                className={`
                            flex-1 h-8 rounded border flex items-center justify-center transition-all duration-300
                            ${isHighlighted
                    ? "bg-muted/30 border-border shadow-sm"
                    : "bg-muted/10 border-transparent opacity-30"}
                        `}
              >
                <span className={`text-[9px] font-mono bold ${ev.color || "text-muted-foreground"}`}>
                  {ev.id}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm font-mono text-muted-foreground/60">
          Record execution. Rewind time. Fork safely. Verify fixes.
        </p>
      </div>

    </div>
  );
};
