import { motion } from "framer-motion";
import { Clock, Shuffle, MessageSquare, FolderOpen, Terminal } from "lucide-react";

const interceptionPoints = [
  {
    icon: Clock,
    label: "Time",
    description: "System clock, timestamps, and timeouts are intercepted and frozen.",
    streamKey: "time"
  },
  {
    icon: Shuffle,
    label: "Randomness",
    description: "Entropy sources and UUIDs are seeded deterministically.",
    streamKey: "random"
  },
  {
    icon: MessageSquare,
    label: "LLM Calls",
    description: "Network streams are captured, buffered, and perfectly replayed.",
    streamKey: "network"
  },
  {
    icon: FolderOpen,
    label: "Filesystem I/O",
    description: "File reads and writes are virtualized in a copy-on-write sandbox.",
    streamKey: "fs"
  }
];

export const DeterminismSection = () => {
  return (
    <section className="py-40 relative overflow-hidden bg-background">

      {/* Void Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20 opacity-5"
        style={{
          backgroundImage: `
                   linear-gradient(currentColor 1px, transparent 1px),
                   linear-gradient(90deg, currentColor 1px, transparent 1px)
                `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
          color: 'var(--foreground)'
        }}
      />

      {/* Time Axis Marker */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-24"
        >
          <span className="block font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground/70 mb-4 uppercase">
            &lt;The_Solution /&gt;
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] mb-6 text-foreground">
            The missing layer: <span className="text-foreground">Determinism</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto font-light">
            Intercepting every source of chaos at the syscall layer. <br />
            <span className="text-foreground font-normal">Every run becomes perfectly reproducible.</span>
          </p>
        </motion.div>

        {/* Living Grid - Cards Larger & Cleaner */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {interceptionPoints.map((point, i) => (
            <motion.div
              key={point.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative"
            >
              <div className={`
                    relative h-full min-h-[340px] p-8 rounded-2xl overflow-hidden transition-all duration-300
                    bg-card border border-border hover:border-foreground/30
                    flex flex-col
              `}>

                {/* Scanline Wipe */}
                <motion.div
                  initial={{ top: "0%" }}
                  whileInView={{ top: "100%" }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: 0.2 + (0.1 * i), duration: 0.8 }}
                  className="absolute inset-x-0 h-full bg-foreground/5 border-b border-foreground/10 z-20 pointer-events-none opacity-30"
                  style={{ background: 'linear-gradient(to bottom, transparent, currentColor)' }}
                />

                {/* Top Status */}
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                    Intercepted
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 mb-6">
                  <div className={`mb-6 w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground transition-colors duration-300`}>
                    <point.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-2xl text-foreground mb-3">
                    {point.label}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed transition-colors">
                    {point.description}
                  </p>
                </div>

                {/* Bottom Decor */}
                <div className="relative z-10 mt-auto pt-6 border-t border-border">
                  <div className="h-[1px] w-full bg-border group-hover:bg-foreground/40 transition-colors duration-300" />
                </div>

              </div>
            </motion.div>
          ))}
        </div>

        {/* Code Block Artifact - Monochrome & High Fidelity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto relative pl-4"
        >
          {/* Temporal Label */}
          <div className="absolute -left-10 top-12 -rotate-90 text-[10px] font-mono text-muted-foreground/50 origin-right tracking-widest">
            SNAPSHOT @ T=3.30s
          </div>

          {/* KEEP CODE BLOCK DARK FOR CONTRAST (Option: `bg-[#0A0A0A]` forced, text white forced) or ADAPT */}
          {/* Let's make it adapt to be dark in light mode too, or high contrast light mode. */}
          {/* Actually, user requested Black/White theme. A black terminal block on white background looks great. */}
          {/* So we will FORCE this block to remain dark theme even in light mode. */}
          <div className="relative rounded-2xl border border-border/50 bg-[#0A0A0A] shadow-2xl overflow-hidden group">

            {/* Header - Forced Dark */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="flex gap-2 opacity-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <span className="font-mono text-xs text-white/40 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  execution.trace
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                <span className="text-[10px] font-mono text-white/90 uppercase tracking-wider font-medium">
                  Snapshot Recorded
                </span>
              </div>
            </div>

            {/* Code Content - Forced Dark */}
            <div className="p-8 font-mono text-[14px] leading-relaxed bg-black text-white">
              <div className="space-y-6">
                <div className="flex gap-3 text-white/40 border-l-2 border-white/10 pl-3">
                  <span className="opacity-50">//</span>
                  <span>Intercepted execution state</span>
                </div>

                <div className="space-y-1">
                  {/* Highlighted Row */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center p-4 bg-white/[0.06] rounded-xl border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">sys</span>
                      <span className="text-white/30">.</span>
                      <span className="text-white font-bold">clock</span>
                      <span className="text-white/30">()</span>
                    </div>
                    <span className="text-white font-bold tracking-tight bg-black/50 px-3 py-1 rounded-lg border border-white/10">
                      1706745600000
                    </span>
                  </div>

                  {/* Standard Rows */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center p-3 px-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div>
                      <span className="text-white/60">entropy</span>
                      <span className="text-white/30">.</span>
                      <span className="text-white">source</span>
                      <span className="text-white/30">()</span>
                    </div>
                    <span className="text-white/50">"a1b2c3d4-e5f6..."</span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center p-3 px-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div>
                      <span className="text-white/60">fs</span>
                      <span className="text-white/30">.</span>
                      <span className="text-white">read</span>
                      <span className="text-white/30">("config")</span>
                    </div>
                    <span className="text-white/80">snapshot_v12</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center gap-3">
                  <span className="text-white/30 text-sm">//</span>
                  <span className="text-white/90 font-medium tracking-wide text-sm">
                    Result: <span className="underline decoration-white/30 underline-offset-4 decoration-1">Deterministic Replay</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};
