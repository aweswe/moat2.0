"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMembers } from "@/hooks/use-database";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Users,
    UserPlus,
    Shield,
    Mail,
    MoreVertical,
    CheckCircle2,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TeamPage() {
    const { user } = useAuth();
    const { members, loading } = useMembers(user?.organizationId);

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Collaboration Space</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-widest opacity-60">Control // Registry_v1.2</p>
                </div>
                <Button size="sm" className="font-mono text-[10px] uppercase">
                    <UserPlus className="w-3 h-3 mr-2" /> Invite_Operator
                </Button>
            </div>

            <Card className="bg-card/50 border-border overflow-hidden">
                <CardHeader className="border-b border-border/50 py-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                        <Users className="w-4 h-4 text-brand" />
                        Authorized_Operators
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Resolving_Fleet...</span>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="p-16 text-center">
                            <Users className="w-10 h-10 mx-auto mb-4 text-brand opacity-20" />
                            <div className="text-sm font-semibold mb-1 opacity-60">No team members yet</div>
                            <p className="text-[10px] text-muted-foreground max-w-[280px] mx-auto">
                                Invite your first team member to collaborate on trace debugging.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 divide-y divide-border/50 font-mono text-xs">
                            {members.map((member, i) => (
                                <div key={member.id || i} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold uppercase">
                                            {member.display_name?.[0] || member.email?.[0] || "?"}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-foreground font-bold text-sm tracking-tight group-hover:text-brand transition-colors">
                                                {member.display_name || "Unknown_User"}
                                            </div>
                                            <div className="text-[10px] opacity-40 lowercase flex items-center gap-1.5">
                                                <Mail className="w-3 h-3" /> {member.email}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-[9px] uppercase tracking-wider flex items-center gap-1.5 text-brand font-bold">
                                                <Shield className="w-3 h-3" /> {member.role}
                                            </div>
                                            <div className="text-[10px] flex items-center gap-1.5 opacity-60">
                                                <CheckCircle2 className="w-3 h-3 text-green-500" /> Active
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-brand/5 border-brand/20 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-xs font-mono uppercase tracking-widest text-brand">Access_Audit</CardTitle>
                    </CardHeader>
                    <CardContent className="text-[10px] font-mono opacity-60 uppercase leading-relaxed">
                        Security protocols strictly enforced. All data access by operators is logged and traceable back to initial authentication event.
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border border-dashed">
                    <CardHeader>
                        <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Resource_Management</CardTitle>
                    </CardHeader>
                    <CardContent className="text-[10px] font-mono opacity-60 uppercase leading-relaxed">
                        Permissions are managed at the organization level. Use the settings panel to configure custom RBAC rules (Coming Soon).
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
