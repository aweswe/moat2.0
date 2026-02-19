"use client";

import { useEffect, useState } from "react";
import { FileCode2, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface ScriptViewerProps {
    traceId: string;
    highlightLine?: number;
    className?: string;
}

export default function ScriptViewer({ traceId, highlightLine, className }: ScriptViewerProps) {
    const [script, setScript] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchScript() {
            setLoading(true);
            setError(null);

            // Try the /api/trace/script endpoint (Storage-based, Python SDK only)
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`/api/trace/script?traceId=${traceId}`, {
                    headers: {
                        "Authorization": `Bearer ${session?.access_token || ""}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.script) {
                        setScript(data.script);
                        setLoading(false);
                        return;
                    }
                }
            } catch {
                // Storage endpoint not available
            }

            // No source code — this is normal for API-ingested traces
            setError("Source code not included in this trace. Upload via SDK or CLI.");
            setLoading(false);
        }
        fetchScript();
    }, [traceId]);

    const handleCopy = async () => {
        if (!script) return;
        await navigator.clipboard.writeText(script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-16 opacity-40", className)}>
                <Loader2 className="w-5 h-5 animate-spin mb-2" />
                <span className="text-[10px] uppercase tracking-widest font-mono">Loading source...</span>
            </div>
        );
    }

    if (error || !script) {
        return (
            <div className={cn("text-center py-12 px-4 border-2 border-dashed border-border rounded-xl opacity-40", className)}>
                <FileCode2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <div className="text-xs font-mono mb-1">NO_SOURCE_CODE</div>
                <p className="text-[10px] text-muted-foreground italic">
                    {error || "No Python source was uploaded for this trace."}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                    Upload via: <code className="bg-white/5 px-1.5 py-0.5 rounded text-brand">agenttrace push {"<trace-id>"}</code>
                </p>
            </div>
        );
    }

    const lines = script.split("\n");

    return (
        <div className={cn("relative group", className)}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border border-white/5 rounded-t-lg">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    <FileCode2 className="w-3.5 h-3.5 text-brand" />
                    <span>script.py</span>
                    <span className="opacity-40">— {lines.length} lines</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-brand transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>

            {/* Code area */}
            <div className="overflow-auto max-h-[500px] bg-black/30 border border-t-0 border-white/5 rounded-b-lg">
                <table className="w-full border-collapse">
                    <tbody>
                        {lines.map((line, i) => {
                            const lineNum = i + 1;
                            const isHighlighted = highlightLine === lineNum;
                            return (
                                <tr
                                    key={i}
                                    className={cn(
                                        "transition-colors",
                                        isHighlighted
                                            ? "bg-brand/15 border-l-2 border-brand"
                                            : "hover:bg-white/3"
                                    )}
                                >
                                    <td className="select-none text-right pr-4 pl-4 py-0 text-[11px] text-muted-foreground/40 font-mono w-[1%] whitespace-nowrap">
                                        {lineNum}
                                    </td>
                                    <td className="py-0 pr-4">
                                        <pre className="text-[12px] font-mono text-foreground/90 whitespace-pre overflow-visible">
                                            {line || " "}
                                        </pre>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
