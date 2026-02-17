import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(req: Request) {
    try {
        const { traceId } = await req.json();

        if (!traceId) {
            return NextResponse.json({ error: "Trace ID is required" }, { status: 400 });
        }

        // Run the agenttrace CLI replay command with --run
        // Note: We need to ensure we are in the project root or relevant directory.
        // Assuming the node process runs from project root.
        // We use 'python -m agenttrace.cli' assuming it's in the path or virtualenv.
        // In this dev environment, 'python' likely refers to the system python which has the package installed
        // OR we are running inside the monorepo where we might need to point to the module.
        // Given previous commands worked with `python -m agenttrace.cli`, we use that.
        // We also need to set CWD to valid project root.

        // Determine project root
        let cwd = process.cwd();
        let projectRoot;

        if (cwd.includes("apps") && cwd.includes("web")) {
            // We are in apps/web, go up two levels to reach moat2.0 root
            projectRoot = path.resolve(cwd, "../../");
        } else {
            // Assume we are in root
            projectRoot = cwd;
        }

        console.log("DEBUG: Resolved project root:", projectRoot);
        // Standard way to run the CLI after flushing the stale package environment.
        // We force UTF-8 (chcp 65001) to support emojis/unicode on Windows.
        const command = `cmd /c "chcp 65001 > nul && set PYTHONIOENCODING=utf-8 && set PYTHONPATH=${projectRoot} && python -m agenttrace.cli replay ${traceId} --run"`;
        console.log(`[API] Executing replay command: ${command}`);

        // We execute from the project root (process.cwd())
        // The previous CLI fix ensures it finds .agenttrace recursively.
        const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });

        console.log("[API] Replay Stdout:", stdout);
        if (stderr) console.error("[API] Replay Stderr:", stderr);

        // Parse stdout to find the NEW trace ID
        // Support multiple possible formats from different parts of the SDK/CLI
        const traceIdRegex = /(?:Trace registered in Supabase:|Trace recorded:|Trace ID:)\s*([a-f0-9-]+)/i;
        const match = stdout.match(traceIdRegex);
        const newTraceId = match ? match[1] : null;

        console.log(`[API] Extracted New Trace ID: ${newTraceId}`);

        return NextResponse.json({
            success: true,
            newTraceId,
            output: stdout,
            debug: {
                moatPath: projectRoot,
                command
            }
        });

    } catch (error: any) {
        console.error("[API] Replay error:", error);
        return NextResponse.json({
            error: "Failed to execute replay",
            details: error.message,
            stdout: error.stdout,
            stderr: error.stderr
        }, { status: 500 });
    }
}
