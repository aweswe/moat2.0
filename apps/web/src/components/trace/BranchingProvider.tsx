"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Branch {
    id: string;
    parentTraceId: string;
    forkStep: number;
    name?: string;
}

interface BranchingContextType {
    branches: Branch[];
    activeBranchId: string | null;
    createBranch: (traceId: string, forkStep: number, name?: string, overridePayload?: any) => Promise<string | null>;
    switchBranch: (branchId: string) => void;
    refreshBranches: (traceId: string) => Promise<void>;
    isLoading: boolean;
}

const BranchingContext = createContext<BranchingContextType | undefined>(undefined);

export function BranchingProvider({ children }: { children: React.ReactNode }) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const refreshBranches = async (traceId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/branches?traceId=${traceId}`, {
                headers: {
                    "Authorization": `Bearer ${session?.access_token || ""}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch branches");
            const data = await res.json();
            setBranches(data.branches || []);
        } catch (error) {
            console.error("Failed to refresh branches:", error);
        }
    };

    const createBranch = async (traceId: string, forkStep: number, name?: string, overridePayload?: any) => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/branches", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token || ""}`
                },
                body: JSON.stringify({ traceId, forkStep, name, overridePayload }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create branch");

            toast({
                title: "Branch Created",
                description: `Successfully forked at step ${forkStep}`,
            });

            await refreshBranches(traceId);
            setActiveBranchId(data.branchId);
            return data.branchId;
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Branch Failed",
                description: error.message,
            });
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const switchBranch = (branchId: string) => {
        setActiveBranchId(branchId);
    };

    return (
        <BranchingContext.Provider
            value={{
                branches,
                activeBranchId,
                createBranch,
                switchBranch,
                refreshBranches,
                isLoading,
            }}
        >
            {children}
        </BranchingContext.Provider>
    );
}

export const useBranching = () => {
    const context = useContext(BranchingContext);
    if (!context) throw new Error("useBranching must be used within a BranchingProvider");
    return context;
};
