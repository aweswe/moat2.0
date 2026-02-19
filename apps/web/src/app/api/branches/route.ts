import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Helper to execute agenttrace CLI commands reliably on Windows
async function runAgentTraceCommand(args: string) {
    let cwd = process.cwd();
    let projectRoot;

    if (cwd.includes("apps") && cwd.includes("web")) {
        projectRoot = path.resolve(cwd, "../../");
    } else {
        projectRoot = cwd;
    }

    // Force UTF-8 and set PYTHONPATH
    const command = `cmd /c "chcp 65001 > nul && set PYTHONIOENCODING=utf-8 && set PYTHONPATH=${projectRoot} && python -m agenttrace.cli ${args}"`;

    console.log(`[API] Executing: ${command}`);
    return execAsync(command, { cwd: projectRoot });
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const traceId = searchParams.get("traceId");

        let cmd = "branch list";
        if (traceId) {
            cmd += ` --trace-id ${traceId}`;
        }

        const { stdout } = await runAgentTraceCommand(cmd);

        // Parse the CLI output
        // Output format: "- <branch_id> (trace <parent_id>, step <fork_step>)"
        const branches = [];
        const lines = stdout.split("\n");
        for (const line of lines) {
            const match = line.match(/- ([a-zA-Z0-9_\-]+) \(trace ([a-zA-Z0-9\-]+), step (\d+)\)/);
            if (match) {
                branches.push({
                    id: match[1],
                    parentTraceId: match[2],
                    forkStep: parseInt(match[3])
                });
            }
        }

        return NextResponse.json({ branches });
    } catch (error: any) {
        console.error("[API] Branch list error:", error);
        return NextResponse.json({ error: "Failed to list branches", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { traceId, forkStep, name, overridePayload } = await req.json();

        if (!traceId || forkStep === undefined) {
            return NextResponse.json({ error: "traceId and forkStep are required" }, { status: 400 });
        }

        let cmd = `branch create ${traceId} --step ${forkStep}`;
        if (name) {
            cmd += ` --name "${name}"`;
        }

        console.log(`[API] Creating branch: ${cmd}`);
        const { stdout } = await runAgentTraceCommand(cmd);

        // Parse success message
        // "✅ Branch created: <branch_id> (fork step <step>)"
        const match = stdout.match(/Branch created: ([a-zA-Z0-9_\-]+)/);
        const branchId = match ? match[1] : null;

        if (!branchId) {
            throw new Error("Could not parse branch ID from output: " + stdout);
        }

        // Apply override if provided
        if (overridePayload) {
            console.log(`[API] Applying override to branch ${branchId} at step ${forkStep}`);
            // Escape JSON for command line (Windows specific escaping might be needed but simple stringify usually works if no special chars)
            // Ideally we'd write to a temp file, but for now let's try direct string passing carefully
            const jsonStr = JSON.stringify(overridePayload).replace(/"/g, '\\"');
            const editCmd = `branch edit ${branchId} --event ${forkStep} --payload "${jsonStr}"`;

            await runAgentTraceCommand(editCmd);
        }

        return NextResponse.json({ success: true, branchId });
    } catch (error: any) {
        console.error("[API] Branch create error:", error);
        return NextResponse.json({
            error: "Failed to create branch",
            details: error.message,
            stderr: error.stderr
        }, { status: 500 });
    }
}
