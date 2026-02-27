"use client";

import * as React from "react";
import { useJobs } from "@/hooks/use-database";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
    ArrowRight,
    ArrowUpRight,
    Loader2,
    Terminal,
    GitFork,
    Play,
    X,
    ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Trace {
    id: string;
    title?: string;
    status: string;
    created_at: string;
    metadata?: {
        title?: string;
        duration_s?: number;
        event_count?: number;
    };
}

export default function DashboardPage() {
    const { jobs, loading: jobsLoading } = useJobs();
    const { user } = useAuth();

    const [traces, setTraces] = React.useState<Trace[]>([]);
    const [tracesLoading, setTracesLoading] = React.useState(true);

    // Onboarding dismiss state (persisted in localStorage)
    const [onboardingVisible, setOnboardingVisible] = React.useState(true);
    React.useEffect(() => {
        const dismissed = localStorage.getItem("agenttrace-onboarding-dismissed");
        if (dismissed === "true") setOnboardingVisible(false);
    }, []);

    const dismissOnboarding = () => {
        setOnboardingVisible(false);
        localStorage.setItem("agenttrace-onboarding-dismissed", "true");
    };

    const showOnboarding = () => {
        setOnboardingVisible(true);
        localStorage.removeItem("agenttrace-onboarding-dismissed");
    };

    React.useEffect(() => {
        const fetchTraces = async () => {
            const { data } = await supabase
                .from("traces")
                .select("*")
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
                .limit(10);
            setTraces(data || []);
            setTracesLoading(false);
        };
        fetchTraces();
    }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
    };

    const formatDate = (d: string) => {
        const date = new Date(d);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-8 py-2">

            {/* ─── Greeting ─────────────────────────────── */}
            <div>
                <p className="text-[15px] text-muted-foreground/70 font-medium">
                    {greeting()}, {user?.name?.split(" ")[0] || "there"}
                </p>
                <h1 className="text-[28px] font-semibold tracking-tight mt-1">AgentTrace</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Trace and replay AI agent executions.
                </p>
            </div>

            {/* ─── Get Started Cards ───────────────────── */}
            {onboardingVisible ? (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Let&apos;s get started
                        </span>
                        <button
                            onClick={dismissOnboarding}
                            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 rounded hover:bg-muted/30"
                            title="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            {
                                title: "Get started with Tracing",
                                desc: "Install SDK and capture your first execution.",
                                href: "/docs/quickstart",
                                icon: Terminal,
                            },
                            {
                                title: "Replay an execution",
                                desc: "Step through deterministic replay in sandbox.",
                                href: "/docs/replay",
                                icon: Play,
                            },
                            {
                                title: "Create a branch",
                                desc: "Fork and compare execution paths.",
                                href: "/docs/branching",
                                icon: GitFork,
                            },
                        ].map((card) => (
                            <Link
                                key={card.title}
                                href={card.href}
                                className="group relative flex flex-col justify-between p-5 rounded-md border border-border/50 bg-muted/20 hover:border-border transition-all"
                            >
                                <div>
                                    <h3 className="text-[14px] font-semibold mb-1 group-hover:text-brand transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                        {card.desc}
                                    </p>
                                </div>
                                <div className="absolute top-4 right-4">
                                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-brand transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : (
                <button
                    onClick={showOnboarding}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                    <ChevronDown className="w-3 h-3" />
                    Show getting started
                </button>
            )}

            {/* ─── Tracing Section ─────────────────────── */}
            <section>
                <div className="flex items-baseline justify-between mb-3">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-[15px] font-semibold">Tracing</h2>
                        <span className="text-xs text-muted-foreground">Last 7 days</span>
                    </div>
                    <Link
                        href="/dashboard/traces"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                        View all <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                <div className="rounded-md border border-border/50 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/40 bg-muted/10">
                        <div className="col-span-5">Name</div>
                        <div className="col-span-2">Most Recent Run</div>
                        <div className="col-span-2 text-right">Trace Count</div>
                        <div className="col-span-2 text-right">Error Rate</div>
                        <div className="col-span-1 text-right">Status</div>
                    </div>

                    {tracesLoading ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-xs">Loading...</span>
                        </div>
                    ) : traces.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-muted-foreground">No traces yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Run your first trace to see executions here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {traces.slice(0, 5).map((trace) => (
                                <Link
                                    key={trace.id}
                                    href={`/dashboard/traces/${trace.id}`}
                                    className="grid grid-cols-12 gap-4 px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors items-center group"
                                >
                                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            trace.status === "completed" || trace.status === "ready"
                                                ? "bg-green-500"
                                                : trace.status === "failed"
                                                    ? "bg-red-500"
                                                    : "bg-blue-500"
                                        )} />
                                        <span className="text-[13px] font-medium truncate group-hover:text-brand transition-colors">
                                            {trace.title || trace.metadata?.title || "Untitled Trace"}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-xs text-muted-foreground tabular-nums">
                                        {formatDate(trace.created_at)}
                                    </div>
                                    <div className="col-span-2 text-right text-xs text-muted-foreground tabular-nums">
                                        {trace.metadata?.event_count ?? 0}
                                    </div>
                                    <div className="col-span-2 text-right text-xs tabular-nums text-green-500">
                                        0%
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <span className={cn(
                                            "text-[10px] font-medium",
                                            trace.status === "completed" || trace.status === "ready"
                                                ? "text-green-500"
                                                : trace.status === "failed"
                                                    ? "text-red-500"
                                                    : "text-blue-500"
                                        )}>
                                            {trace.status === "ready" ? "ready" : trace.status}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── Jobs (Only shown if data exists) ────── */}
            {!jobsLoading && jobs.length > 0 && (
                <section>
                    <div className="flex items-baseline justify-between mb-3">
                        <h2 className="text-[15px] font-semibold">Jobs</h2>
                        <Link
                            href="/dashboard/jobs"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="rounded-md border border-border/50 overflow-hidden">
                        <div className="divide-y divide-border/30">
                            {jobs.slice(0, 3).map((job) => (
                                <Link
                                    key={job.id}
                                    href={`/dashboard/traces/${job.trace_id}`}
                                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors group"
                                >
                                    <span className="text-[13px] font-mono text-muted-foreground group-hover:text-brand transition-colors">
                                        {job.id.slice(0, 12)}
                                    </span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {formatDate(job.created_at)}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] font-medium",
                                            job.status === "completed"
                                                ? "text-green-500"
                                                : job.status === "failed"
                                                    ? "text-red-500"
                                                    : "text-blue-500"
                                        )}>
                                            {job.status}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
