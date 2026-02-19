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
        if (!user) return;

        const { data, error } = await supabase
            .from('jobs')
            .select('*')
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
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
            // This is a simplified stats fetch. In a real app, these would be RPCs or aggregated queries.
            const { count: tracesCount } = await supabase.from('traces').select('*', { count: 'exact', head: true });
            const { count: activeJobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'running');
            const { count: successCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed');
            const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
            const { count: afeCount } = await supabase.from('afe_candidates').select('*', { count: 'exact', head: true });

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

    React.useEffect(() => {
        if (!traceId) return;

        const fetchTrace = async () => {
            // 1. Fetch Trace Record
            const { data: traceData, error: traceError } = await supabase
                .from('traces')
                .select('*')
                .eq('id', traceId)
                .single();

            if (traceError) {
                console.error("Error fetching trace:", traceError);
                setLoading(false);
                return;
            }
            setTrace(traceData);

            // 2. Fetch Metadata (Script Content)
            try {
                const { data: metaData, error: metaError } = await supabase.storage
                    .from('traces')
                    .download(`${traceId}/metadata.json`);

                if (!metaError && metaData) {
                    const text = await metaData.text();
                    setMetadata(JSON.parse(text));
                }
            } catch (e) {
                console.warn("Failed to fetch metadata.json", e);
            }

            setLoading(false);
        };

        fetchTrace();
    }, [traceId]);

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
                .from('profiles')
                .select('*')
                .eq('organization_id', orgId);

            if (!error) setMembers(data || []);
            setLoading(false);
        };

        fetchMembers();
    }, [orgId]);

    return { members, loading };
}
export function useTraceEvents(traceId: string | null | undefined) {
    const [events, setEvents] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchEvents = React.useCallback(async () => {
        if (!traceId) return;
        setLoading(true);

        try {
            // Download events.jsonl from Supabase Storage
            const { data, error } = await supabase.storage
                .from('traces')
                .download(`${traceId}/events.jsonl`);

            if (error) {
                console.warn("Failed to fetch events.jsonl:", error);
                setEvents([]);
            } else if (data) {
                const text = await data.text();
                // Parse NDJSON
                const parsedEvents = text
                    .split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (e) {
                            return null;
                        }
                    })
                    .filter(Boolean);

                setEvents(parsedEvents);
            }
        } catch (e) {
            console.error("Error loading trace events:", e);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [traceId]);

    React.useEffect(() => {
        fetchEvents();
        // No real-time subscription for storage files yet (Storage events are basic)
    }, [traceId, fetchEvents]);

    return { events, loading };
}

export function useSchedules() {
    const [schedules, setSchedules] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSchedules = async () => {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .order('next_run_at', { ascending: true });

            if (!error) setSchedules(data || []);
            setLoading(false);
        };

        fetchSchedules();
    }, []);

    return { schedules, loading };
}
