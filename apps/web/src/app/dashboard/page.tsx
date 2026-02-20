"use client";

import * as React from "react";
import { useJobs, useStats } from "@/hooks/use-database";
import { useAuth } from "@/hooks/use-auth";
import {
    Activity,
    CheckCircle2,
    History,
    Zap,
    ShieldCheck,
    Loader2,
    GitBranch,
    ArrowRight,
    TrendingUp,
    Database,
    Clock,
    Cpu,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const { jobs, loading: jobsLoading } = useJobs();
    const stats = useStats();
    const { user } = useAuth();

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ─── Hero Header ─────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-transparent to-transparent p-8">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,162,0,0.06),transparent_70%)]" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
                            {greeting()}, {user?.name?.split(' ')[0] || 'Operator'} — AgentTrace Dashboard
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            System Overview
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2 font-mono">
                            <span className="text-green-400">●</span> All systems operational · Runtime v2.4 · Stress-tested 28/28
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <Link href="/dashboard/traces" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-xs font-mono uppercase text-muted-foreground hover:text-foreground">
                            <History className="w-3 h-3" /> View Traces
                        </Link>
                        <Link href="/dashboard/traces" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all text-xs font-mono uppercase font-bold">
                            <Zap className="w-3 h-3" /> New Trace
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── Stats Row ───────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        label: "Total Traces",
                        value: stats.totalTraces.toLocaleString(),
                        icon: Database,
                        color: "brand",
                        desc: "Recorded this session",
                        gradient: "from-amber-500/10 to-transparent",
                        border: "border-amber-500/20",
                        iconColor: "text-amber-400",
                    },
                    {
                        label: "Active Jobs",
                        value: stats.activeJobs,
                        icon: Cpu,
                        color: "blue",
                        desc: "Running right now",
                        gradient: "from-blue-500/10 to-transparent",
                        border: "border-blue-500/20",
                        iconColor: "text-blue-400",
                    },
                    {
                        label: "Avg. Success Rate",
                        value: stats.successRate,
                        icon: TrendingUp,
                        color: "green",
                        desc: "Pass rate across runs",
                        gradient: "from-green-500/10 to-transparent",
                        border: "border-green-500/20",
                        iconColor: "text-green-400",
                    },
                    {
                        label: "Auto-Repairs",
                        value: stats.afePotential,
                        icon: RefreshCw,
                        color: "purple",
                        desc: "Self-healed this week",
                        gradient: "from-purple-500/10 to-transparent",
                        border: "border-purple-500/20",
                        iconColor: "text-purple-400",
                    },
                ].map((stat, i) => (
                    <div
                        key={i}
                        className={cn(
                            "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] hover:shadow-lg",
                            stat.gradient, stat.border
                        )}
                        style={{ background: undefined }}
                    >
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", stat.gradient)} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                                <div className={cn("w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center", stat.iconColor)}>
                                    <stat.icon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold font-mono tracking-tight">{stat.value}</div>
                            <p className="text-[10px] text-muted-foreground mt-2 font-mono">{stat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Main Content Row ────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-5">

                {/* Recent Execution Logs */}
                <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-card/50 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-sm font-semibold">Recent Executions</span>
                        </div>
                        <Link href="/dashboard/traces" className="text-[10px] font-mono uppercase text-muted-foreground hover:text-brand flex items-center gap-1 transition-colors">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="p-4 space-y-2 min-h-[260px]">
                        {jobsLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 opacity-40">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <span className="text-[10px] font-mono uppercase tracking-widest">Hydrating...</span>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-14 h-14 rounded-2xl border border-brand/20 bg-brand/5 flex items-center justify-center mb-4">
                                    <Zap className="w-6 h-6 text-brand opacity-60" />
                                </div>
                                <p className="text-sm font-semibold mb-1">No executions yet</p>
                                <p className="text-xs text-muted-foreground max-w-xs">Run your first agent trace using the CLI or SDK to see logs here.</p>
                                <code className="mt-4 text-[10px] font-mono bg-brand/5 border border-brand/20 rounded-lg px-3 py-1.5 text-brand/80">
                                    pip install agenttrace &amp;&amp; agenttrace run script.py
                                </code>
                            </div>
                        ) : (
                            jobs.slice(0, 6).map((job) => (
                                <Link
                                    key={job.id}
                                    href={`/dashboard/traces/${job.trace_id}`}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full shrink-0",
                                            job.status === 'running' || job.status === 'claimed' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                                        )} />
                                        <div>
                                            <div className="text-sm font-mono font-medium">
                                                Job <span className="text-brand">#{job.id.slice(0, 8)}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <span className="opacity-30">·</span>
                                                TRACE:{job.trace_id.slice(0, 8)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border",
                                            job.status === 'completed' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                                                job.status === 'failed' ? 'border-red-500/30 text-red-400 bg-red-500/5' :
                                                    'border-blue-500/30 text-blue-400 bg-blue-500/5'
                                        )}>{job.status}</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-4">

                    {/* System Health */}
                    <div className="rounded-2xl border border-white/[0.06] bg-card/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold">System Health</span>
                        </div>
                        <div className="p-4 space-y-2">
                            {[
                                { name: "Deterministic Replay", status: "VERIFIED", color: "green", dot: "bg-green-500" },
                                { name: "Cloud Sync", status: "CONNECTED", color: "blue", dot: "bg-blue-500" },
                                { name: "Event Hash Integrity", status: "SHA-256", color: "purple", dot: "bg-purple-500" },
                                { name: "RBAC / Permissions", status: "ACTIVE", color: "amber", dot: "bg-amber-500" },
                            ].map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn("w-2 h-2 rounded-full", item.dot, item.color === 'green' ? 'animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]' : '')} />
                                        <span className="text-xs font-mono text-muted-foreground">{item.name}</span>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-mono font-bold",
                                        item.color === 'green' ? 'text-green-400' :
                                            item.color === 'blue' ? 'text-blue-400' :
                                                item.color === 'purple' ? 'text-purple-400' : 'text-amber-400'
                                    )}>{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-2xl border border-white/[0.06] bg-card/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06]">
                            <Activity className="w-4 h-4 text-brand" />
                            <span className="text-sm font-semibold">Quick Actions</span>
                        </div>
                        <div className="p-4 space-y-2">
                            {[
                                { label: "Browse All Traces", href: "/dashboard/traces", icon: History, color: "text-amber-400" },
                                { label: "Manage Team", href: "/dashboard/team", icon: CheckCircle2, color: "text-green-400" },
                                { label: "View Branches", href: "/dashboard/traces", icon: GitBranch, color: "text-purple-400" },
                                { label: "Settings", href: "/dashboard/settings", icon: Cpu, color: "text-blue-400" },
                            ].map((action) => (
                                <Link
                                    key={action.label}
                                    href={action.href}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <action.icon className={cn("w-3.5 h-3.5", action.color)} />
                                        <span className="text-xs font-mono">{action.label}</span>
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
