import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

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
