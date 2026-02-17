import { motion } from "framer-motion";
import { Server, Box, Building, Terminal } from "lucide-react";

// Living Data Streams for "Living" Backgrounds (Monochrome Context)
const DATA_STREAMS = {
  infrastructure: [
    "INIT_CORE_SYSTEM...",
    "ALLOCATING_RESOURCES [OK]",
    "CHECKING_NODES... 100% ONLINE",
    "SYNC_RATE: 40ms",
    "LATENCY_CHECK: PASS",
    "UPSTREAM_LINK: ESTABLISHED"
  ],
  framework: [
    "IMPORT AGENT_KIT",
    "LOADING_TOOLS...",
    "> BRAIN_INIT",
    "> MEMORY_SHARD_01 MOUNTED",
    "EXECUTING_STEP_04",
    "DEBUG_MODE: ACTIVE"
  ],
  enterprise: [
    "AUDIT_LOG_START",
    "COMPLIANCE_CHECK: VERIFIED",
    "PII_FILTER: ACTIVE",
    "ENCRYPTION: AES-256",
    "ACCESS_CONTROL: ENFORCED",
    "POLICY_04: COMPLIANT"
  ]
};

const audiences = [
  {
    role: "PLATFORM OWNERS",
    title: "AI Infrastructure Teams",
    streamKey: "infrastructure",
    description: [
      "Building the execution layer for autonomous systems.",
      "You need deterministic primitives, not higher-level abstractions."
    ],
    subSignal: "Use case: Internal platforms, agent runtimes",
    icon: Server
  },
  {
    role: "FOUNDATION BUILDERS",
    title: "Agent Framework Builders",
    streamKey: "framework",
    description: [
      "Building frameworks others rely on.",
      "Your users need reproducible behavior, debuggable execution, and confidence."
    ],
    subSignal: "Use case: LangChain, CrewAI, Custom Stacks",
    isPrimary: true,
    icon: Box
  },
  {
    role: "PRODUCTION OPERATORS",
    title: "Enterprise AI Teams",
    streamKey: "enterprise",
    description: [
      "Deploying autonomous systems with real-world impact.",
      "Compliance, auditability, and reliability are non-negotiable."
    ],
    subSignal: "Use case: High-stakes workflows",
    icon: Building
  },
];

// Terminal Background Component
const TerminalBackground = ({ streamKey }: { streamKey: string }) => {
  // @ts-ignore
  const lines = DATA_STREAMS[streamKey] || [];
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.05] pointer-events-none select-none font-mono text-[12px] leading-relaxed p-6 text-foreground">
      <motion.div
        animate={{ y: ["0%", "-50%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="space-y-1"
      >
        {[...lines, ...lines, ...lines, ...lines].map((line, i) => (
          <div key={i} className="whitespace-nowrap">{line}</div>
        ))}
      </motion.div>
    </div>
  );
};

export const AudienceSection = () => {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Void Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20 opacity-5"
        style={{
          backgroundImage: `
                    linear-gradient(currentColor 1px, transparent 1px),
                    linear-gradient(90deg, currentColor 1px, transparent 1px)
                 `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
          color: 'var(--foreground)'
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-8 py-[160px]">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[700px] mx-auto text-center mb-[100px]"
        >
          <span className="block font-mono text-[12px] font-bold tracking-[0.16em] text-muted-foreground/60 mb-6 uppercase">
            &lt;Target_Systems /&gt;
          </span>
          <h2 className="text-[48px] md:text-[56px] font-bold tracking-[-0.03em] text-foreground mb-6 leading-[1.1]">
            Teams responsible for <br /><span className="text-foreground">production agents</span>
          </h2>
          <p className="text-[18px] font-normal text-muted-foreground/70 max-w-2xl mx-auto">
            When agents touch users, money, or infrastructure — <br className="hidden md:block" /> failure is no longer acceptable.
          </p>
        </motion.div>

        {/* 3-Card Active Layout - BIGGER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch perspective-1000">
          {audiences.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, scaleY: 0 }} // Boot-up effect
              whileInView={{ opacity: 1, scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i, duration: 0.5, ease: "circOut" }}
              className={`group relative ${a.isPrimary ? 'md:scale-[1.05] z-10' : 'z-0 opacity-80 hover:opacity-100'}`}
            >
              <div
                className={`
                        h-full min-h-[420px] flex flex-col p-10 rounded-2xl transition-all duration-300
                        bg-card relative overflow-hidden transform-gpu active:scale-[0.98]
                        border border-border hover:border-foreground/30
                        ${a.isPrimary ? 'shadow-[0_0_60px_rgba(70,130,180,0.1)] border-foreground/30' : ''}
                      `}
              >

                {/* Scanline Wipe Entry Overlay */}
                <motion.div
                  initial={{ top: "0%" }}
                  whileInView={{ top: "100%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + (0.1 * i), duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-x-0 h-full bg-foreground/5 border-b border-foreground/10 z-20 pointer-events-none opacity-30"
                  style={{ background: 'linear-gradient(to bottom, transparent, currentColor)' }}
                />

                {/* Top Status Bar */}
                <div className="flex justify-between items-center mb-10 border-b border-border pb-6 relative z-10">
                  <span className="text-[11px] font-mono font-bold tracking-[0.14em] uppercase text-muted-foreground/60 group-hover:text-foreground/80 transition-colors">
                    {a.role}
                  </span>
                  {/* Blinking Status Light */}
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-foreground/10" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 flex-grow">
                  <div className="flex flex-col gap-6 mb-8">
                    <div className="w-12 h-12 rounded bg-muted text-muted-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                      <a.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-[32px] font-bold tracking-tight text-foreground leading-tight">
                      {a.title}
                    </h3>
                  </div>

                  <div className="space-y-3 mb-10">
                    {a.description.map((line, idx) => (
                      <p key={idx} className="text-[16px] leading-relaxed text-muted-foreground/70 group-hover:text-foreground/90 transition-colors font-medium">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Bottom Meta */}
                <div className="pt-6 border-t border-border flex items-center gap-3 relative z-10 mt-auto">
                  <Terminal className="w-4 h-4 text-muted-foreground/40" />
                  <p className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wide truncate group-hover:text-foreground/60 transition-colors">
                    {a.subSignal}
                  </p>
                </div>

              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Line */}
        <div className="text-center mt-[120px] opacity-60">
          <p className="text-[16px] font-normal text-muted-foreground/50 font-sans leading-relaxed">
            If you don’t own production agents, AgentTrace is optional. <br />
            <span className="text-foreground/80">If you do — it becomes infrastructure.</span>
          </p>
        </div>

      </div>
    </section>
  );
};
