"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BranchingProvider } from "@/components/trace/BranchingProvider";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Sidebar collapse state (desktop) — persisted in localStorage
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // Mobile sidebar state
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("agenttrace-sidebar-collapsed");
        if (saved === "true") setSidebarCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("agenttrace-sidebar-collapsed", String(next));
            return next;
        });
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    return (
        <BranchingProvider>
            <div className="flex h-[100dvh] bg-background overflow-hidden relative">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={toggleSidebar}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                <div className="flex-1 flex flex-col min-w-0">
                    <DashboardHeader onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
                    <main className="flex-1 overflow-y-auto bg-background px-4 py-6 md:px-10">
                        {children}
                    </main>
                </div>
            </div>
        </BranchingProvider>
    );
}
