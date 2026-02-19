"use client";

import { useJobs } from "@/hooks/use-database";
import { supabase } from "@/lib/supabase";
import * as React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Terminal,
    Clock,
    Search,
    Filter,
    ArrowUpRight,
    Loader2,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Trace {
    id: string;
    created_at: string;
    status: string;
    org_id: string;
    // Expanded metadata from JSONB
    metadata?: {
        title?: string;
        duration_s?: number;
        event_count?: number;
        tags?: string[];
        host_info?: any;
    };
}

export default function TracesPage() {
    const [traces, setTraces] = React.useState<Trace[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");

    const fetchTraces = React.useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('traces')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setTraces(data || []);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchTraces();

        const sub = supabase.channel('traces-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'traces' }, fetchTraces)
            .subscribe();

        return () => { sub.unsubscribe(); };
    }, [fetchTraces]);

    const filteredTraces = traces.filter(t =>
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        (t.metadata?.title || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trace Registry</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">Database // Index_v1.0</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40" />
                        <Input
                            placeholder="SEARCH_UUID..."
                            className="pl-10 h-9 w-64 bg-black/20 border-white/10 font-mono text-[10px] uppercase tracking-wider"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase border-brand/20 text-brand hover:bg-brand/5">
                        <Filter className="w-3 h-3 mr-2" /> Filter
                    </Button>
                </div>
            </div>

            <Card className="bg-card/50 border-border overflow-hidden">
                <CardHeader className="border-b border-border/50 py-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Terminal className="w-4 h-4 text-brand" />
                        Captured_Execution_Paths
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Resolving_Registry...</span>
                        </div>
                    ) : filteredTraces.length === 0 ? (
                        <div className="p-16 text-center">
                            <Terminal className="w-10 h-10 mx-auto mb-4 text-brand opacity-20" />
                            <div className="text-sm font-semibold mb-1 opacity-60">{search ? 'No matching traces' : 'No traces captured yet'}</div>
                            <p className="text-[10px] text-muted-foreground max-w-[300px] mx-auto">
                                {search
                                    ? 'Try adjusting your search term or clearing the filter.'
                                    : 'Run your first traced agent session to populate this registry.'
                                }
                            </p>
                            {!search && (
                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand/5 border border-brand/20">
                                    <span className="font-mono text-[9px] text-brand">agenttrace run my_agent.py</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-border/50 font-mono text-xs">
                            {filteredTraces.map((trace) => (
                                <div
                                    key={trace.id}
                                    onClick={() => window.location.href = `/dashboard/traces/${trace.id}`}
                                    className="p-5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-foreground font-bold text-sm tracking-tight group-hover:text-brand transition-colors flex items-center gap-2">
                                                {trace.metadata?.title || "Untitled_Trace"}
                                                {trace.metadata?.duration_s && (
                                                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-muted-foreground font-normal">
                                                        {trace.metadata.duration_s.toFixed(2)}s
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] opacity-40 tabular-nums font-mono">
                                                {trace.id}
                                                {trace.metadata?.host_info?.platform && (
                                                    <span className="ml-2 text-white/20">
                                                        // {trace.metadata.host_info.platform}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="hidden md:flex flex-col items-end gap-1 opacity-60">
                                            <div className="text-[9px] uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" /> {new Date(trace.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] tabular-nums">
                                                {new Date(trace.created_at).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "px-2.5 py-1 rounded text-[10px] font-bold uppercase border min-w-[80px] text-center",
                                            trace.status === 'ready' || trace.status === 'completed' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                                                trace.status === 'failed' ? 'border-red-500/30 text-red-500 bg-red-500/5' :
                                                    'border-blue-500/30 text-blue-500 bg-blue-500/5'
                                        )}>
                                            {trace.status}
                                        </div>
                                        {(trace.status === 'ready' || trace.status === 'completed') && (
                                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/5 border border-green-500/20">
                                                <ShieldCheck className="w-3 h-3 text-green-500" />
                                                <span className="text-[8px] font-mono text-green-500 uppercase font-bold">Deterministic</span>
                                            </div>
                                        )}
                                        <ArrowUpRight className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
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
