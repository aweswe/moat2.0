"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function VerifyOTPPage() {
    const router = useRouter();
    const [code, setCode] = React.useState(["", "", "", "", "", ""]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSending, setIsSending] = React.useState(false);
    const [error, setError] = React.useState("");
    const [maskedEmail, setMaskedEmail] = React.useState("");
    const [codeSent, setCodeSent] = React.useState(false);
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Send OTP on mount
    React.useEffect(() => {
        sendOTP();
    }, []);

    const getToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const sendOTP = async () => {
        setIsSending(true);
        setError("");
        try {
            const token = await getToken();
            if (!token) {
                router.push("/login");
                return;
            }
            const res = await fetch("/api/auth/2fa/send", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setMaskedEmail(data.email);
                setCodeSent(true);
            } else {
                setError(data.error || "Failed to send code");
            }
        } catch {
            setError("Network error");
        } finally {
            setIsSending(false);
        }
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // digits only
        const newCode = [...code];
        newCode[index] = value.slice(-1); // single digit
        setCode(newCode);

        // Auto-focus next
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits entered
        if (newCode.every((d) => d) && newCode.join("").length === 6) {
            verifyOTP(newCode.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            const newCode = pasted.split("");
            setCode(newCode);
            verifyOTP(pasted);
        }
    };

    const verifyOTP = async (otpCode: string) => {
        setIsSubmitting(true);
        setError("");
        try {
            const token = await getToken();
            if (!token) {
                router.push("/login");
                return;
            }
            const res = await fetch("/api/auth/2fa/verify", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: otpCode }),
            });
            const data = await res.json();
            if (res.ok) {
                // 2FA verified — proceed to dashboard
                router.push("/dashboard");
            } else {
                setError(data.error || "Invalid code");
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
            }
        } catch {
            setError("Network error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-6 h-6 text-foreground/60" />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">Two-factor authentication</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        {codeSent
                            ? <>We sent a 6-digit code to <strong className="text-foreground">{maskedEmail}</strong></>
                            : "Sending verification code..."
                        }
                    </p>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
                    {code.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className="w-11 h-12 text-center text-lg font-semibold border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                            autoFocus={i === 0}
                            disabled={isSubmitting}
                        />
                    ))}
                </div>

                {error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center mb-4">
                        {error}
                    </div>
                )}

                {isSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                    </div>
                )}

                <div className="text-center space-y-3">
                    <button
                        onClick={sendOTP}
                        disabled={isSending}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                        {isSending ? "Sending..." : "Resend code"}
                    </button>

                    <p className="text-xs text-muted-foreground/50">
                        Code expires in 10 minutes
                    </p>

                    <Link
                        href="/login"
                        className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => supabase.auth.signOut()}
                    >
                        Use a different account
                    </Link>
                </div>
            </div>
        </div>
    );
}
