import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * POST /api/auth/2fa/toggle
 * Enable or disable 2FA for the authenticated user.
 * Body: { enabled: boolean }
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

        const { enabled } = await req.json();

        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                two_factor_enabled: !!enabled,
                // Clear any pending OTP when toggling
                otp_code: null,
                otp_expires_at: null,
                two_factor_verified_at: null,
            },
        });

        return NextResponse.json({
            success: true,
            two_factor_enabled: !!enabled,
        });
    } catch (err: any) {
        console.error("[2FA Toggle] Error:", err.message);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
