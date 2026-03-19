import os
import json
import time
import random
import groq
from dotenv import load_dotenv
import agenttrace

# Load environment variables
load_dotenv(".env")

# Initialize AgentTrace
agenttrace.init(
    api_key="at_live_1bc6fea7ba5950e38b1467d8fa2448e390b8652c5493b296",
    api_url="http://localhost:3000/api"
)

# Initialize Groq client
client = groq.Groq(api_key=os.environ.get("GROQ_API_KEY"))

@agenttrace.run(name="Data_Analyzer_50_Steps")
def analyze_complex_data():
    print("--- Starting 50-Step Agent Execution ---")
    
    # Step 1: Initial LLM Call
    with agenttrace.step("Initial LLM Config Request", type="llm_call"):
        print("Calling Groq to get a configuration...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Respond with exactly one valid JSON object containing a 'start_value' integer between 5 and 15, and a 'multiplier' float between 1.1 and 2.0."}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        msg_content = response.choices[0].message.content
        config = json.loads(msg_content)
        start_value = config.get("start_value", 5)
        multiplier = config.get("multiplier", 1.5)
        agenttrace.set_result(config)
        print(f"LLM Config Received: {config}")

    current_val = start_value
    
    # Steps 2 to 49: Local Processing Loop (48 steps)
    for i in range(2, 50):
        with agenttrace.step(f"Data Processing Iteration {i}", type="tool_call"):
            # Simulate some processing delay and calculation
            time.sleep(0.01)
            # Add a bit of randomness to test determinism
            noise = random.uniform(-0.5, 0.5)
            current_val = (current_val * multiplier) + noise
            
            result_data = {
                "iteration": i,
                "applied_noise": noise,
                "current_val": current_val
            }
            # Only print every 10 steps so we don't spam stdout too much
            if i % 10 == 0:
                print(f"[{i}/50] Processed value: {current_val:.2f}")
            agenttrace.set_result(result_data)

    # Step 50: Final LLM Summary
    with agenttrace.step("Final Analysis Report", type="llm_call"):
        print("Calling Groq to summarize the final value...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f"The final calculated value is {current_val:.2f}. Write a 1-sentence scientific conclusion about this result."}],
            temperature=0.7
        )
        summary = response.choices[0].message.content
        print(f"Final Summary: {summary}")
        agenttrace.set_result({"summary": summary})

    return {"final_value": current_val, "summary": summary}

if __name__ == "__main__":
    result = analyze_complex_data()
    print("\n--- Execution Complete ---")
    
    # Wait for background thread to upload trace
    print("Uploading trace to localhost:3000...")
    time.sleep(4)
    print("Trace has been successfully recorded!")
