import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AutoFixEngine } from './afe';

// Load .env from root
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });
console.log(`🌍 Loading .env from: ${envPath}`);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for database access
const workerId = `worker-${os.hostname()}-${process.pid}`;
const pollInterval = parseInt(process.env.WORKER_POLL_INTERVAL || '3000');

const supabase = createClient(supabaseUrl, supabaseKey);
const afe = new AutoFixEngine(supabase);

async function pollJobs() {
    console.log(`🤖 Worker ${workerId} polling for jobs...`);

    // In a real scenario, we'd loop through all active orgs or have an org bound to the worker.
    // For now, let's fetch the first organization to simulate polling.
    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
        if (orgError) console.error("❌ Error fetching orgs:", orgError.message);
        return;
    }

    const orgId = orgs[0].id;

    const { data, error } = await supabase.rpc('claim_next_job', {
        p_worker_id: workerId,
        p_org_id: orgId
    });

    if (error) {
        console.error("❌ Error claiming job:", error.message);
        return;
    }

    if (data && data.length > 0) {
        const job = data[0];
        console.log(`🚀 Claimed job ${job.id} for Trace ${job.trace_id}`);
        await processJob(job);
    }
}

async function processJob(job: any) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `agenttrace-job-${job.id}`));
    console.log(`📂 Working in ${tempDir}`);

    try {
        // 1. Update status to running
        await supabase.from('jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', job.id);

        // 2. Download script.py (or .js)
        console.log(`⬇️ Downloading script for trace ${job.trace_id}...`);
        const { data: scriptData, error: downloadError } = await supabase.storage
            .from('traces')
            .download(`${job.trace_id}/script.py`);

        if (downloadError) {
            throw new Error(`Failed to download script: ${downloadError.message}`);
        }

        const scriptPath = path.join(tempDir, 'script.py');
        fs.writeFileSync(scriptPath, Buffer.from(await scriptData.arrayBuffer()));

        // 3. Spawn Python process
        console.log(`▶️ Executing script...`);
        const rootDir = path.resolve(__dirname, '../../..'); // Project root
        const moatDir = path.join(rootDir, 'apps', 'backend');

        const pythonProcess = spawn('python', [scriptPath], {
            cwd: tempDir,
            env: {
                ...process.env,
                PYTHONPATH: moatDir,
                PYTHONIOENCODING: 'utf-8',
                AGENTTRACE_TRACE_ID: job.trace_id,
                AGENTTRACE_ENABLE: '1',
                AGENTTRACE_MODE: 'REPLAY', // Default to replay for jobs
                NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
                SUPABASE_SERVICE_ROLE_KEY: supabaseKey
            }
        });

        let stderr = '';
        pythonProcess.stdout.on('data', (data) => console.log(`[AGENT-STDOUT] ${data}`));
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`[AGENT-STDERR] ${data}`);
        });

        const exitCode = await new Promise((resolve) => {
            pythonProcess.on('close', resolve);
        });

        console.log(`🏁 Script finished with exit code ${exitCode}`);

        // 4. Update job status
        if (exitCode === 0) {
            await supabase.from('jobs').update({
                status: 'completed',
                finished_at: new Date().toISOString()
            }).eq('id', job.id);
            console.log(`✅ Job ${job.id} completed successfully`);
        } else {
            await supabase.from('jobs').update({
                status: 'failed',
                error: `Exit code ${exitCode}. Error: ${stderr.slice(0, 500)}`,
                finished_at: new Date().toISOString()
            }).eq('id', job.id);
            console.log(`❌ Job ${job.id} failed`);

            // 5. Run AutoFix Engine analysis
            console.log(`🛠️ [AFE] Triggering analysis for job ${job.id}...`);
            await afe.analyzeFailure(job, stderr);
            console.log(`🏁 [AFE] Analysis session for job ${job.id} concluded.`);
        }

    } catch (err: any) {
        console.error(`💥 Job processing failed: ${err.message}`);
        await supabase.from('jobs').update({
            status: 'failed',
            error: err.message,
            finished_at: new Date().toISOString()
        }).eq('id', job.id);
    } finally {
        // Cleanup
        // fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

async function start() {
    console.log("🌟 AgentTrace Worker starting...");
    while (true) {
        await pollJobs();
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

start().catch(err => {
    console.error("💀 Worker crashed:", err);
    process.exit(1);
});
