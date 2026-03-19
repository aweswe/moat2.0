import os
import json
import groq
from dotenv import load_dotenv

# Load env vars from the backend .env file we created earlier
load_dotenv(".env")

import agenttrace

# Initialize AgentTrace to send to your local web app
agenttrace.init(
    api_key="at_live_1bc6fea7ba5950e38b1467d8fa2448e390b8652c5493b296",
    api_url="http://localhost:3000/api"
)

# Initialize Groq client
client = groq.Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Mock tool functions
def check_inventory(product_name: str) -> str:
    print(f"[Tool] Checking database for '{product_name}'...")
    db = {"laptop": 5, "phone": 0, "headphones": 12}
    stock = db.get(product_name.lower(), repr(Exception("Product not found!")))
    return json.dumps({"product": product_name, "stock": stock})

@agenttrace.run("Claude_Style_Assistant")
def handle_customer_inquiry(user_message: str):
    print(f"--- Starting Agent Execution ---")
    print(f"Customer asked: {user_message}")
    
    with agenttrace.step("Categorizing Intent"):
        # We can simulate this step
        intent = "product_inquiry" if "stock" in user_message.lower() or "have" in user_message.lower() else "general"
        print(f"Detected Intent: {intent}")
        agenttrace.set_result({"intent": intent})
        
    messages = [
        {"role": "system", "content": "You are a helpful customer support AI. If they ask for a product, you MUST output valid JSON calling the check_inventory tool."},
        {"role": "user", "content": user_message}
    ]
    
    with agenttrace.step("LLM Inference - Initial Response"):
        print("Calling Groq LLM API (llama-3.3-70b-versatile)...")
        # Notice how this uses an external dependency (groq) that the sandbox will need to install!
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.2,
            max_completion_tokens=200
        )
        msg_content = response.choices[0].message.content
        print(f"LLM Response:\n{msg_content}")
        agenttrace.set_result(msg_content)
        
    return {"status": "success", "final_answer": msg_content}

if __name__ == "__main__":
    import time
    print("Testing the complex agent locally passing it a prompt...")
    
    # Wait for the daemon thread to finish uploading the trace before python exits
    print("Uploading trace to localhost:3000...")
    
    # Force synchronous upload to see the actual error message from the Next.js API!
    import requests
    from agenttrace.config import Config
    from agenttrace.client import AgentTraceClient
    
    def sync_send(trace_data):
        try:
            headers = {
                "Authorization": f"Bearer {Config.api_key}",
                "Content-Type": "application/json"
            }
            print(f"POSTing trace to {Config.api_url}/trace/register...")
            res = requests.post(f"{Config.api_url}/trace/register", json=trace_data, headers=headers, timeout=10)
            if not res.ok:
                print(f"API ERROR: {res.status_code} - {res.text}")
            else:
                print(f"API SUCCESS: {res.text}")
        except Exception as e:
            print(f"REQUEST EXCEPTION: {e}")
            
    AgentTraceClient.send_trace = sync_send
    
    result = handle_customer_inquiry("Do you have any laptop stock right now?")
    print(f"\nFinal Result: {result}")
    
    print("\nTrace has been recorded! Go check your localhost:3000 dashboard.")
