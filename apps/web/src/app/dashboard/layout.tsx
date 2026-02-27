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

    // Sidebar collapse state — persisted in localStorage
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
            <div className="flex h-screen bg-background">
                <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <DashboardHeader />
                    <main className="flex-1 overflow-y-auto bg-background px-10 py-6">
                        {children}
                    </main>
                </div>
            </div>
        </BranchingProvider>
    );
}
