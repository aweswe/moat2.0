"use client";
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

export interface Job {
    id: string;
    status: string;
    created_at: string;
    trace_id: string;
    error?: string;
    output_url?: string;
}

export interface Stats {
    totalTraces: number;
    activeJobs: number;
    successRate: string;
    afePotential: number; // Linked to afe_candidates
}

export interface Trace {
    id: string;
    title: string;
    status: string;
    created_at: string;
    org_id: string;
    parent_trace_id?: string;
}

export interface AFECandidate {
    id: string;
    job_id: string;
    fix_type: string;
    fix_explanation: string;
    diff_payload: string;
    confidence: number;
    status: string;
    created_at: string;
}

export function useJobs() {
    const [jobs, setJobs] = React.useState<Job[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { user } = useAuth();

    const fetchJobs = React.useCallback(async () => {
        if (!user?.organizationId) return;

        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('org_id', user.organizationId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Error fetching jobs:", error.message);
        } else {
            setJobs(data || []);
        }
        setLoading(false);
    }, [user]);

    React.useEffect(() => {
        fetchJobs();

        // Subscribe to changes
        const subscription = supabase
            .channel('jobs-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'jobs',
                filter: `org_id=eq.${user?.organizationId}`
            }, () => {
                fetchJobs();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchJobs]);

    return { jobs, loading, refetch: fetchJobs };
}

export function useStats() {
    const [stats, setStats] = React.useState<Stats>({
        totalTraces: 0,
        activeJobs: 0,
        successRate: "0%",
        afePotential: 0
    });
    const { user } = useAuth();

    React.useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            if (!user?.organizationId) return;

            // Strictly filter by org_id
            const { count: tracesCount } = await supabase.from('traces').select('*', { count: 'exact', head: true }).eq('org_id', user.organizationId);
            const { count: activeJobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('org_id', user.organizationId).eq('status', 'running');
            const { count: successCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('org_id', user.organizationId).eq('status', 'completed');
            const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('org_id', user.organizationId);
            const { count: afeCount } = await supabase
                .from('afe_candidates')
                .select('id, jobs!inner(org_id)', { count: 'exact', head: true })
                .eq('jobs.org_id', user.organizationId);

            const successRate = totalJobs ? Math.round((successCount || 0) / totalJobs * 100) : 0;

            setStats({
                totalTraces: tracesCount || 0,
                activeJobs: activeJobsCount || 0,
                successRate: `${successRate}%`,
                afePotential: afeCount || 0
            });
        };

        fetchStats();

        // Real-time stats subscription
        const sub = supabase.channel('stats-update')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'traces' }, fetchStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'afe_candidates' }, fetchStats)
            .subscribe();

        return () => { sub.unsubscribe(); };
    }, [user]);

    return stats;
}

export function useTrace(traceId: string) {
    const [trace, setTrace] = React.useState<Trace | null>(null);
    const [metadata, setMetadata] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const { user } = useAuth();

    React.useEffect(() => {
        if (!traceId || !user) return;

        const fetchTrace = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/trace/${traceId}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });

                if (!res.ok) {
                    console.error('[useTrace] API error:', res.status);
                    setLoading(false);
                    return;
                }

                const { trace: traceData, metadata: meta } = await res.json();
                setTrace(traceData);
                setMetadata(meta);
            } catch (err) {
                console.error('[useTrace] Fetch failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTrace();
    }, [traceId, user]);

    return { trace, metadata, loading };
}

export function useAFECandidates(jobId: string) {
    const [candidates, setCandidates] = React.useState<AFECandidate[]>([]);

    React.useEffect(() => {
        if (!jobId) return;

        const fetchCandidates = async () => {
            const { data, error } = await supabase
                .from('afe_candidates')
                .select('*')
                .eq('job_id', jobId);

            if (!error) setCandidates(data || []);
        };

        fetchCandidates();
    }, [jobId]);

    return candidates;
}
export function useOrganization(orgId: string | null | undefined) {
    const [organization, setOrganization] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    const fetchOrg = React.useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

        if (!error) setOrganization(data);
        setLoading(false);
    }, [orgId]);

    React.useEffect(() => {
        fetchOrg();
    }, [fetchOrg]);

    const updateOrg = async (updates: any) => {
        if (!orgId) return;
        const { error } = await supabase
            .from('organizations')
            .update(updates)
            .eq('id', orgId);
        if (!error) await fetchOrg();
        return { error };
    };

    return { organization, loading, updateOrg };
}

export function useMembers(orgId: string | null | undefined) {
    const [members, setMembers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!orgId) return;

        const fetchMembers = async () => {
            const { data, error } = await supabase
                .from('org_members')
                .select('*')
                .eq('org_id', orgId);

            if (!error) setMembers(data || []);
            setLoading(false);
        };

        fetchMembers();
    }, [orgId]);

    return { members, loading };
}
export function useTraceEvents(traceId: string | null | undefined, branchId?: string | null) {
    const [events, setEvents] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchEvents = React.useCallback(async (id: string, bId?: string | null) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return [];

            // If we have a branchId, we use the replay API to get the branched events (with overrides)
            if (bId) {
                const res = await fetch(`/api/replay`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ traceId: id, branch: bId })
                });

                if (!res.ok) {
                    console.error('[useTraceEvents] Replay API error:', res.status);
                    return [];
                }

                const { events: evts } = await res.json();
                return evts || [];
            }

            const res = await fetch(`/api/trace/events?traceId=${id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            if (!res.ok) {
                console.error('[useTraceEvents] API error:', res.status);
                return [];
            }

            const { events: evts } = await res.json();
            return evts || [];
        } catch (err) {
            console.error('[useTraceEvents] Fetch failed:', err);
            return [];
        }
    }, []);

    React.useEffect(() => {
        if (!traceId) return;

        const load = async () => {
            setLoading(true);
            const data = await fetchEvents(traceId, branchId);
            setEvents(data);
            setLoading(false);
        };

        load();
    }, [traceId, branchId, fetchEvents]);

    return { events, loading, fetchEvents };
}

export function useSchedules() {
    const [schedules, setSchedules] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { user } = useAuth();

    React.useEffect(() => {
        if (!user?.organizationId) return;

        const fetchSchedules = async () => {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('org_id', user.organizationId)
                .order('next_run_at', { ascending: true });

            if (!error) setSchedules(data || []);
            setLoading(false);
        };

        fetchSchedules();
    }, [user]);

    return { schedules, loading };
}
