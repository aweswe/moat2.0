"use client";

import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/landing/mode-toggle";

interface DashboardHeaderProps {
    onMobileMenuToggle?: () => void;
}

export function DashboardHeader({ onMobileMenuToggle }: DashboardHeaderProps) {
    return (
        <header className="h-12 border-b border-border bg-background sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4 w-full max-w-sm">
                {onMobileMenuToggle && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-muted-foreground hover:text-foreground shrink-0 hover:bg-secondary"
                        onClick={onMobileMenuToggle}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                )}

                <div className="relative group w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-foreground transition-colors" />
                    <input
                        type="text"
                        placeholder="Search traces, jobs..."
                        className="w-full bg-transparent border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent transition-all placeholder:text-muted-foreground/30"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-foreground hover:bg-secondary w-8 h-8 hidden sm:flex">
                    <Bell className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
                <ModeToggle />
            </div>
        </header>
    );
}
