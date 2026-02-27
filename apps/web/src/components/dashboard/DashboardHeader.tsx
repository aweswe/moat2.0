"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/landing/mode-toggle";

export function DashboardHeader() {
    return (
        <header className="h-12 border-b border-border/40 bg-background sticky top-0 z-30 flex items-center justify-between px-10">
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative group w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 group-focus-within:text-foreground transition-colors" />
                    <input
                        type="text"
                        placeholder="Search traces, jobs..."
                        className="w-full bg-transparent border border-border/50 rounded-md pl-9 pr-4 py-1.5 text-[13px] focus:outline-none focus:border-border transition-all placeholder:text-muted-foreground/40"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground/50 hover:text-foreground w-8 h-8">
                    <Bell className="w-4 h-4" />
                </Button>
                <ModeToggle />
            </div>
        </header>
    );
}
