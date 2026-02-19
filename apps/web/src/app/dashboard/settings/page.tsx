"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-database";
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
    Globe,
    Loader2,
    CloudCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
    const { user, hasPermission } = useAuth();
    const { organization, loading, updateOrg } = useOrganization(user?.organizationId);

    const [name, setName] = React.useState("");
    const [slug, setSlug] = React.useState("");
    const [updating, setUpdating] = React.useState(false);

    const canUpdate = hasPermission('invite_member'); // Using owner-level permission as proxy for org updates
    const canViewSecrets = user?.role !== 'viewer';

    React.useEffect(() => {
        if (organization) {
            setName(organization.name || "");
            setSlug(organization.slug || "");
        }
    }, [organization]);

    const handleUpdate = async () => {
        setUpdating(true);
        const result = await updateOrg({ name, slug });
        if (result?.error) {
            toast.error("Failed to update organization: " + result.error.message);
        } else if (!result) {
            toast.error("Failed to update organization: No response.");
        } else {
            toast.success("Organization profile updated.");
        }
        setUpdating(false);
    };

    if (loading) {
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
                <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">Configuration // ID: {organization?.id}</p>
            </div>

            <div className="grid gap-6">
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
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="font-mono text-[10px] uppercase w-fit"
                            onClick={handleUpdate}
                            disabled={updating || !canUpdate}
                            title={!canUpdate ? "Only organization owners can update settings" : ""}
                        >
                            {updating ? "Syncing..." : "Update_Config"}
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-card/50 border-border">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                                <Key className="w-4 h-4 text-brand" />
                                API Credentials
                            </CardTitle>
                            <CardDescription className="text-xs">Keys for CLI and SDK integration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {canViewSecrets ? (
                                <>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-mono uppercase opacity-60">Secret Key</Label>
                                        <div className="relative">
                                            <Input
                                                value={organization?.id ? `at_live_${organization.id.replace(/-/g, '')}` : "NOT_PROVISIONED"}
                                                readOnly
                                                className="pr-10 bg-black/20 border-white/10 font-mono text-xs blur-sm hover:blur-none transition-all cursor-pointer"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-white"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`at_live_${organization?.id?.replace(/-/g, '')}`);
                                                    toast.success("Key copied to clipboard.");
                                                }}
                                            >
                                                <CloudCog className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground italic uppercase">Never share your secret key in frontend applications.</p>
                                </>
                            ) : (
                                <div className="p-6 text-center border border-dashed border-border rounded-lg bg-black/20">
                                    <Shield className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-20" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-mono">Hidden by Policy</p>
                                    <p className="text-[8px] opacity-40 mt-1">Contact your organization owner to access API keys.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                                <Shield className="w-4 h-4 text-brand" />
                                Access Control
                            </CardTitle>
                            <CardDescription className="text-xs">Manage roles and security protocols.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <div className="text-[10px] font-mono uppercase">Magic Link Auth</div>
                                </div>
                                <div className="text-[9px] font-mono uppercase text-green-500 font-bold px-2 py-0.5 bg-green-500/10 rounded border border-green-500/20">Active</div>
                            </div>
                            <Button variant="outline" size="sm" className="font-mono text-[10px] uppercase w-full border-white/10">Configure_RBAC</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
