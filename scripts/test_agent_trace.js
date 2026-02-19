/**
 * test_agent_trace.js
 * 
 * Simulates a real AI agent execution and uploads a full trace
 * using the API key generated from the Settings page.
 * 
 * Usage: node scripts/test_agent_trace.js
 */

const API_KEY = 'at_live_42e0f8d73e78de44c89c8f2daa276be1f496337e4788b1a5';
const BASE_URL = 'http://localhost:3000';

// Generate a UUID (simple version for Node.js)
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

async function main() {
    console.log('\n🤖  AgentTrace SDK Simulation');
    console.log('━'.repeat(50));
    console.log(`🔑  API Key: ${API_KEY.slice(0, 16)}...`);
    console.log(`🌐  Endpoint: ${BASE_URL}/api/trace/register\n`);

    // ─── Simulate Agent Execution ──────────────────────
    const traceId = uuid();
    const now = new Date();

    // Root span: entire agent run
    const rootSpanId = uuid();
    const planSpanId = uuid();
    const executeSpanId = uuid();
    const llmSpanId = uuid();
    const toolSpanId = uuid();

    const spans = [
        {
            span_id: rootSpanId,
            name: 'agent.run',
            kind: 'server',
            start_time: new Date(now - 4200).toISOString(),
            end_time: now.toISOString(),
            attributes: {
                'agent.name': 'ResearchAgent',
                'agent.model': 'gpt-4o',
                'agent.task': 'Research quantum computing applications',
                'agent.version': '2.1.0',
            },
            metrics: {
                total_tokens: 2847,
                total_cost_usd: 0.0142,
                steps: 4,
            },
        },
        {
            span_id: planSpanId,
            parent_span_id: rootSpanId,
            name: 'agent.plan',
            kind: 'internal',
            start_time: new Date(now - 4000).toISOString(),
            end_time: new Date(now - 3500).toISOString(),
            attributes: {
                'plan.strategy': 'decompose_and_search',
                'plan.subtasks': 3,
            },
        },
        {
            span_id: llmSpanId,
            parent_span_id: rootSpanId,
            name: 'llm.chat',
            kind: 'client',
            start_time: new Date(now - 3500).toISOString(),
            end_time: new Date(now - 2000).toISOString(),
            attributes: {
                'llm.model': 'gpt-4o',
                'llm.provider': 'openai',
                'llm.prompt_tokens': 1200,
                'llm.completion_tokens': 847,
                'llm.temperature': 0.7,
            },
            metrics: {
                prompt_tokens: 1200,
                completion_tokens: 847,
                latency_ms: 1500,
            },
        },
        {
            span_id: toolSpanId,
            parent_span_id: rootSpanId,
            name: 'tool.web_search',
            kind: 'client',
            start_time: new Date(now - 2000).toISOString(),
            end_time: new Date(now - 800).toISOString(),
            attributes: {
                'tool.name': 'web_search',
                'tool.query': 'quantum computing real-world applications 2026',
                'tool.results_count': 8,
                'tool.provider': 'tavily',
            },
        },
        {
            span_id: executeSpanId,
            parent_span_id: rootSpanId,
            name: 'agent.synthesize',
            kind: 'internal',
            start_time: new Date(now - 800).toISOString(),
            end_time: new Date(now - 100).toISOString(),
            attributes: {
                'synthesis.sources': 8,
                'synthesis.confidence': 0.92,
                'synthesis.output_length': 1240,
            },
        },
    ];

    const events = [
        {
            seq: 0,
            timestamp: new Date(now - 4200).toISOString(),
            type: 'agent_start',
            payload: {
                agent: 'ResearchAgent',
                task: 'Research quantum computing applications',
                model: 'gpt-4o',
            },
        },
        {
            seq: 1,
            timestamp: new Date(now - 4000).toISOString(),
            type: 'planning',
            payload: {
                strategy: 'decompose_and_search',
                subtasks: [
                    'Identify key quantum computing domains',
                    'Search for recent applications',
                    'Synthesize findings',
                ],
            },
        },
        {
            seq: 2,
            timestamp: new Date(now - 3500).toISOString(),
            type: 'llm_call',
            payload: {
                model: 'gpt-4o',
                prompt_preview: 'Analyze the following task and identify key research areas for quantum computing applications...',
                completion_preview: 'Key areas:\n1. Drug discovery and molecular simulation\n2. Financial portfolio optimization\n3. Cryptography and post-quantum security\n4. Climate modeling...',
                tokens: { prompt: 1200, completion: 847 },
            },
        },
        {
            seq: 3,
            timestamp: new Date(now - 2000).toISOString(),
            type: 'tool_call',
            payload: {
                tool: 'web_search',
                input: { query: 'quantum computing real-world applications 2026' },
                output: {
                    results: 8,
                    top_result: 'IBM Quantum achieves 1000+ qubit milestone for drug discovery',
                },
            },
        },
        {
            seq: 4,
            timestamp: new Date(now - 100).toISOString(),
            type: 'agent_complete',
            payload: {
                status: 'success',
                output_preview: 'Quantum computing in 2026 has advanced significantly in three primary sectors...',
                confidence: 0.92,
                total_tokens: 2847,
                cost_usd: 0.0142,
            },
        },
    ];

    const payload = {
        trace_id: traceId,
        metadata: {
            title: 'ResearchAgent: Quantum Computing Analysis',
            description: 'Automated research on quantum computing applications using GPT-4o with web search augmentation',
            timestamp: Math.floor(now.getTime() / 1000),
            status: 'completed',
            step_count: 5,
            tags: ['research', 'quantum-computing', 'gpt-4o', 'production'],
            agent_name: 'ResearchAgent',
            agent_version: '2.1.0',
            duration_s: 4.2,
        },
        spans,
        events,
    };

    console.log(`📦  Trace ID: ${traceId}`);
    console.log(`📊  ${spans.length} spans, ${events.length} events`);
    console.log(`🏷️   Tags: ${payload.metadata.tags.join(', ')}\n`);

    // ─── Send to API ───────────────────────────────────
    console.log('⏳  Uploading trace...');

    try {
        const response = await fetch(`${BASE_URL}/api/trace/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`✅  Trace uploaded successfully!`);
            console.log(`    → ID: ${result.id}`);
            console.log(`    → Org: ${result.org_id}`);
            console.log(`    → Spans: ${result.spans_count}`);
            console.log(`    → Events: ${result.events_count}`);
            console.log(`\n🔗  View at: ${BASE_URL}/dashboard/traces/${traceId}`);
        } else {
            console.error(`❌  Upload failed (${response.status}):`, result.error);
        }
    } catch (err) {
        console.error('❌  Network error:', err.message);
    }

    console.log('\n' + '━'.repeat(50));
}

main();
