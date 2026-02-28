"""
AgentTrace + Groq — Real-World Research Agent Demo
===================================================

A complex multi-step AI agent that:
  1. Takes a user query
  2. Plans a research strategy (via Groq LLM)
  3. Searches the web for information (simulated tool)
  4. Summarizes findings (Groq LLM)
  5. Generates a final report (Groq LLM)
  6. Uploads the full execution trace to AgentTrace

Usage:
  pip install groq requests
  python scripts/groq_research_agent.py
"""

import json
import time
import uuid
import requests
import os
import inspect
import traceback
from datetime import datetime, timezone

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
AGENTTRACE_API_KEY = os.getenv("AGENTTRACE_API_KEY", "at_live_269fc9b3149c68eb81f38986cd182db2d1a03bea581e0beb")
AGENTTRACE_BASE_URL = os.getenv("AGENTTRACE_BASE_URL", "https://www.theagenttrace.com")
GROQ_MODEL = "llama-3.3-70b-versatile"

# ─────────────────────────────────────────────────────────────
# Trace Collector — collects events during agent execution
# ─────────────────────────────────────────────────────────────
class TraceCollector:
    def __init__(self, agent_name: str, task: str):
        self.trace_id = str(uuid.uuid4())
        self.agent_name = agent_name
        self.task = task
        self.events = []
        self.seq = 0
        self.start_time = datetime.now(timezone.utc)
        self.total_tokens = 0
        self.total_cost = 0.0
        self.status = "running"

    def _ts(self):
        return datetime.now(timezone.utc).isoformat()

    def add_event(self, event_type: str, payload: dict):
        event = {
            "seq": self.seq,
            "type": event_type,
            "timestamp": self._ts(),
            "payload": payload,
        }
        self.events.append(event)
        self.seq += 1
        return event

    def agent_start(self, input_data: dict):
        return self.add_event("agent_start", {
            "task": self.task,
            "agent": self.agent_name,
            "model": GROQ_MODEL,
            "framework": "custom_python",
            "input": input_data,
        })

    def thought(self, thinking: str):
        return self.add_event("thought", {"thought": thinking})

    def llm_call(self, prompt_preview: str, response_preview: str, tokens: dict):
        self.total_tokens += tokens.get("prompt", 0) + tokens.get("completion", 0)
        return self.add_event("llm_call", {
            "model": GROQ_MODEL,
            "prompt_preview": prompt_preview[:200],
            "response_preview": response_preview[:300],
            "tokens": tokens,
        })

    def tool_call(self, tool_name: str, input_data, result):
        return self.add_event("tool_call", {
            "name": tool_name,
            "input": input_data if isinstance(input_data, dict) else str(input_data),
            "result": result if isinstance(result, dict) else str(result),
        })

    def network_call(self, url: str, method: str, status: int, response_preview: str = ""):
        return self.add_event("network_call", {
            "url": url,
            "method": method,
            "status": status,
            "response_preview": response_preview[:200],
        })

    def error(self, error_msg: str, error_type: str = "AgentError"):
        self.status = "failed"
        return self.add_event("error", {
            "error_type": error_type,
            "message": error_msg,
        })

    def agent_complete(self, output: str):
        self.status = "completed"
        return self.add_event("agent_complete", {
            "status": "completed",
            "total_tokens": self.total_tokens,
            "output_preview": output[:300],
        })

    def upload(self):
        """Upload the trace to AgentTrace."""
        source_code = inspect.getsource(__import__(__name__))

        payload = {
            "trace_id": self.trace_id,
            "metadata": {
                "title": f"{self.agent_name} — {self.task[:50]}",
                "description": self.task,
                "status": self.status,
                "step_count": len(self.events),
                "tags": ["groq", "research-agent", "real-world", "llama-3.3"],
                "root_hash": self.trace_id.replace("-", ""),
            },
            "spans": [{
                "span_id": str(uuid.uuid4()),
                "name": f"agent.{self.agent_name.lower().replace(' ', '_')}",
                "kind": "server",
                "start_time": self.start_time.isoformat(),
                "end_time": datetime.now(timezone.utc).isoformat(),
                "attributes": {
                    "agent": self.agent_name,
                    "model": GROQ_MODEL,
                    "task": self.task,
                    "total_tokens": self.total_tokens,
                },
            }],
            "events": self.events,
            "source_code": source_code,
        }

        print(f"\n📤  Uploading trace to AgentTrace...")
        print(f"    Trace ID : {self.trace_id}")
        print(f"    Events   : {len(self.events)}")

        res = requests.post(
            f"{AGENTTRACE_BASE_URL}/api/trace/register",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {AGENTTRACE_API_KEY}",
            },
            json=payload,
            timeout=30,
        )

        body = res.json()
        if res.ok and body.get("success"):
            print(f"✅  Trace uploaded successfully!")
            print(f"    Events stored: {body.get('events_count', 'N/A')}")
            print(f"\n🔗  View your trace:")
            print(f"    {AGENTTRACE_BASE_URL}/dashboard/traces/{self.trace_id}")
        else:
            print(f"❌  Upload failed: {json.dumps(body, indent=2)}")
        return body


# ─────────────────────────────────────────────────────────────
# Groq LLM Client
# ─────────────────────────────────────────────────────────────
def call_groq(messages: list, trace: TraceCollector, purpose: str = "") -> str:
    """Call the Groq API and record the trace."""
    url = "https://api.groq.com/openai/v1/chat/completions"

    prompt_preview = messages[-1]["content"][:200] if messages else ""

    trace.network_call(url, "POST", 0, f"Calling Groq ({GROQ_MODEL}) — {purpose}")

    try:
        res = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024,
            },
            timeout=30,
        )

        data = res.json()
        if res.status_code != 200:
            error_msg = data.get("error", {}).get("message", str(data))
            trace.error(f"Groq API error: {error_msg}", "GroqAPIError")
            return f"ERROR: {error_msg}"

        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        tokens = {
            "prompt": usage.get("prompt_tokens", 0),
            "completion": usage.get("completion_tokens", 0),
        }

        trace.network_call(url, "POST", 200, choice[:100])
        trace.llm_call(prompt_preview, choice, tokens)

        return choice

    except Exception as e:
        trace.error(f"Groq request failed: {str(e)}", type(e).__name__)
        return f"ERROR: {str(e)}"


# ─────────────────────────────────────────────────────────────
# Simulated Tools (would be real APIs in production)
# ─────────────────────────────────────────────────────────────
def web_search(query: str, trace: TraceCollector) -> list:
    """Simulated web search tool — returns mock search results."""
    trace.thought(f"Searching the web for: '{query}'")

    # Simulate different search results based on query keywords
    results = []
    if "AI agent" in query.lower() or "autonomous" in query.lower():
        results = [
            {"title": "The Rise of Autonomous AI Agents in 2026", "url": "https://arxiv.org/abs/2026.01234", "snippet": "Autonomous AI agents have evolved from simple chatbot wrappers to complex multi-step reasoning systems capable of tool use, planning, and self-correction."},
            {"title": "Building Reliable AI Agents: Lessons from Production", "url": "https://blog.anthropic.com/reliable-agents", "snippet": "Key challenges include hallucination in tool calls, cascading failures in multi-step workflows, and the critical need for observability and replay."},
            {"title": "Agent Frameworks Compared: LangGraph vs CrewAI vs AutoGen", "url": "https://medium.com/ai-agents-2026", "snippet": "LangGraph offers the most control with explicit state machines, while CrewAI excels at multi-agent orchestration. AutoGen provides flexible conversation patterns."},
        ]
    elif "observability" in query.lower() or "monitoring" in query.lower():
        results = [
            {"title": "Why Traditional APM Fails for AI Agents", "url": "https://thenewstack.io/ai-observability", "snippet": "Traditional monitoring tools like Datadog and New Relic track request/response latency but miss the non-deterministic decision-making inside AI agents."},
            {"title": "Deterministic Replay: The Future of AI Debugging", "url": "https://blog.agenttrace.com/deterministic-replay", "snippet": "By recording every LLM call, tool invocation, and state transition, deterministic replay lets engineers reproduce any agent bug exactly as it happened."},
        ]
    else:
        results = [
            {"title": f"Search results for: {query}", "url": "https://example.com", "snippet": f"General information about {query}. Multiple perspectives and recent developments covered."},
        ]

    trace.tool_call("web_search", {"query": query}, {"count": len(results), "results": [r["title"] for r in results]})
    return results


def extract_key_facts(search_results: list, trace: TraceCollector) -> list:
    """Extract key facts from search results."""
    trace.thought("Extracting key facts from search results...")
    facts = []
    for r in search_results:
        facts.append({
            "source": r["url"],
            "fact": r["snippet"],
        })
    trace.tool_call("extract_key_facts", {"result_count": len(search_results)}, {"facts_extracted": len(facts)})
    return facts


def format_report(title: str, sections: list, trace: TraceCollector) -> str:
    """Format a structured research report."""
    trace.thought("Formatting final research report...")
    report = f"# {title}\n\n"
    for section in sections:
        report += f"## {section['heading']}\n{section['content']}\n\n"
    trace.tool_call("format_report", {"title": title, "sections": len(sections)}, {"chars": len(report)})
    return report


# ─────────────────────────────────────────────────────────────
# The Agent — Multi-step research workflow
# ─────────────────────────────────────────────────────────────
def run_research_agent(user_query: str):
    """Execute the full research agent pipeline."""

    print("\n" + "━" * 60)
    print("🤖  AgentTrace + Groq Research Agent")
    print("━" * 60)
    print(f"📋  Query: {user_query}")
    print(f"🧠  Model: {GROQ_MODEL}")
    print("━" * 60)

    trace = TraceCollector("ResearchAgent", user_query)

    # ── Step 0: Agent Start ──
    trace.agent_start({"query": user_query, "model": GROQ_MODEL})
    print("\n🟢  Agent started")

    # ── Step 1: Planning Phase (LLM) ──
    print("📐  Planning research strategy...")
    plan_response = call_groq([
        {"role": "system", "content": "You are a research planning agent. Given a user query, output a JSON object with 'search_queries' (list of 2-3 specific search queries) and 'outline' (list of report section headings). Output ONLY valid JSON, no markdown."},
        {"role": "user", "content": f"Plan research for: {user_query}"},
    ], trace, "Research Planning")

    trace.thought(f"Planning complete. Raw plan: {plan_response[:150]}...")

    # Parse the plan
    try:
        # Try to extract JSON from the response
        plan_text = plan_response.strip()
        if plan_text.startswith("```"):
            plan_text = plan_text.split("```")[1]
            if plan_text.startswith("json"):
                plan_text = plan_text[4:]
        plan = json.loads(plan_text)
        search_queries = plan.get("search_queries", [user_query])
        outline = plan.get("outline", ["Overview", "Analysis", "Conclusion"])
    except (json.JSONDecodeError, IndexError):
        trace.thought("Plan parsing failed, using fallback strategy")
        search_queries = [
            f"{user_query} overview 2026",
            f"{user_query} challenges and solutions",
        ]
        outline = ["Overview", "Key Findings", "Challenges", "Recommendations"]

    trace.tool_call("parse_plan", {"raw": plan_response[:100]}, {
        "search_queries": search_queries,
        "outline": outline,
    })
    print(f"    ✓ {len(search_queries)} search queries planned")
    print(f"    ✓ {len(outline)} report sections outlined")

    # ── Step 2: Research Phase (Search + Extract) ──
    print("🔍  Executing searches...")
    all_facts = []
    for i, query in enumerate(search_queries[:3]):  # Cap at 3
        print(f"    [{i+1}/{min(len(search_queries), 3)}] Searching: {query[:50]}...")
        results = web_search(query, trace)
        facts = extract_key_facts(results, trace)
        all_facts.extend(facts)
        time.sleep(0.3)  # Simulate real pacing

    print(f"    ✓ {len(all_facts)} facts collected")

    # ── Step 3: Synthesis Phase (LLM) ──
    print("🧪  Synthesizing findings with Groq LLM...")
    facts_text = "\n".join([f"- [{f['source']}]: {f['fact']}" for f in all_facts])

    synthesis = call_groq([
        {"role": "system", "content": "You are a research synthesis agent. Given extracted facts from web searches, synthesize them into coherent, insightful analysis paragraphs. Be specific and cite sources."},
        {"role": "user", "content": f"Topic: {user_query}\n\nExtracted Facts:\n{facts_text}\n\nSynthesize these into 2-3 paragraphs of analysis."},
    ], trace, "Synthesis")

    trace.thought(f"Synthesis complete: {synthesis[:100]}...")
    print("    ✓ Synthesis complete")

    # ── Step 4: Report Generation (LLM) ──
    print("📝  Generating final report...")
    report_content = call_groq([
        {"role": "system", "content": f"You are a report writing agent. Generate a comprehensive research report with the following sections: {', '.join(outline)}. Use the provided synthesis as your source material. Be specific, include citations, and provide actionable insights."},
        {"role": "user", "content": f"Topic: {user_query}\n\nSynthesized Research:\n{synthesis}\n\nWrite a detailed report with sections: {', '.join(outline)}."},
    ], trace, "Report Generation")

    # ── Step 5: Format and finalize ──
    sections = []
    for heading in outline:
        sections.append({"heading": heading, "content": report_content})
        break  # Use full content as first section for simplicity

    # Add a recommendations section from the synthesis
    sections.append({"heading": "Methodology", "content": f"This report was generated using the Groq {GROQ_MODEL} model with {len(search_queries)} search queries and {len(all_facts)} extracted facts."})

    final_report = format_report(user_query, sections, trace)
    print("    ✓ Report formatted")

    # ── Step 6: Complete ──
    trace.agent_complete(final_report[:300])
    print("\n✅  Agent completed successfully!")
    print(f"    Total events: {trace.seq}")
    print(f"    Total tokens: {trace.total_tokens}")

    # ── Upload to AgentTrace ──
    trace.upload()

    return final_report, trace


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    USER_QUERY = "How are autonomous AI agents reshaping software development in 2026, and what role does observability play in making them production-ready?"

    report, trace = run_research_agent(USER_QUERY)

    print("\n" + "━" * 60)
    print("📄  FINAL REPORT PREVIEW")
    print("━" * 60)
    print(report[:500])
    print("...")
    print("━" * 60)
