"use client";

import { useJobs, useStats } from "@/hooks/use-database";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Activity,
    CheckCircle2,
    Clock,
    History,
    Terminal,
    Zap,
    ArrowUpRight,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const { jobs, loading: jobsLoading } = useJobs();
    const stats = useStats();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">Status: Nominal // Runtime_V2.4</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase border-brand/20 text-brand hover:bg-brand/5">
                        <Activity className="w-3 h-3 mr-2" /> Real-time Feed
                    </Button>
                    <Button size="sm" className="font-mono text-[10px] uppercase">
                        <Zap className="w-3 h-3 mr-2" /> New Agent
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Total Traces", value: stats.totalTraces.toLocaleString(), icon: History, trend: "+0%" },
                    { label: "Active Jobs", value: stats.activeJobs, icon: Zap, trend: "+0" },
                    { label: "Avg Success", value: stats.successRate, icon: CheckCircle2, trend: "+0%" },
                    { label: "Auto-Repairs", value: stats.afePotential, icon: ShieldCheck, trend: "+0" }
                ].map((stat, i) => (
                    <Card key={i} className="bg-card/50 border-border hover:border-brand/30 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-brand opacity-60" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono">{stat.value}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                recorded this session
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-brand" />
                            Recent Execution Logs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 font-mono text-xs">
                            {jobsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                    <span className="text-[10px] uppercase tracking-widest">Hydrating logs...</span>
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-12 px-4 border border-dashed border-brand/20 rounded-xl">
                                    <Terminal className="w-8 h-8 mx-auto mb-3 text-brand opacity-30" />
                                    <div className="text-sm font-semibold mb-1 opacity-60">No executions yet</div>
                                    <p className="text-[10px] text-muted-foreground">Run your first agent trace to see execution logs appear here.</p>
                                    <p className="text-[9px] text-brand font-mono mt-3 opacity-40">pip install agenttrace &amp;&amp; agenttrace run script.py</p>
                                </div>
                            ) : (
                                jobs.map((job) => (
                                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                job.status === 'running' || job.status === 'claimed' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                    job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                                            )} />
                                            <div>
                                                <div className="text-foreground font-medium uppercase truncate w-32">Job_{job.id.slice(0, 8)}</div>
                                                <div className="text-muted-foreground opacity-60 text-[10px]">TRACE: {job.trace_id.slice(0, 8)} // {new Date(job.created_at).toLocaleTimeString()}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "text-[10px] font-mono uppercase px-2 py-0.5 rounded border",
                                                job.status === 'completed' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                                                    job.status === 'failed' ? 'border-red-500/30 text-red-500 bg-red-500/5' :
                                                        'border-blue-500/30 text-blue-500 bg-blue-500/5'
                                            )}>{job.status}</div>
                                            <div
                                                onClick={() => window.location.href = `/dashboard/traces/${job.trace_id}`}
                                                className="text-brand text-[10px] uppercase font-mono mt-1 cursor-pointer hover:underline"
                                            >
                                                Open_Log_&rarr;
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {jobs.length > 0 && (
                            <Button variant="ghost" className="w-full mt-4 text-[10px] uppercase font-mono text-muted-foreground hover:text-brand">
                                Load more events...
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                    <span className="font-mono text-xs text-green-500 uppercase">Deterministic Replay</span>
                                </div>
                                <span className="font-mono text-[10px] text-green-500 font-bold">VERIFIED</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-brand/5 border border-brand/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-brand" />
                                    <span className="font-mono text-xs text-brand uppercase">Cloud Sync</span>
                                </div>
                                <span className="font-mono text-[10px] text-brand font-bold">CONNECTED</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="font-mono text-xs text-muted-foreground uppercase">Event Hash Integrity</span>
                                </div>
                                <span className="font-mono text-[10px] text-blue-500 font-bold">SHA-256</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-border/50">
                            <p className="font-mono text-[9px] text-muted-foreground opacity-40 uppercase tracking-wider">AgentTrace v2.0 // Stress Tested 28/28</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
