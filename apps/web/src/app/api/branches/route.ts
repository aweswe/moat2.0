import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

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

/**
 * GET /api/branches?traceId=<id>
 * Lists all branches for a trace. Reads directly from Supabase.
 * Strictly enforced organization boundary.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const traceId = searchParams.get("traceId");

        // 1. Get Session for Org Isolation
        // In a real app we'd use cookies() from next/headers, 
        // for now we'll simulate the user from the auth header or session logic
        // but since we are using supabaseAdmin for high-level operations,
        // we must CHECK the trace's org against the user's profile.

        // Let's assume the client passes an 'x-org-id' for now as a bridge to real session cookies
        // OR we can fetch the profile of the current authenticated user.
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = supabaseAdmin;
        const supabaseRest = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false } }
        );
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get user's org via org_members
        const { data: membership } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const orgId = membership.org_id;

        // 2. If traceId provided, verify it belongs to this org
        if (traceId) {
            const { data: trace, error: traceError } = await supabase
                .from('traces')
                .select('org_id')
                .eq('id', traceId)
                .single();

            if (traceError || !trace || trace.org_id !== orgId) {
                // Stealth 404: Never reveal trace exists if not in your org
                return NextResponse.json({ error: "Trace not found" }, { status: 404 });
            }
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            throw new Error("Missing Supabase configuration");
        }

        let query = supabase.from("branches").select("*").order("created_at", { ascending: false });
        if (traceId) {
            query = query.eq("trace_id", traceId);
        } else {
            // If No traceId, only return branches that belong to traces in user's org
            // (Requires a join or subquery in real RLS, but here we do it via trace_id filtering)
            // For now, traceId is required for this route in the UI.
            return NextResponse.json({ error: "traceId is required for security isolation" }, { status: 400 });
        }

        const { data, error } = await query;
        if (error) throw error;

        // Normalize to camelCase for frontend, matching real schema
        const branches = (data || []).map((b: any) => ({
            id: b.id,
            parentTraceId: b.trace_id,
            forkStep: b.fork_step,
            name: b.name,
            parentHash: b.overrides?._parent_hash ?? null,
            createdAt: b.created_at,
            overridePayload: b.overrides?._override ?? null,
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

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.warn("[API /branches POST] Missing Authorization header");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabaseRest = createClient(supabaseUrl!, supabaseAnonKey, {
            auth: { persistSession: false }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);

        if (authError || !user) {
            console.error("[API /branches POST] Auth verification failed:", authError?.message);
            return NextResponse.json({ error: "Unauthorized", details: authError?.message }, { status: 401 });
        }

        const supabase = supabaseAdmin;
        const { data: membership, error: memberError } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (memberError || !membership?.org_id) {
            console.error("[API /branches POST] Membership lookup failed:", memberError?.message);
            return NextResponse.json({ error: "No organization access" }, { status: 403 });
        }

        console.log(`[API /branches POST] Auth success: ${user.email} (Org: ${membership.org_id})`);

        // 2. Verify traceId belongs to this org
        const { data: trace } = await supabase
            .from('traces')
            .select('org_id')
            .eq('id', traceId)
            .single();

        if (!trace || trace.org_id !== membership.org_id) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

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
