"use client";

import { supabase } from "@/lib/supabase";
import * as React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Trash2,
    Loader2,
    RotateCcw,
    AlertTriangle,
    ArrowLeft,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TrashedTrace {
    id: string;
    created_at: string;
    deleted_at: string;
    status: string;
    title?: string;
    metadata?: {
        title?: string;
        duration_s?: number;
    };
}

export default function TrashPage() {
    const [traces, setTraces] = React.useState<TrashedTrace[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    // Permanent delete dialog
    const [deleteTarget, setDeleteTarget] = React.useState<TrashedTrace | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

    const fetchTrashedTraces = React.useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('traces')
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (!error) setTraces(data || []);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchTrashedTraces();
    }, [fetchTrashedTraces]);

    const handleRestore = async (trace: TrashedTrace) => {
        setActionLoading(trace.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/trace/${trace.id}/trash?action=restore`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session?.access_token || ""}` },
            });
            fetchTrashedTraces();
        } catch (e) {
            console.error("Restore failed:", e);
        } finally {
            setActionLoading(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!deleteTarget) return;
        setActionLoading(deleteTarget.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/trace/${deleteTarget.id}/trash`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${session?.access_token || ""}` },
            });
            setDeleteDialogOpen(false);
            fetchTrashedTraces();
        } catch (e) {
            console.error("Permanent delete failed:", e);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/traces">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <Trash2 className="w-7 h-7 text-red-400" />
                            Trash
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm opacity-60">
                            Traces moved to trash can be restored or permanently deleted.
                        </p>
                    </div>
                </div>
            </div>

            <Card className="bg-card/50 border-border overflow-hidden">
                <CardHeader className="border-b border-border/50 py-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-red-400 uppercase tracking-wider">
                        <Trash2 className="w-4 h-4" />
                        {traces.length} {traces.length === 1 ? 'trace' : 'traces'} in trash
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Loading...</span>
                        </div>
                    ) : traces.length === 0 ? (
                        <div className="p-16 text-center">
                            <Trash2 className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <div className="text-sm font-semibold mb-1 opacity-60">Trash is empty</div>
                            <p className="text-[10px] text-muted-foreground">
                                Deleted traces will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-border/50 font-mono text-xs">
                            {traces.map((trace) => (
                                <div
                                    key={trace.id}
                                    className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group"
                                >
                                    <div className="flex flex-col gap-1 opacity-60">
                                        <div className="text-foreground font-bold text-sm tracking-tight line-through">
                                            {trace.title || trace.metadata?.title || "Untitled Trace"}
                                        </div>
                                        <div className="text-[10px] opacity-40 tabular-nums">
                                            {trace.id}
                                        </div>
                                        <div className="text-[9px] text-red-400/60 flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3" />
                                            Deleted {new Date(trace.deleted_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] font-mono border-green-500/20 text-green-400 hover:bg-green-500/5"
                                            onClick={() => handleRestore(trace)}
                                            disabled={actionLoading === trace.id}
                                        >
                                            <RotateCcw className="w-3 h-3 mr-1.5" />
                                            {actionLoading === trace.id ? "Restoring..." : "Restore"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-[10px] font-mono border-red-500/20 text-red-400 hover:bg-red-500/5"
                                            onClick={() => {
                                                setDeleteTarget(trace);
                                                setDeleteDialogOpen(true);
                                            }}
                                            disabled={actionLoading === trace.id}
                                        >
                                            <AlertTriangle className="w-3 h-3 mr-1.5" />
                                            Delete Forever
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Permanent Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            Permanently Delete?
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The trace, all its events, branches, and storage files will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                        <div className="font-mono text-xs font-bold text-red-300">{deleteTarget?.title || deleteTarget?.metadata?.title || "Untitled Trace"}</div>
                        <div className="font-mono text-[10px] opacity-40 mt-1">{deleteTarget?.id}</div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handlePermanentDelete}
                            disabled={actionLoading === deleteTarget?.id}
                        >
                            {actionLoading === deleteTarget?.id ? "Deleting..." : "Delete Forever"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
