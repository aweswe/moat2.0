import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Header = () => {
  const location = useLocation();
  const isPricing = location.pathname === "/pricing";

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border" />

      <div className="container relative">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-blue-950/30 border border-brand/30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-brand rounded-sm shadow-[0_0_10px_rgba(70,130,180,0.5)]" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-foreground">
              AgentTrace
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              to="/#capabilities"
              onClick={(e) => scrollToSection(e, "capabilities")}
              className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Capabilities
            </Link>
            <Link to="/docs" className="text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link
              to="/pricing"
              className={`text-[15px] font-medium transition-colors ${isPricing ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pricing
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <ModeToggle />

            <div className="hidden md:flex items-center gap-4">
              <Link to="/signup">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                  Sign in
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="default" size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-medium h-9 px-4">
                  Get started
                </Button>
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <Link to="/signup">
                <Button variant="default" size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-medium h-9 px-4 text-xs">
                  Get started
                </Button>
              </Link>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mr-2">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
                  <div className="flex flex-col gap-8 mt-8">
                    <Link to="/" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-blue-950/30 border border-brand/30 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-brand rounded-sm shadow-[0_0_10px_rgba(70,130,180,0.5)]" />
                      </div>
                      <span className="font-semibold text-lg tracking-tight text-foreground">
                        AgentTrace
                      </span>
                    </Link>
                    <nav className="flex flex-col gap-6">
                      <Link
                        to="/#how-it-works"
                        onClick={(e) => scrollToSection(e, "how-it-works")}
                        className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        How it works
                      </Link>
                      <Link
                        to="/#capabilities"
                        onClick={(e) => scrollToSection(e, "capabilities")}
                        className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Capabilities
                      </Link>
                      <Link to="/docs" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Docs
                      </Link>
                      <Link to="/pricing" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Pricing
                      </Link>
                      <Link to="/signup" className="text-lg font-medium text-brand hover:text-brand/80 transition-colors">
                        Sign in
                      </Link>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
