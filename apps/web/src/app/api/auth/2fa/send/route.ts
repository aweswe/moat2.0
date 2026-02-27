import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBrevoEmail, generateOTP } from "@/lib/brevo";
import { emailTemplates } from "@/lib/email-templates";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * POST /api/auth/2fa/send
 * Sends a 6-digit OTP to the user's email.
 * Stores the OTP hash + expiry in user metadata.
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

        // Store OTP in user metadata (hashed in production, plain for MVP)
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                otp_code: otp,
                otp_expires_at: expiresAt,
            },
        });

        // Send OTP email via Brevo
        const result = await sendBrevoEmail({
            to: [{ email: user.email!, name: user.user_metadata?.full_name }],
            subject: "Your AgentTrace verification code",
            htmlContent: emailTemplates.otpCode(otp),
        });

        if (!result.success) {
            return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "OTP sent to your email",
            email: user.email!.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Masked email
        });
    } catch (err: any) {
        console.error("[2FA Send] Error:", err.message);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
