"use client";

import { usePathname, useRouter } from "next/navigation";

const sidebarNavItems = [
  { title: "Getting Started", href: "/docs/getting-started" },
  { title: "Core Concepts", href: "/docs/concepts" },
  { title: "SDK Reference", href: "/docs/sdk-reference" },
  { title: "Deterministic Replay", href: "/docs/replay" },
  { title: "Branching", href: "/docs/branching" },
  { title: "Configuration", href: "/docs/configuration" },
  { title: "REST API", href: "/docs/api-reference" },
];

export function DocsMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Find current item to display default title if needed, though value={pathname} handles it.
  
  return (
    <div className="lg:hidden w-full mb-8">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3 px-1">
        Documentation
      </p>
      <select 
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring text-foreground appearance-none"
        value={pathname}
        onChange={(e) => router.push(e.target.value)}
      >
        <option value="" disabled>Select documentation page</option>
        {sidebarNavItems.map((item) => (
          <option key={item.href} value={item.href}>
            {item.title}
          </option>
        ))}
      </select>
    </div>
  );
}
