import os
import requests
import json
from typing import Optional, Dict, Any

class NotificationManager:
    def __init__(self, supabase_client, org_id: str):
        self.supabase = supabase_client
        self.org_id = org_id
        self.slack_webhook_url: Optional[str] = None
        self.email_config: Optional[Dict[str, Any]] = None
        self._load_config()

    def _load_config(self):
        """Load notification config from organizations table."""
        try:
            response = self.supabase.table("organizations").select("slack_webhook_url, email_config").eq("id", self.org_id).single().execute()
            if response.data:
                self.slack_webhook_url = response.data.get("slack_webhook_url")
                self.email_config = response.data.get("email_config")
        except Exception as e:
            print(f"⚠ Failed to load notification config: {e}")

    def send_slack_alert(self, message: str, blocks: Optional[list] = None):
        """Send alert to Slack."""
        if not self.slack_webhook_url:
            return

        payload = {"text": message}
        if blocks:
            payload["blocks"] = blocks

        try:
            requests.post(self.slack_webhook_url, json=payload, timeout=5)
        except Exception as e:
            print(f"⚠ Failed to send Slack alert: {e}")

    def send_email_alert(self, subject: str, html_content: str):
        """Send email using Brevo."""
        if not self.email_config:
            return

        api_key = self.email_config.get("api_key")
        sender_email = self.email_config.get("sender_email", "noreply@agenttrace.com")
        sender_name = self.email_config.get("sender_name", "AgentTrace")
        recipient_email = self.email_config.get("recipient_email") # For now, simple single recipient

        if not api_key or not recipient_email:
            return

        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        payload = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": recipient_email}],
            "subject": subject,
            "htmlContent": html_content
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code not in [200, 201, 202]:
                print(f"⚠ Brevo API error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"⚠ Failed to send Brevo email: {e}")

    def notify_failure(self, job_id: str, trace_id: str, error: str):
        """High-level method to notify about a job failure."""
        # Slack
        msg = f"🚨 *Job Failed*\n*Job ID:* `{job_id}`\n*Trace ID:* `{trace_id}`\n*Error:* {error}"
        self.send_slack_alert(msg)

        # Email
        subject = f"[AgentTrace] Job Failed: {job_id}"
        html = f"""
        <h2>🚨 Job Failed</h2>
        <p><b>Job ID:</b> {job_id}</p>
        <p><b>Trace ID:</b> {trace_id}</p>
        <p><b>Error:</b> {error}</p>
        <p><a href="http://localhost:3000/trace/{trace_id}">View Trace</a></p>
        """
        self.send_email_alert(subject, html)

    def notify_fix_found(self, job_id: str, candidate_id: str, confidence: float):
        """High-level method to notify about a found fix."""
        # Slack
        msg = f"✅ *Fix Found*\n*Job ID:* `{job_id}`\n*Candidate:* `{candidate_id}`\n*Confidence:* {confidence}"
        self.send_slack_alert(msg)

        # Email
        subject = f"[AgentTrace] Fix Found for Job {job_id}"
        html = f"""
        <h2>✅ Fix Found</h2>
        <p><b>Job ID:</b> {job_id}</p>
        <p><b>Candidate ID:</b> {candidate_id}</p>
        <p><b>Confidence:</b> {confidence}</p>
        <p><a href="http://localhost:3000/dashboard/afe">Review Fix</a></p>
        """
        self.send_email_alert(subject, html)
