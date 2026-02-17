import { Check, X, AlertTriangle, Minus } from "lucide-react";

export interface ComparisonPoint {
    dimension: string;
    agentTrace: string | boolean;
    competitor: string | boolean;
}

export interface ComparisonData {
    slug: string;
    competitorName: string;
    title: string;
    subheadline: string;
    whatTheyAreGoodAt: {
        title: string;
        points: string[];
    };
    whereTheyStop: {
        title: string;
        points: string[];
    };
    coreDifference: ComparisonPoint[];
    whenToUseBoth: string;
}

export const comparisons: Record<string, ComparisonData> = {
    "agenttrace-vs-sentry": {
        slug: "agenttrace-vs-sentry",
        competitorName: "Sentry",
        title: "AgentTrace vs Sentry",
        subheadline: "Monitoring errors vs reproducing execution.",
        whatTheyAreGoodAt: {
            title: "What Sentry is good at",
            points: [
                "Sentry excels at error aggregation and stack traces.",
                "Great for alerting and traditional application monitoring.",
                "Builds trust with robust infrastructure for web apps."
            ]
        },
        whereTheyStop: {
            title: "Where Sentry stops working for agents",
            points: [
                "Non-deterministic execution makes stack traces less useful.",
                "No execution replay to see what actually happened.",
                "No state rewind to debug complex multi-step chains.",
                "No safe re-execution of agent steps."
            ]
        },
        coreDifference: [
            { dimension: "Execution replay", agentTrace: true, competitor: false },
            { dimension: "Determinism", agentTrace: true, competitor: false },
            { dimension: "Time travel", agentTrace: true, competitor: false },
            { dimension: "Runtime position", agentTrace: "Inside execution", competitor: "Outside app" }
        ],
        whenToUseBoth: "Many teams use Sentry for high-level alerting and AgentTrace for deep reproduction and debugging of agentic workflows."
    },
    "agenttrace-vs-langsmith": {
        slug: "agenttrace-vs-langsmith",
        competitorName: "LangSmith",
        title: "AgentTrace vs LangSmith",
        subheadline: "Runtime control vs Prompt engineering.",
        whatTheyAreGoodAt: {
            title: "What LangSmith is good at",
            points: [
                "Excellent for prompt engineering and evaluation.",
                "Great for tracing chains and visualizing LLM calls.",
                "Integrated tightly with the LangChain ecosystem."
            ]
        },
        whereTheyStop: {
            title: "Where LangSmith stops working for runtime",
            points: [
                "It's an observability tool, not a runtime execution layer.",
                "Cannot guarantee deterministic re-execution of code.",
                "Focuses on prompts/IO, not full program state.",
                "Doesn't provide a sandboxed rewind/replay environment."
            ]
        },
        coreDifference: [
            { dimension: "Determinism", agentTrace: true, competitor: false },
            { dimension: "Execution Control", agentTrace: true, competitor: false },
            { dimension: "Layer", agentTrace: "Runtime", competitor: "Observability" },
            { dimension: "Focus", agentTrace: "System State", competitor: "Prompts & IO" }
        ],
        whenToUseBoth: "Use LangSmith to optimize your prompts and chains during development. Use AgentTrace to guarantee reliable execution and debug complex failures in production."
    },
    "agenttrace-vs-replay": {
        slug: "agenttrace-vs-replay",
        competitorName: "Replay.io",
        title: "AgentTrace vs Replay.io",
        subheadline: "Agent-native execution vs Browser recording.",
        whatTheyAreGoodAt: {
            title: "What Replay.io is good at",
            points: [
                "Amazing for debugging browser-based web applications.",
                "Pixel-perfect replay of user sessions.",
                "Great for frontend and end-to-end test debugging."
            ]
        },
        whereTheyStop: {
            title: "Where Replay.io stops working for agents",
            points: [
                "Agents often run backend/headless, not just in browsers.",
                "Doesn't handle non-deterministic LLM outputs specifically.",
                "Cannot 'intervene' and modify agent state mid-flight easily.",
                "Focuses on DOM/Network, not internal agent logic/thought process."
            ]
        },
        coreDifference: [
            { dimension: "Backend Replay", agentTrace: true, competitor: "Limited" },
            { dimension: "LLM Awareness", agentTrace: true, competitor: false },
            { dimension: "State Manipulation", agentTrace: true, competitor: false },
            { dimension: "Target", agentTrace: "AI Agents", competitor: "Web Apps" }
        ],
        whenToUseBoth: "Replay.io is perfect for debugging your dashboard UI. AgentTrace is essential for debugging the actual AI agent running behind the scenes."
    },
    "agenttrace-vs-logs": {
        slug: "agenttrace-vs-logs",
        competitorName: "Logs / APM",
        title: "AgentTrace vs Traditional Logs",
        subheadline: "Reproducing the impossible vs reading text files.",
        whatTheyAreGoodAt: {
            title: "What Logs are good at",
            points: [
                "Universal and easy to implement anywhere.",
                "Good for post-mortem analysis if you know what to look for.",
                "Cheap and scalable for simple metrics."
            ]
        },
        whereTheyStop: {
            title: "Where Logs stop working for agents",
            points: [
                "Logs show you 'what' happened, but not 'why' or 'how' to fix it.",
                "You cannot 'replay' a log file to reproduce a bug.",
                "Agents generate too much noise; logs become unreadable.",
                "Missing the full context of the execution state."
            ]
        },
        coreDifference: [
            { dimension: "Interactive", agentTrace: true, competitor: false },
            { dimension: "Replayable", agentTrace: true, competitor: false },
            { dimension: "State Visibility", agentTrace: "Full Memory", competitor: "Text Only" },
            { dimension: "Fix Loop", agentTrace: "Instant", competitor: "Manual Repro" }
        ],
        whenToUseBoth: "Logs are still necessary for high-level health metrics. AgentTrace is for when you actually need to fix the complex behavior that logs can't explain."
    }
};
