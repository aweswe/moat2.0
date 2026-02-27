import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * POST /api/auth/2fa/verify
 * Verifies the 6-digit OTP code.
 * Body: { code: string }
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

        const { code } = await req.json();

        if (!code || typeof code !== "string" || code.length !== 6) {
            return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
        }

        const storedOtp = user.user_metadata?.otp_code;
        const expiresAt = user.user_metadata?.otp_expires_at;

        if (!storedOtp || !expiresAt) {
            return NextResponse.json({ error: "No pending OTP. Request a new one." }, { status: 400 });
        }

        // Check expiry
        if (new Date(expiresAt) < new Date()) {
            // Clear expired OTP
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
                user_metadata: {
                    ...user.user_metadata,
                    otp_code: null,
                    otp_expires_at: null,
                },
            });
            return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
        }

        // Verify code
        if (code !== storedOtp) {
            return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }

        // ✅ OTP verified — clear it and mark 2FA as verified for this session
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                otp_code: null,
                otp_expires_at: null,
                two_factor_verified_at: new Date().toISOString(),
            },
        });

        return NextResponse.json({ success: true, message: "2FA verified" });
    } catch (err: any) {
        console.error("[2FA Verify] Error:", err.message);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
