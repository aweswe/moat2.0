"use client";

import { supabase } from "@/lib/supabase";
import * as React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    ArrowRight,
    Loader2,
    MoreVertical,
    Pencil,
    Trash2,
    Circle,
    ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Trace {
    id: string;
    created_at: string;
    status: string;
    org_id: string;
    title?: string;
    priority?: string | null;
    deleted_at?: string | null;
    updated_at?: string | null;
    metadata?: {
        title?: string;
        duration_s?: number;
        event_count?: number;
    };
}

type SortField = "name" | "created_at" | "status" | "duration" | "events";
type SortDir = "asc" | "desc";

export default function TracesPage() {
    const [traces, setTraces] = React.useState<Trace[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [sortField, setSortField] = React.useState<SortField>("created_at");
    const [sortDir, setSortDir] = React.useState<SortDir>("desc");

    const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
    const [renameTarget, setRenameTarget] = React.useState<Trace | null>(null);
    const [renameValue, setRenameValue] = React.useState("");
    const [renaming, setRenaming] = React.useState(false);

    const [trashTarget, setTrashTarget] = React.useState<Trace | null>(null);
    const [trashDialogOpen, setTrashDialogOpen] = React.useState(false);
    const [trashing, setTrashing] = React.useState(false);

    const fetchTraces = React.useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("traces")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });
        if (!error) setTraces(data || []);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchTraces();
        const sub = supabase
            .channel("traces-list")
            .on("postgres_changes", { event: "*", schema: "public", table: "traces" }, fetchTraces)
            .subscribe();
        return () => { sub.unsubscribe(); };
    }, [fetchTraces]);

    const sortedTraces = React.useMemo(() => {
        let filtered = traces.filter(
            (t) =>
                t.id.toLowerCase().includes(search.toLowerCase()) ||
                (t.title || t.metadata?.title || "").toLowerCase().includes(search.toLowerCase())
        );
        filtered.sort((a, b) => {
            let av: any, bv: any;
            switch (sortField) {
                case "name":
                    av = (a.title || a.metadata?.title || "").toLowerCase();
                    bv = (b.title || b.metadata?.title || "").toLowerCase();
                    break;
                case "created_at":
                    av = new Date(a.created_at).getTime();
                    bv = new Date(b.created_at).getTime();
                    break;
                case "status":
                    av = a.status; bv = b.status; break;
                case "duration":
                    av = a.metadata?.duration_s ?? 0;
                    bv = b.metadata?.duration_s ?? 0;
                    break;
                case "events":
                    av = a.metadata?.event_count ?? 0;
                    bv = b.metadata?.event_count ?? 0;
                    break;
            }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [traces, search, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("desc"); }
    };

    const formatDate = (d: string) => {
        const date = new Date(d);
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const setPriority = async (traceId: string, priority: string | null) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/trace/${traceId}/priority`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
                body: JSON.stringify({ priority }),
            });
            setTraces((prev) => prev.map((t) => (t.id === traceId ? { ...t, priority } : t)));
        } catch (e) { console.error("Priority update failed:", e); }
    };

    const handleRename = async () => {
        if (!renameTarget || !renameValue.trim()) return;
        setRenaming(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/trace/${renameTarget.id}/rename`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
                body: JSON.stringify({ title: renameValue.trim() }),
            });
            if (res.ok) { setRenameDialogOpen(false); fetchTraces(); }
        } catch (e) { console.error("Rename failed:", e); }
        finally { setRenaming(false); }
    };

    const handleTrash = async () => {
        if (!trashTarget) return;
        setTrashing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/trace/${trashTarget.id}/trash`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session?.access_token || ""}` },
            });
            if (res.ok) { setTrashDialogOpen(false); fetchTraces(); }
        } catch (e) { console.error("Trash failed:", e); }
        finally { setTrashing(false); }
    };

    const priorityColors: Record<string, string> = {
        red: "bg-red-500", yellow: "bg-yellow-500", green: "bg-green-500",
    };

    const statusBadge = (status: string) => {
        const styles = {
            completed: "text-green-600 bg-green-500/10 border-green-500/20",
            ready: "text-green-600 bg-green-500/10 border-green-500/20",
            failed: "text-red-600 bg-red-500/10 border-red-500/20",
            running: "text-blue-600 bg-blue-500/10 border-blue-500/20",
        } as Record<string, string>;
        return styles[status] || "text-muted-foreground bg-muted/30 border-border/40";
    };

    return (
        <div className="py-2">
            {/* Header — left-aligned, strong presence */}
            <div className="flex items-end justify-between pb-5 mb-0 border-b border-border/60">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Traces</h1>
                    <p className="text-[13px] text-muted-foreground mt-1">
                        {traces.length} trace{traces.length !== 1 ? "s" : ""} captured
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                        <Input
                            placeholder="Search traces..."
                            className="pl-9 h-8 w-56 text-xs bg-transparent border-border/50 focus-visible:border-brand/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link href="/dashboard/trash">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-red-400 gap-1.5 h-8">
                            <Trash2 className="w-3 h-3" /> Trash
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="mt-0">
                {/* Column Headers */}
                <div className="grid grid-cols-[32px_1fr_120px_80px_80px_90px_32px] gap-3 px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em] border-b border-border/40">
                    <div />
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => toggleSort("name")}>
                        Name {sortField === "name" && <ArrowUpDown className="w-2.5 h-2.5" />}
                    </button>
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => toggleSort("created_at")}>
                        Last Run {sortField === "created_at" && <ArrowUpDown className="w-2.5 h-2.5" />}
                    </button>
                    <button className="flex items-center gap-1 justify-end hover:text-foreground transition-colors" onClick={() => toggleSort("events")}>
                        Events {sortField === "events" && <ArrowUpDown className="w-2.5 h-2.5" />}
                    </button>
                    <button className="flex items-center gap-1 justify-end hover:text-foreground transition-colors" onClick={() => toggleSort("duration")}>
                        Duration {sortField === "duration" && <ArrowUpDown className="w-2.5 h-2.5" />}
                    </button>
                    <button className="flex items-center gap-1 justify-end hover:text-foreground transition-colors" onClick={() => toggleSort("status")}>
                        Status {sortField === "status" && <ArrowUpDown className="w-2.5 h-2.5" />}
                    </button>
                    <div />
                </div>

                {/* Rows */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs">Loading traces...</span>
                    </div>
                ) : sortedTraces.length === 0 ? (
                    <div className="py-14 text-center">
                        <p className="text-sm text-muted-foreground">{search ? "No matching traces" : "No traces yet"}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">
                            {search ? "Try adjusting your search." : "Run your first trace to see it here."}
                        </p>
                    </div>
                ) : (
                    <div>
                        {sortedTraces.map((trace) => (
                            <div
                                key={trace.id}
                                className="grid grid-cols-[32px_1fr_120px_80px_80px_90px_32px] gap-3 px-4 py-[9px] items-center border-b border-border/20 hover:bg-accent/40 transition-colors group"
                            >
                                {/* Priority */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
                                            title={trace.priority ? `Priority: ${trace.priority === 'red' ? 'High' : trace.priority === 'yellow' ? 'Medium' : 'Low'}` : 'Set priority'}
                                        >
                                            {trace.priority ? (
                                                <span className={cn("w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background",
                                                    trace.priority === 'red' ? 'bg-red-500 ring-red-500/30' :
                                                        trace.priority === 'yellow' ? 'bg-yellow-500 ring-yellow-500/30' :
                                                            'bg-green-500 ring-green-500/30'
                                                )} />
                                            ) : (
                                                <Circle className="w-3.5 h-3.5 text-border group-hover:text-muted-foreground/40 transition-colors" />
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-28">
                                        <DropdownMenuItem onClick={() => setPriority(trace.id, "green")}>
                                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2" /> Low
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setPriority(trace.id, "yellow")}>
                                            <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" /> Medium
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setPriority(trace.id, "red")}>
                                            <span className="w-2 h-2 rounded-full bg-red-500 mr-2" /> High
                                        </DropdownMenuItem>
                                        {trace.priority && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setPriority(trace.id, null)}>
                                                    <Circle className="w-2.5 h-2.5 text-muted-foreground mr-2" /> Clear
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Name — darkest element, strong hierarchy */}
                                <Link
                                    href={`/dashboard/traces/${trace.id}`}
                                    className="text-[13px] font-medium text-foreground truncate hover:text-brand transition-colors"
                                >
                                    {trace.title || trace.metadata?.title || "Untitled Trace"}
                                </Link>

                                {/* Last Run — muted */}
                                <span className="text-[12px] text-muted-foreground/60 tabular-nums">
                                    {formatDate(trace.created_at)}
                                </span>

                                {/* Events — muted */}
                                <span className="text-[12px] text-muted-foreground/60 tabular-nums text-right">
                                    {trace.metadata?.event_count ?? "—"}
                                </span>

                                {/* Duration — muted */}
                                <span className="text-[12px] text-muted-foreground/60 tabular-nums text-right">
                                    {trace.metadata?.duration_s ? `${trace.metadata.duration_s.toFixed(1)}s` : "—"}
                                </span>

                                {/* Status — badge with tinted bg */}
                                <div className="flex justify-end">
                                    <span className={cn(
                                        "text-[10px] font-semibold px-2 py-0.5 rounded border inline-block",
                                        statusBadge(trace.status)
                                    )}>
                                        {trace.status}
                                    </span>
                                </div>

                                {/* Actions */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-all">
                                            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                        <DropdownMenuItem onClick={() => { setRenameTarget(trace); setRenameValue(trace.title || trace.metadata?.title || ""); setRenameDialogOpen(true); }}>
                                            <Pencil className="w-3 h-3 mr-2" /> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => { setTrashTarget(trace); setTrashDialogOpen(true); }}>
                                            <Trash2 className="w-3 h-3 mr-2" /> Move to Trash
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Rename Trace</DialogTitle>
                        <DialogDescription>Give this trace a descriptive name.</DialogDescription>
                    </DialogHeader>
                    <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="e.g. Production Agent v2.1" className="mt-2" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }} />
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>{renaming ? "Saving..." : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Trash Dialog */}
            <Dialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Move to Trash?</DialogTitle>
                        <DialogDescription>You can restore it later from the Trash page.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border/50">
                        <div className="text-sm font-medium">{trashTarget?.title || trashTarget?.metadata?.title || "Untitled"}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{trashTarget?.id}</div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setTrashDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleTrash} disabled={trashing}>{trashing ? "Moving..." : "Move to Trash"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
