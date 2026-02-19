// Brevo transactional email client
// Gracefully skips if BREVO_API_KEY is not configured

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendInviteEmailParams {
    to: string;
    orgName: string;
    role: string;
    inviteLink: string;
    inviterName?: string;
}

export async function sendInviteEmail({ to, orgName, role, inviteLink, inviterName }: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.warn("[Brevo] BREVO_API_KEY not configured, skipping email send");
        return { success: false, error: "Email service not configured" };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'team@agenttrace.ai';
    const senderName = process.env.BREVO_SENDER_NAME || 'AgentTrace';

    const payload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject: `You've been invited to join ${orgName} on AgentTrace`,
        htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; width: 40px; height: 40px; background: #0c1929; border: 1px solid rgba(70,130,180,0.3); border-radius: 4px; line-height: 40px;">
                        <div style="display: inline-block; width: 12px; height: 12px; background: steelblue; border-radius: 2px;"></div>
                    </div>
                    <h1 style="font-size: 20px; font-weight: 700; margin: 16px 0 0;">AgentTrace</h1>
                </div>

                <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; text-align: center;">
                    <h2 style="color: #fff; font-size: 22px; margin: 0 0 12px;">You're Invited</h2>
                    <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                        ${inviterName ? `<strong style="color:#fff">${inviterName}</strong> has invited you to` : 'You have been invited to'} 
                        join <strong style="color:#fff">${orgName}</strong> as 
                        <strong style="color:steelblue;text-transform:uppercase">${role}</strong>.
                    </p>
                    <a href="${inviteLink}" style="display: inline-block; background: #fff; color: #000; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.5px;">
                        Accept Invitation
                    </a>
                    <p style="color: #555; font-size: 11px; margin-top: 24px;">
                        This link expires in 7 days. If you didn't expect this, you can ignore it.
                    </p>
                </div>

                <p style="color: #444; font-size: 10px; text-align: center; margin-top: 24px; font-family: monospace; text-transform: uppercase; letter-spacing: 2px;">
                    Deterministic Observability for AI Agents
                </p>
            </div>
        `,
    };

    try {
        const res = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("[Brevo] Send failed:", res.status, errData);
            return { success: false, error: `Email send failed: ${res.status}` };
        }

        console.log("[Brevo] Invite email sent to:", to);
        return { success: true };
    } catch (err: any) {
        console.error("[Brevo] Network error:", err.message);
        return { success: false, error: err.message };
    }
}
