import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const VisionSection = () => {
  return (
    <section className="pt-40 pb-40 relative overflow-hidden bg-background">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, hsl(var(--primary) / 0.08) 0%, transparent 70%)"
        }}
      />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Vision statement */}
          <div className="space-y-6 mb-12">
            <p className="text-lg md:text-xl text-muted-foreground font-mono">
              Databases needed transactions.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-mono">
              Microservices needed tracing.
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-3xl font-semibold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70"
            >
              AI agents need determinism.
            </motion.p>
          </div>

          {/* Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            <Button variant="hero" size="xl">
              Start recording reality
            </Button>
            <p className="text-sm text-muted-foreground font-mono">
              Free for open source • Enterprise ready
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
