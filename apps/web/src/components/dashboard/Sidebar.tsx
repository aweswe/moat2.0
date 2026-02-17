"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Activity,
    Terminal,
    Settings,
    Users,
    HelpCircle,
    Zap
} from "lucide-react";

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', href: '/dashboard/jobs', icon: Activity },
    { name: 'Traces', href: '/dashboard/traces', icon: Terminal },
    { name: 'Team', href: '/dashboard/team', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col border-r border-border bg-card">
            <div className="flex h-16 items-center px-6">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-sm bg-blue-950/30 border border-brand/30 flex items-center justify-center group-hover:border-brand/50 transition-colors">
                        <div className="w-2 h-2 bg-brand rounded-sm shadow-[0_0_10px_rgba(70,130,180,0.5)]" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-foreground">
                        AgentTrace
                    </span>
                </Link>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-brand/10 text-brand"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 shrink-0",
                                isActive ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3 h-3 text-brand" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Beta Preview</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Deterministic execution tracking active.
                    </p>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-1">
                <Link
                    href="/docs"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <HelpCircle className="w-4 h-4" />
                    Documentation
                </Link>
            </div>
        </div>
    );
}
