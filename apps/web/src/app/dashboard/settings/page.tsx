"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Shield,
    Key,
    Building2,
    Mail,
    Loader2,
    Copy,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    created_at: string;
}

// Helper to get auth header
async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
    };
}

export default function SettingsPage() {
    const { user, hasPermission } = useAuth();

    // ─── Org profile state ─────────────────────────────────
    const [org, setOrg] = React.useState<any>(null);
    const [orgLoading, setOrgLoading] = React.useState(true);
    const [name, setName] = React.useState("");
    const [slug, setSlug] = React.useState("");
    const [updating, setUpdating] = React.useState(false);

    // ─── API keys state ────────────────────────────────────
    const [keys, setKeys] = React.useState<ApiKey[]>([]);
    const [keysLoading, setKeysLoading] = React.useState(true);
    const [newKeyName, setNewKeyName] = React.useState("");
    const [creatingKey, setCreatingKey] = React.useState(false);
    const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = React.useState(false);

    const isOwner = user?.role === 'owner';
    const canViewKeys = user?.role !== 'viewer';

    // ─── Fetch org profile ─────────────────────────────────
    const fetchOrg = React.useCallback(async () => {
        if (!user) return;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/settings/org', { headers });
            const data = await res.json();
            if (res.ok) {
                setOrg(data.organization);
                setName(data.organization?.name || "");
                setSlug(data.organization?.slug || "");
            }
        } catch (err) {
            console.error("Failed to fetch org:", err);
        } finally {
            setOrgLoading(false);
        }
    }, [user]);

    // ─── Fetch API keys ────────────────────────────────────
    const fetchKeys = React.useCallback(async () => {
        if (!user || !canViewKeys) {
            setKeysLoading(false);
            return;
        }
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/settings/keys', { headers });
            const data = await res.json();
            if (res.ok) setKeys(data.keys || []);
        } catch (err) {
            console.error("Failed to fetch keys:", err);
        } finally {
            setKeysLoading(false);
        }
    }, [user, canViewKeys]);

    React.useEffect(() => {
        fetchOrg();
        fetchKeys();
    }, [fetchOrg, fetchKeys]);

    // ─── Update org profile ────────────────────────────────
    const handleUpdateOrg = async () => {
        setUpdating(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/settings/org', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ name, slug }),
            });
            const data = await res.json();
            if (res.ok) {
                setOrg(data.organization);
                toast.success("Organization updated.");
            } else {
                toast.error(data.error || "Failed to update.");
            }
        } catch (err) {
            toast.error("Network error.");
        } finally {
            setUpdating(false);
        }
    };

    // ─── Create API key ────────────────────────────────────
    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error("Key name is required.");
            return;
        }
        setCreatingKey(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/settings/keys', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: newKeyName.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setRevealedSecret(data.secret);
                setNewKeyName("");
                setShowCreateForm(false);
                await fetchKeys();
                toast.success("API key created. Copy it now — it won't be shown again.");
            } else {
                toast.error(data.error || "Failed to create key.");
            }
        } catch (err) {
            toast.error("Network error.");
        } finally {
            setCreatingKey(false);
        }
    };

    // ─── Revoke API key ────────────────────────────────────
    const handleRevokeKey = async (keyId: string, keyName: string) => {
        if (!confirm(`Revoke key "${keyName}"? This cannot be undone. Any integrations using this key will stop working.`)) return;

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/settings/keys?keyId=${keyId}`, {
                method: 'DELETE',
                headers,
            });
            if (res.ok) {
                await fetchKeys();
                toast.success(`Key "${keyName}" revoked.`);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to revoke key.");
            }
        } catch (err) {
            toast.error("Network error.");
        }
    };

    // ─── 2FA state ───────────────────────────────────────
    const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false);
    const [twoFactorToggling, setTwoFactorToggling] = React.useState(false);

    // Fetch 2FA status from Supabase user metadata
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }: { data: any }) => {
            if (data?.user?.user_metadata?.two_factor_enabled) {
                setTwoFactorEnabled(true);
            }
        });
    }, []);

    const handleToggle2FA = async () => {
        setTwoFactorToggling(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/auth/2fa/toggle', {
                method: 'POST',
                headers,
                body: JSON.stringify({ enabled: !twoFactorEnabled }),
            });
            const data = await res.json();
            if (res.ok) {
                setTwoFactorEnabled(data.two_factor_enabled);
                toast.success(data.two_factor_enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
            } else {
                toast.error(data.error || "Failed to toggle 2FA");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setTwoFactorToggling(false);
        }
    };

    if (orgLoading) {
        return (
            <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Resolving_Space...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Space Settings</h1>
                <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">Configuration // ID: {org?.id?.slice(0, 8)}</p>
            </div>

            <div className="grid gap-6">
                {/* ─── Organization Profile ──────────────────────── */}
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                            <Building2 className="w-4 h-4 text-brand" />
                            Organization Profile
                        </CardTitle>
                        <CardDescription className="text-xs">Manage your workspace identity and core configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name" className="text-[10px] font-mono uppercase opacity-60">Space Name</Label>
                            <Input
                                id="org-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="AgentTrace HQ"
                                className="bg-black/20 border-white/10 font-mono text-xs"
                                disabled={!isOwner}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-slug" className="text-[10px] font-mono uppercase opacity-60">Instance URL</Label>
                            <div className="flex gap-2">
                                <div className="flex items-center px-3 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono opacity-50">agenttrace.com/</div>
                                <Input
                                    id="org-slug"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="acme-corp"
                                    className="bg-black/20 border-white/10 font-mono text-xs"
                                    disabled={!isOwner}
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="font-mono text-[10px] uppercase w-fit"
                            onClick={handleUpdateOrg}
                            disabled={updating || !isOwner}
                            title={!isOwner ? "Only organization owners can update settings" : ""}
                        >
                            {updating ? "Syncing..." : "Update_Config"}
                        </Button>
                    </CardContent>
                </Card>

                {/* ─── API Credentials ──────────────────────────── */}
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                                    <Key className="w-4 h-4 text-brand" />
                                    API Keys
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">Keys for CLI and SDK integration. Keys are hashed — the raw value is shown only on creation.</CardDescription>
                            </div>
                            {isOwner && (
                                <Button
                                    size="sm"
                                    className="font-mono text-[10px] uppercase"
                                    onClick={() => setShowCreateForm(!showCreateForm)}
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    New_Key
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Revealed secret banner */}
                        {revealedSecret && (
                            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 space-y-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-yellow-300">Copy Your Secret Key Now</p>
                                        <p className="text-[10px] text-yellow-200/70 mt-0.5">This key will not be shown again. Store it securely.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={revealedSecret}
                                        readOnly
                                        className="bg-black/30 border-yellow-500/30 font-mono text-xs text-yellow-200"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10"
                                        onClick={() => {
                                            navigator.clipboard.writeText(revealedSecret);
                                            toast.success("Key copied to clipboard.");
                                        }}
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[10px] font-mono uppercase text-yellow-200/50"
                                    onClick={() => setRevealedSecret(null)}
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    I've saved it — dismiss
                                </Button>
                            </div>
                        )}

                        {/* Create key form */}
                        {showCreateForm && (
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                <Label className="text-[10px] font-mono uppercase opacity-60">Key Name</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        placeholder="e.g. Production, CI/CD, Local Development"
                                        className="bg-black/20 border-white/10 font-mono text-xs"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleCreateKey}
                                        disabled={creatingKey || !newKeyName.trim()}
                                        className="font-mono text-[10px] uppercase shrink-0"
                                    >
                                        {creatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Keys list */}
                        {!canViewKeys ? (
                            <div className="p-6 text-center border border-dashed border-border rounded-lg bg-black/20">
                                <Shield className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-20" />
                                <p className="text-[10px] text-muted-foreground uppercase font-mono">Hidden by Policy</p>
                                <p className="text-[8px] opacity-40 mt-1">Contact your organization owner to access API keys.</p>
                            </div>
                        ) : keysLoading ? (
                            <div className="p-6 flex justify-center">
                                <Loader2 className="w-4 h-4 animate-spin opacity-40" />
                            </div>
                        ) : keys.length === 0 ? (
                            <div className="p-6 text-center border border-dashed border-border rounded-lg bg-black/20">
                                <Key className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-20" />
                                <p className="text-[10px] text-muted-foreground uppercase font-mono">No API keys created yet</p>
                                <p className="text-[8px] opacity-40 mt-1">Create a key to integrate with the AgentTrace SDK.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {keys.map((key) => (
                                    <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold">{key.name}</span>
                                                <span className="text-[9px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                                                    {key.scopes?.join(', ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-mono text-muted-foreground">{key.key_prefix}</span>
                                                <span className="text-[9px] text-muted-foreground/50">
                                                    Created {new Date(key.created_at).toLocaleDateString()}
                                                </span>
                                                {key.last_used_at && (
                                                    <span className="text-[9px] text-muted-foreground/50">
                                                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isOwner && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7"
                                                onClick={() => handleRevokeKey(key.id, key.name)}
                                                title="Revoke key"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-[9px] text-muted-foreground italic uppercase">
                            Never share your secret key in frontend applications.
                        </p>
                    </CardContent>
                </Card>

                {/* ─── Access Control ────────────────────────────── */}
                <Card className="bg-card/50 border-border">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                            <Shield className="w-4 h-4 text-brand" />
                            Access Control
                        </CardTitle>
                        <CardDescription className="text-xs">Authentication method and security protocols.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <div className="text-[10px] font-mono uppercase">Email + Password Auth</div>
                                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">Primary authentication method</div>
                                </div>
                            </div>
                            <div className="text-[9px] font-mono uppercase text-green-500 font-bold px-2 py-0.5 bg-green-500/10 rounded border border-green-500/20">Active</div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <div className="text-[10px] font-mono uppercase">Two-Factor Authentication</div>
                                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">Email OTP verification on login</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {twoFactorEnabled ? (
                                    <div className="text-[9px] font-mono uppercase text-green-500 font-bold px-2 py-0.5 bg-green-500/10 rounded border border-green-500/20">Active</div>
                                ) : (
                                    <div className="text-[9px] font-mono uppercase text-muted-foreground font-bold px-2 py-0.5 bg-muted/40 rounded border border-border">Inactive</div>
                                )}
                                <Button
                                    size="sm"
                                    variant={twoFactorEnabled ? "destructive" : "default"}
                                    className="font-mono text-[9px] uppercase h-6 px-2"
                                    onClick={handleToggle2FA}
                                    disabled={twoFactorToggling}
                                >
                                    {twoFactorToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : twoFactorEnabled ? "Disable" : "Enable"}
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <div className="text-[10px] font-mono uppercase">Role-Based Access (RBAC)</div>
                                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">Owner → Dev → Viewer permission hierarchy</div>
                                </div>
                            </div>
                            <div className="text-[9px] font-mono uppercase text-green-500 font-bold px-2 py-0.5 bg-green-500/10 rounded border border-green-500/20">Enforced</div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                <Key className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <div className="text-[10px] font-mono uppercase">API Key Authentication</div>
                                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">SHA-256 hashed keys for SDK/CLI access</div>
                                </div>
                            </div>
                            <div className="text-[9px] font-mono uppercase text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                                {keys.length} Key{keys.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
