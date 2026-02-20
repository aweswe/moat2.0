"""
End-to-end test: Use the deployed agenttrace-py SDK to upload a trace
to the live production AgentTrace instance.
"""
import time
import sys
import os

# Add our local SDK to the path (in case pip version is stale)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "packages", "python-sdk"))

import agenttrace

# Point to the LIVE deployed Vercel instance
agenttrace.init(
    api_key="at_live_7503d242ed97b23ea9ba3dc7b736f55f8b355e3d6e749aa4",
    api_url="https://agnettrace.vercel.app/api"
)

@agenttrace.run(name="customer_support_agent")
def customer_support_flow():
    """Simulates a realistic AI agent handling a customer support ticket."""
    
    print("[Agent] Starting customer support flow...")
    
    # Step 1: Receive and parse the ticket
    with agenttrace.step("Receive Ticket", type="tool_call", input={"ticket_id": "TKT-2847", "channel": "email"}):
        ticket = {
            "id": "TKT-2847",
            "subject": "Double charged for subscription",
            "customer": "jane.doe@acme.com",
            "priority": "high",
            "created_at": "2026-02-20T14:30:00Z"
        }
        agenttrace.set_result(ticket)
        print("[Agent] Ticket received: TKT-2847")

    # Step 2: LLM analyzes the ticket
    with agenttrace.step("Analyze Intent", type="llm_call", input={"model": "gpt-4o", "prompt": "Classify this support ticket..."}):
        analysis = {
            "intent": "billing_dispute",
            "sentiment": "frustrated",
            "urgency": "high",
            "suggested_action": "check_payment_history"
        }
        agenttrace.set_result(analysis)
        print("[Agent] Intent classified: billing_dispute (high urgency)")

    # Step 3: Query the payment API
    with agenttrace.step("Fetch Payment History", type="tool_call", input={"customer_email": "jane.doe@acme.com", "tool": "stripe_api"}):
        time.sleep(0.3)
        payments = {
            "charges": [
                {"id": "ch_abc123", "amount": 4999, "status": "succeeded", "date": "2026-02-15"},
                {"id": "ch_def456", "amount": 4999, "status": "succeeded", "date": "2026-02-15"},
            ],
            "is_duplicate": True
        }
        agenttrace.set_result(payments)
        print("[Agent] Found duplicate charge! Two $49.99 charges on same day.")

    # Step 4: LLM drafts the response
    with agenttrace.step("Draft Response", type="llm_call", input={"model": "gpt-4o", "prompt": "Draft a refund confirmation email..."}):
        draft = {
            "response": "Hi Jane, I've identified a duplicate charge of $49.99 on Feb 15. I've initiated a refund for charge ch_def456. You should see the credit within 5-7 business days.",
            "tone": "empathetic",
            "action_taken": "refund_initiated"
        }
        agenttrace.set_result(draft)
        print("[Agent] Response drafted.")

    # Step 5: Issue the refund
    with agenttrace.step("Issue Refund", type="tool_call", input={"charge_id": "ch_def456", "tool": "stripe_refund"}):
        time.sleep(0.2)
        refund = {"refund_id": "re_xyz789", "status": "succeeded", "amount": 4999}
        agenttrace.set_result(refund)
        print("[Agent] Refund issued: re_xyz789")

    # Step 6: Send the email
    with agenttrace.step("Send Email", type="tool_call", input={"to": "jane.doe@acme.com", "tool": "sendgrid"}):
        email_result = {"message_id": "msg_abc", "status": "delivered"}
        agenttrace.set_result(email_result)
        print("[Agent] Email sent to customer.")

    # Step 7: Close the ticket
    with agenttrace.step("Close Ticket", type="tool_call", input={"ticket_id": "TKT-2847", "resolution": "refund_issued"}):
        close_result = {"status": "closed", "resolution_time_minutes": 3}
        agenttrace.set_result(close_result)
        print("[Agent] Ticket closed. Resolution time: 3 minutes.")

    return {"success": True, "ticket": "TKT-2847", "resolution": "refund_issued"}


if __name__ == "__main__":
    print("=" * 60)
    print("AgentTrace SDK E2E Test — Live Production Upload")
    print("=" * 60)
    
    result = customer_support_flow()
    
    print("\n" + "=" * 60)
    print(f"Agent completed: {result}")
    print("Trace uploading in background...")
    print("=" * 60)
    
    # Wait for background upload thread to finish
    time.sleep(3)
    print("\nDone! Check your AgentTrace dashboard for the new trace.")
