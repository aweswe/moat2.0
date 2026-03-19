import asyncio
import agenttrace
import httpx
import time
import socket
import base64
import os

# Ensure we have an API key for testing
os.environ["AGENTTRACE_API_KEY"] = "at_live_test_123"
os.environ["AGENTTRACE_API_URL"] = "http://localhost:8000"

async def fetch_url(name, url):
    async with agenttrace.step(name):
        print(f"[{name}] Fetching {url}...")
        async with httpx.AsyncClient() as client:
            # We use a real delay to induce interleaving in record mode
            await asyncio.sleep(0.1) 
            resp = await client.get(url)
            print(f"[{name}] Got status: {resp.status_code}")
            return resp.status_code

async def socket_test():
    async with agenttrace.step("Raw Socket"):
        print("[Socket] Testing raw TCP interception...")
        # Since we are mocking, this won't actually go to google.com in replay
        # In record mode, it will.
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2.0)
            s.connect(("www.google.com", 80))
            s.sendall(b"GET / HTTP/1.1\r\nHost: www.google.com\r\n\r\n")
            data = s.recv(1024)
            print(f"[Socket] Received {len(data)} bytes")
            return len(data) # Return data length on success
        except Exception as e:
            print(f"[Socket] Error: {e}")
            return -1 # Indicate error
        finally:
            try: s.close()
            except: pass

@agenttrace.run(name="Async Determinism Test")
async def main_agent():
    print("--- Starting Parallel Async Tasks ---")
    # Run tasks in parallel to test out-of-order interleaving
    results = await asyncio.gather(
        fetch_url("Task A", "https://api.github.com/zen"),
        fetch_url("Task B", "https://api.github.com/octocat"),
        socket_test()
    )
    print(f"Final Results: {results}")
    
    # Return the captured events so we can use them for replay
    from agenttrace.context import _get_or_create_trace
    return _get_or_create_trace()["events"]

if __name__ == "__main__":
    # 1. First run in RECORD mode
    print("\n>>> RECORDING PHASE")
    agenttrace.init(mode="record")
    captured_events = asyncio.run(main_agent())
    print(f"\nCaptured {len(captured_events)} events.")
    
    # 2. Replay run
    print("\n>>> REPLAY PHASE")
    # We must reset the setup flag or it will ignore the new mode/events
    from agenttrace.config import Config
    Config._is_setup = False 
    
    agenttrace.init(mode="replay", replay_events=captured_events)
    # Re-run the exact same code
    asyncio.run(main_agent())
    print("\n>>> SUCCESS: Replay Completed Without Mismatch")
