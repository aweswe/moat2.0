"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BranchingProvider } from "@/components/trace/BranchingProvider";
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
    return (
        <BranchingProvider>
            <div className="flex h-screen bg-background">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <DashboardHeader />
                    <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
                        {children}
                    </main>
                </div>
            </div>
        </BranchingProvider>
    );
}
