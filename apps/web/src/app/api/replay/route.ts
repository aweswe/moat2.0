import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Run a Python helper script via spawn (cross-platform, no cmd /c needed).
 * Returns parsed JSON from stdout, throws on non-zero exit.
 */
function runPythonHelper(scriptName: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const projectRoot = getProjectRoot();
        const scriptPath = path.join(projectRoot, "scripts", scriptName);

        const child = spawn("python", [scriptPath, ...args], {
            cwd: projectRoot,
            env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONPATH: projectRoot },
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (d: any) => { stdout += d.toString(); });
        child.stderr.on("data", (d: any) => { stderr += d.toString(); });

        child.on("close", (code: number) => {
            if (stderr) console.error("[API] Python stderr:", stderr);
            try {
                // Ignore noise like "Storage endpoint URL should have a trailing slash"
                const lines = stdout.split("\n");
                const jsonLine = lines.find(l => l.trim().startsWith("{") && l.trim().endsWith("}"));

                if (!jsonLine) {
                    throw new Error(`No JSON object found in Python output. Raw output: ${stdout || stderr}`);
                }

                const result = JSON.parse(jsonLine);
                if (code !== 0 || result.success === false) {
                    const err = new Error(result.error || `Python exited with code ${code}`);
                    (err as any).pythonTraceback = result.traceback || stderr;
                    reject(err);
                } else {
                    resolve(result);
                }
            } catch (e: any) {
                reject(new Error(`Failed to parse Python output (exit ${code}): ${e.message}`));
            }
        });
    });
}

function getProjectRoot(): string {
    const cwd = process.cwd();
    if (cwd.includes("apps") && cwd.includes("web")) {
        return path.resolve(cwd, "../../");
    }
    return cwd;
}

/**
 * POST /api/replay
 * Body: { traceId: string, step?: number, branch?: string }
 *
 * Returns hydrated state from the recorded event stream.
 * Does NOT re-execute any script — pure event replay.
 */
export async function POST(req: Request) {
    try {
        const { traceId, step, branch } = await req.json();

        if (!traceId) {
            return NextResponse.json({ error: "traceId is required" }, { status: 400 });
        }

        // 1. Session Auth + Org Isolation
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.warn("[API /replay] Missing Authorization header");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""); // Trim trailing slash
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabaseRest = createClient(supabaseUrl!, supabaseAnonKey, {
            auth: { persistSession: false }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);

        if (authError || !user) {
            console.error("[API /replay] Auth verification failed:", authError?.message || "User not found");
            return NextResponse.json({ error: "Unauthorized", details: authError?.message }, { status: 401 });
        }

        const supabase = supabaseAdmin;
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile?.organization_id) {
            console.error("[API /replay] Profile lookup failed for user:", user.id, profileError?.message);
            return NextResponse.json({ error: "No organization access" }, { status: 403 });
        }

        console.log(`[API /replay] Auth success: ${user.email} (Org: ${profile.organization_id})`);

        // 2. Verify traceId belongs to this org (Stealth 404)
        const { data: trace } = await supabase
            .from('traces')
            .select('org_id')
            .eq('id', traceId)
            .single();

        if (!trace || trace.org_id !== profile.organization_id) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        const args: string[] = ["--trace-id", traceId];
        if (step !== undefined && step !== null) {
            args.push("--step", String(step));
        }
        if (branch) {
            args.push("--branch", branch);
        }

        console.log("[API /replay] Running replay_handler.py with args:", args);
        const result = await runPythonHelper("replay_handler.py", args);

        return NextResponse.json({
            success: true,
            traceId: result.traceId,
            branch: result.branch ?? null,
            step: result.step ?? null,
            maxStep: result.maxStep,
            eventCount: result.eventCount,
            events: result.events,
            state: result.state,
            parentHash: result.parentHash,
            metadata: result.metadata,
        });

    } catch (error: any) {
        console.error("[API /replay] Error:", error.message);
        return NextResponse.json({
            error: "Replay failed",
            details: error.message,
            traceback: error.pythonTraceback ?? null,
        }, { status: 500 });
    }
}
