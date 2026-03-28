"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    Users,
    Shield,
    UserPlus,
    MoreVertical,
    Loader2,
    Copy,
    Check,
    X,
    ChevronDown,
    Trash2,
} from "lucide-react";

interface InviteDialogProps {
    open: boolean;
    onClose: () => void;
    onInvite: (email: string, role: string) => Promise<any>;
}

function InviteDialog({ open, onClose, onInvite }: InviteDialogProps) {
    const [email, setEmail] = React.useState("");
    const [role, setRole] = React.useState("viewer");
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState<any>(null);
    const [error, setError] = React.useState("");
    const [copied, setCopied] = React.useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await onInvite(email, role);
            if (res.error) {
                setError(res.error);
            } else {
                setResult(res);
            }
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const handleCopy = () => {
        if (result?.inviteLink) {
            navigator.clipboard.writeText(result.inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Invite Team Member</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {result ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-secondary border border-border text-center">
                            <Check className="w-8 h-8 text-success mx-auto mb-2" />
                            <p className="text-sm font-semibold text-success">Invite sent!</p>
                            {result.emailSent && (
                                <p className="text-xs text-muted-foreground mt-1">Email delivered to {email}</p>
                            )}
                        </div>
                        {result.inviteLink && (
                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Shareable Link</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={result.inviteLink}
                                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono truncate"
                                    />
                                    <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                </div>
                            </div>
                        )}
                        <Button onClick={onClose} className="w-full font-mono text-xs uppercase">Done</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-mono">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="teammate@company.com"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Role</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRole("dev")}
                                className={`p-3 rounded-lg border text-left transition-all ${role === "dev"
                                    ? "border-brand bg-brand/10 text-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-border"
                                    }`}
                                >
                                    <div className="text-xs font-bold uppercase">Dev</div>
                                    <div className="text-[10px] opacity-60 mt-0.5">Can fork & branch</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("viewer")}
                                className={`p-3 rounded-lg border text-left transition-all ${role === "viewer"
                                    ? "border-brand bg-brand/10 text-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-border"
                                    }`}
                                >
                                    <div className="text-xs font-bold uppercase">Viewer</div>
                                    <div className="text-[10px] opacity-60 mt-0.5">Read-only access</div>
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold h-11"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Invite...</>
                            ) : (
                                <><UserPlus className="w-4 h-4 mr-2" /> Send Invite</>
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function TeamPage() {
    const { user, hasPermission } = useAuth();
    const [members, setMembers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [inviteOpen, setInviteOpen] = React.useState(false);
    const [menuOpen, setMenuOpen] = React.useState<string | null>(null);

    const canInvite = hasPermission('invite_member');

    // Fetch members via API
    const fetchMembers = React.useCallback(async () => {
        if (!user) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/team/members', {
                headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
            });
            const data = await res.json();
            if (res.ok) {
                setMembers(data.members || []);
            }
        } catch (e) {
            console.error("Failed to fetch members:", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    React.useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleInvite = async (email: string, role: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/team/invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({ email, role })
        });
        const data = await res.json();
        if (!res.ok) return { error: data.error };
        // Refresh member list
        fetchMembers();
        return data;
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/team/members', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({ memberId, role: newRole })
        });
        if (res.ok) fetchMembers();
        setMenuOpen(null);
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm("Remove this member from the organization?")) return;
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/team/members?memberId=${memberId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
        });
        if (res.ok) fetchMembers();
        setMenuOpen(null);
    };

    if (loading) {
        return (
            <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Loading_Operators...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">
                        Operators // {members.length} Active
                    </p>
                </div>
                <Button
                    size="sm"
                    className="font-mono text-[10px] uppercase"
                    disabled={!canInvite}
                    title={!canInvite ? "Only organization owners can invite members" : ""}
                    onClick={() => setInviteOpen(true)}
                >
                    <UserPlus className="w-3 h-3 mr-2" /> Invite_Operator
                </Button>
            </div>

            <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-border text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span>Operator</span>
                    <span>Role</span>
                    <span>Joined</span>
                    <span></span>
                </div>

                {members.map((member) => (
                    <div key={member.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-border/50 hover:bg-secondary/30 transition-colors items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-xs font-bold text-brand uppercase">
                                {(member.display_name || member.email || '?')[0]}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{member.display_name || 'Unknown'}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{member.email}</p>
                            </div>
                        </div>
                        <div>
                            <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${member.role === 'owner'
                                    ? 'text-brand bg-brand/10 border-brand/20'
                                    : 'text-muted-foreground bg-secondary border-border'
                                }`}>
                                {member.role}
                            </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                            {new Date(member.created_at).toLocaleDateString()}
                        </div>
                        <div className="relative">
                            {canInvite && member.user_id !== user?.id && (
                                <div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground h-7 w-7"
                                        onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>

                                    {menuOpen === member.id && (
                                        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-none z-10 py-1 min-w-[140px]">
                                            {['owner', 'dev', 'viewer'].filter(r => r !== member.role).map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => handleRoleChange(member.id, r)}
                                                    className="w-full text-left px-3 py-1.5 text-xs font-mono uppercase hover:bg-secondary transition-colors"
                                                >
                                                    Make {r}
                                                </button>
                                            ))}
                                            <div className="border-t border-border my-1" />
                                            <button
                                                onClick={() => handleRemove(member.id)}
                                                className="w-full text-left px-3 py-1.5 text-xs font-mono uppercase text-error hover:bg-error/10 transition-colors flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {members.length === 0 && (
                    <div className="p-12 text-center">
                        <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                        <p className="text-sm text-muted-foreground">No team members yet.</p>
                        {canInvite && (
                            <Button size="sm" variant="link" onClick={() => setInviteOpen(true)} className="mt-2 text-brand">
                                Send your first invite
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <InviteDialog
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                onInvite={handleInvite}
            />
        </div>
    );
}
