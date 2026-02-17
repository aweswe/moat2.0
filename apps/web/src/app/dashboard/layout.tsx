"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/signup");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                    <p className="text-xs font-mono text-muted-foreground animate-pulse">Initializing_Control_Layer...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <DashboardHeader />
                <main className="flex-1 overflow-y-auto px-8 py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
