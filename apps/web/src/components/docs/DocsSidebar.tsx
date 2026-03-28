"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  BookOpen, 
  Terminal, 
  Settings, 
  Zap, 
  GitFork, 
  Layers, 
  FileJson 
} from "lucide-react";

const sidebarNavItems = [
  {
    title: "Getting Started",
    href: "/docs/getting-started",
    icon: BookOpen,
  },
  {
    title: "Core Concepts",
    href: "/docs/concepts",
    icon: Layers,
  },
  {
    title: "SDK Reference",
    href: "/docs/sdk-reference",
    icon: Terminal,
  },
  {
    title: "Deterministic Replay",
    href: "/docs/replay",
    icon: Zap,
  },
  {
    title: "Branching",
    href: "/docs/branching",
    icon: GitFork,
  },
  {
    title: "Configuration",
    href: "/docs/configuration",
    icon: Settings,
  },
  {
    title: "REST API",
    href: "/docs/api-reference",
    icon: FileJson,
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="docs-sidebar sticky top-24 w-64 shrink-0 hidden lg:block overflow-y-auto max-h-[calc(100vh-8rem)]">
      <div className="space-y-1 pr-4">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-6 px-3">
          Documentation
        </p>
        {sidebarNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-accent-foreground" : "text-muted-foreground/60 group-hover:text-foreground"
              )} />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
