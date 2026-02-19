import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function getProjectRoot(): string {
    const cwd = process.cwd();
    if (cwd.includes("apps") && cwd.includes("web")) {
        return path.resolve(cwd, "../../");
    }
    return cwd;
}

/** Run a Python helper, return parsed JSON from stdout. */
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

        child.stdout.on("data", (d) => { stdout += d.toString(); });
        child.stderr.on("data", (d) => { stderr += d.toString(); });

        child.on("close", (code) => {
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

/**
 * GET /api/branches?traceId=<id>
 * Lists all branches for a trace. Reads directly from Supabase (server-side, service role key).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const traceId = searchParams.get("traceId");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            // Fallback: use Python handler
            const args = ["list"];
            if (traceId) args.push("--trace-id", traceId);
            const result = await runPythonHelper("branch_handler.py", args);
            return NextResponse.json({ branches: result.branches ?? [] });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        let query = supabase.from("branches").select("*").order("created_at", { ascending: false });
        if (traceId) {
            query = query.eq("trace_id", traceId);   // actual column name
        }

        const { data, error } = await query;
        if (error) throw error;

        // Normalize to camelCase for frontend, matching real schema
        const branches = (data || []).map((b: any) => ({
            id: b.id,
            parentTraceId: b.trace_id,                        // real column: trace_id
            forkStep: b.fork_step,
            name: b.name,
            parentHash: b.overrides?._parent_hash ?? null,    // stored inside overrides JSONB
            createdAt: b.created_at,
            overridePayload: b.overrides?._override ?? null,  // real column: overrides
        }));

        return NextResponse.json({ branches });

    } catch (error: any) {
        console.error("[API /branches GET] Error:", error.message);
        return NextResponse.json({ error: "Failed to list branches", details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/branches
 * Body: { traceId, forkStep, overridePayload?, name? }
 *
 * Creates a new branch (fork) at forkStep, stores in Supabase.
 */
export async function POST(req: Request) {
    try {
        const { traceId, forkStep, name, overridePayload } = await req.json();

        if (!traceId || forkStep === undefined) {
            return NextResponse.json({ error: "traceId and forkStep are required" }, { status: 400 });
        }

        const args = [
            "create",
            "--trace-id", traceId,
            "--fork-step", String(forkStep),
        ];

        if (name) args.push("--name", name);

        if (overridePayload) {
            args.push("--override", JSON.stringify(overridePayload));
        }

        console.log("[API /branches POST] Creating branch with args:", args);
        const result = await runPythonHelper("branch_handler.py", args);

        return NextResponse.json({
            success: true,
            branchId: result.branchId,
            parentTraceId: result.parentTraceId,
            forkStep: result.forkStep,
            parentHash: result.parentHash,
            name: result.name,
            savedToCloud: result.savedToCloud,
        });

    } catch (error: any) {
        console.error("[API /branches POST] Error:", error.message);

        const isConflict = error.message?.includes("already exists");
        return NextResponse.json({
            error: isConflict ? "Branch already exists" : "Failed to create branch",
            details: error.message,
            traceback: error.pythonTraceback ?? null,
        }, { status: isConflict ? 409 : 500 });
    }
}
