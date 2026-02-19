-- AgentTrace: Multiverse Branches Table
-- Run this in the Supabase SQL editor at:
-- https://supabase.com/dashboard/project/wddxzszcjturywfzjxjy/sql

CREATE TABLE IF NOT EXISTS public.branches (
    id              TEXT PRIMARY KEY,
    parent_trace_id TEXT NOT NULL,
    fork_step       INTEGER NOT NULL DEFAULT 0,
    name            TEXT,
    override_payload JSONB,
    parent_hash     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    org_id          UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Index for fast lookup by parent trace
CREATE INDEX IF NOT EXISTS branches_parent_trace_idx ON public.branches (parent_trace_id);
CREATE INDEX IF NOT EXISTS branches_org_idx ON public.branches (org_id);

-- Row Level Security
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Policy: org members can see and manage their org's branches
CREATE POLICY "org_members_manage_branches"
    ON public.branches
    FOR ALL
    USING (
        org_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Grant access to service role (used by API routes)
GRANT ALL ON public.branches TO service_role;
GRANT SELECT ON public.branches TO anon;
GRANT ALL ON public.branches TO authenticated;
