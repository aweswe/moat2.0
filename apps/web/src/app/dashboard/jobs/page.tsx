"use client";

import { useJobs, Job } from "@/hooks/use-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, Loader2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot, StatusText } from "@/components/system/StatusSystem";

export default function JobsPage() {
    const { jobs, loading, refetch } = useJobs();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Worker Fleet</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest">Status: Active // Cluster_v4</p>
                </div>
                <Button variant="outline" size="sm" onClick={refetch} className="font-mono text-xs uppercase border-border text-accent hover:bg-secondary">
                    <RefreshCw className="w-3 h-3 mr-2" /> Force_Sync
                </Button>
            </div>

            <Card className="bg-card border-border overflow-hidden">
                <CardHeader className="border-b border-border py-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                        <Activity className="w-4 h-4 text-accent" />
                        Job_Execution_Queue
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-24 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-mono text-xs uppercase tracking-widest">Synchronizing_Worker_Queue...</span>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="p-16 text-center">
                            <Zap className="w-10 h-10 mx-auto mb-4 text-accent" />
                            <div className="text-sm font-semibold mb-1 text-muted-foreground">No active jobs</div>
                            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                                Replay jobs will appear here when triggered from a trace detail page.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-border font-mono text-xs">
                            {jobs.map((job: Job) => (
                                <div key={job.id} className="p-5 flex items-center justify-between hover:bg-secondary transition-colors">
                                    <div className="flex items-center gap-6">
                                        <StatusDot status={job.status} />
                                        <div className="flex flex-col gap-1">
                                            <div className="text-foreground font-bold text-sm tracking-tight">
                                                JOB_{job.id.slice(0, 8)}
                                            </div>
                                            <div className="text-xs text-muted-foreground tabular-nums lowercase">
                                                TRACE_LINK: {job.trace_id.slice(0, 8)}...
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12">
                                        <div className="hidden md:flex flex-col items-end gap-1 text-muted-foreground">
                                            <div className="text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" /> {new Date(job.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs tabular-nums">
                                                {new Date(job.created_at).toLocaleTimeString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <StatusText status={job.status} className="px-2.5 py-1 rounded border border-border text-xs font-bold uppercase min-w-[100px] text-center" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs uppercase font-mono text-accent h-7 hover:bg-secondary"
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
