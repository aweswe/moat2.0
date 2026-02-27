"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AgentTraceLogo } from "@/components/ui/logo";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutDashboard,
    Activity,
    Terminal,
    Settings,
    Users,
    HelpCircle,
    Trash2,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut,
    User,
} from "lucide-react";

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Jobs', href: '/dashboard/jobs', icon: Activity },
    { name: 'Traces', href: '/dashboard/traces', icon: Terminal },
    { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
    { name: 'Team', href: '/dashboard/team', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const { user, signOut } = useAuth();

    const initials = user?.name?.substring(0, 2)?.toUpperCase() || "U";

    return (
        <div className={cn(
            "flex h-full flex-col border-r border-border/60 bg-muted/40 transition-all duration-200",
            collapsed ? "w-14" : "w-60"
        )}>
            {/* Header: Logo + Toggle */}
            <div className={cn(
                "flex h-14 items-center border-b border-border/30",
                collapsed ? "justify-center px-2" : "justify-between px-4"
            )}>
                {collapsed ? (
                    <button
                        onClick={onToggle}
                        className="flex items-center justify-center w-8 h-8 rounded hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors"
                        title="Expand sidebar"
                    >
                        <PanelLeftOpen className="w-4 h-4" />
                    </button>
                ) : (
                    <>
                        <Link href="/" className="flex items-center gap-2 group min-w-0">
                            <div className="w-7 h-7 rounded bg-foreground/10 flex items-center justify-center shrink-0">
                                <AgentTraceLogo size={16} className="text-foreground" />
                            </div>
                            <span className="font-semibold text-[15px] tracking-tight text-foreground truncate">
                                AgentTrace
                            </span>
                        </Link>
                        <button
                            onClick={onToggle}
                            className="flex items-center justify-center w-7 h-7 rounded hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
                            title="Collapse sidebar"
                        >
                            <PanelLeftClose className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Nav */}
            <nav className={cn("flex-1 space-y-0.5 py-3", collapsed ? "px-1.5" : "px-3")}>
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={collapsed ? item.name : undefined}
                            className={cn(
                                "group flex items-center rounded-md transition-colors",
                                collapsed
                                    ? "justify-center px-0 py-2"
                                    : "gap-2.5 px-2.5 py-1.5 text-[13px] font-medium",
                                isActive
                                    ? "bg-accent text-foreground"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 shrink-0",
                                isActive ? "text-foreground" : "text-muted-foreground/60 group-hover:text-foreground"
                            )} />
                            {!collapsed && item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom: Docs + User Profile */}
            <div className={cn("border-t border-border/40", collapsed ? "px-1.5 py-2 space-y-1" : "px-3 py-3 space-y-1")}>
                <Link
                    href="/docs"
                    title={collapsed ? "Documentation" : undefined}
                    className={cn(
                        "flex items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors",
                        collapsed ? "justify-center py-2" : "gap-2.5 px-2.5 py-1.5 text-[13px] font-medium"
                    )}
                >
                    <HelpCircle className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    {!collapsed && "Documentation"}
                </Link>

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center rounded-md w-full text-left hover:bg-accent/50 transition-colors",
                                collapsed ? "justify-center py-2" : "gap-2.5 px-2.5 py-1.5"
                            )}
                        >
                            <div className="w-6 h-6 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0 text-[10px] font-bold">
                                {initials}
                            </div>
                            {!collapsed && (
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium text-foreground truncate">{user?.name || "User"}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={collapsed ? "right" : "top"}
                        align={collapsed ? "start" : "start"}
                        className="w-56"
                    >
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => signOut()}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
