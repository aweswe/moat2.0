"use client";

import { useJobs } from "@/hooks/use-database";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Activity,
    Clock,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function JobsPage() {
    const { jobs, loading, refetch } = useJobs();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Worker Fleet</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">Status: Active // Cluster_v4</p>
                </div>
                <Button variant="outline" size="sm" onClick={refetch} className="font-mono text-[10px] uppercase border-brand/20 text-brand hover:bg-brand/5">
                    <RefreshCw className="w-3 h-3 mr-2" /> Force_Sync
                </Button>
            </div>

            <Card className="bg-card/50 border-border overflow-hidden">
                <CardHeader className="border-b border-border/50 py-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Activity className="w-4 h-4 text-brand" />
                        Job_Execution_Queue
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Synchronizing_Worker_Queue...</span>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="p-16 text-center">
                            <Zap className="w-10 h-10 mx-auto mb-4 text-brand opacity-20" />
                            <div className="text-sm font-semibold mb-1 opacity-60">No active jobs</div>
                            <p className="text-[10px] text-muted-foreground max-w-[280px] mx-auto">
                                Replay jobs will appear here when triggered from a trace detail page.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-border/50 font-mono text-xs">
                            {jobs.map((job) => (
                                <div key={job.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            job.status === 'running' || job.status === 'claimed' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                                        )} />
                                        <div className="flex flex-col gap-1">
                                            <div className="text-foreground font-bold text-sm tracking-tight">
                                                JOB_{job.id.slice(0, 8)}
                                            </div>
                                            <div className="text-[10px] opacity-40 tabular-nums lowercase">
                                                TRACE_LINK: {job.trace_id.slice(0, 8)}...
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12">
                                        <div className="hidden md:flex flex-col items-end gap-1 opacity-60">
                                            <div className="text-[9px] uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" /> {new Date(job.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] tabular-nums">
                                                {new Date(job.created_at).toLocaleTimeString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "px-2.5 py-1 rounded text-[10px] font-bold uppercase border min-w-[100px] text-center",
                                                job.status === 'completed' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                                                    job.status === 'failed' ? 'border-red-500/30 text-red-500 bg-red-500/5' :
                                                        'border-blue-500/30 text-blue-500 bg-blue-500/5'
                                            )}>
                                                {job.status}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-[10px] uppercase font-mono text-brand h-7"
                                                onClick={() => window.location.href = `/dashboard/traces/${job.trace_id}`}
                                            >
                                                DETAILS_&rarr;
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
