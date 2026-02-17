import { createClient } from '@supabase/supabase-js';
import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export class AutoFixEngine {
    private supabase;

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
    }

    async analyzeFailure(job: any, stderr: string) {
        console.log(`🔍 [AFE] Analyzing failure for job ${job.id}...`);

        try {
            // 1. Fetch trace metadata
            const { data: trace } = await this.supabase
                .from('traces')
                .select('*')
                .eq('id', job.trace_id)
                .single();

            // 2. Perform RCA using LLM
            const analysis = await this.performRCA(trace, stderr);

            // 3. Generate Fix Candidate
            if (analysis.shouldFix) {
                const fix = await this.generateFix(trace, stderr, analysis.rootCause);

                // 4. Store Candidate
                const { data, error } = await this.supabase.from('afe_candidates').insert({
                    job_id: job.id,
                    org_id: job.org_id,
                    fix_type: fix.type,
                    fix_explanation: fix.explanation,
                    diff_payload: fix.diff,
                    confidence: fix.confidence,
                    status: 'candidate'
                });

                if (error) console.error("❌ [AFE] Failed to store candidate:", error.message);
                else console.log(`✅ [AFE] Created fix candidate for job ${job.id}`);
            }

        } catch (err: any) {
            console.error(`💥 [AFE] Analysis failed: ${err.message}`);
        }
    }

    private async performRCA(trace: any, stderr: string) {
        const prompt = `
        Analyze the following Python agent failure and determine the root cause.
        
        TRACE TITLE: ${trace.title}
        ERROR LOGS:
        ${stderr.slice(-2000)}
        
        Respond in JSON:
        {
            "shouldFix": boolean,
            "rootCause": "string description",
            "failureType": "logic|api_error|environment|dependency"
        }
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        return JSON.parse(completion.choices[0].message.content || '{}');
    }

    private async generateFix(trace: any, stderr: string, rootCause: string) {
        // Placeholder for more complex fix generation
        // In a real scenario, we'd feed the script content here too
        return {
            type: 'code',
            explanation: `Identified error: ${rootCause}. Suggesting defensive check around the failing line.`,
            diff: `// Suggested fix based on analysis\n// ${rootCause}`,
            confidence: 0.8
        };
    }
}
