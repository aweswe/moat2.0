-- AI Execution Lineage & Real-time Events Schema

-- Add lineage columns to traces
ALTER TABLE public.traces ADD COLUMN IF NOT EXISTS parent_trace_id UUID;
ALTER TABLE public.traces ADD COLUMN IF NOT EXISTS fork_step INTEGER;

-- Create trace_events table
CREATE TABLE IF NOT EXISTS public.trace_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trace_id UUID NOT NULL REFERENCES public.traces(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id ON public.trace_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id_seq ON public.trace_events(trace_id, seq);

-- Enable RLS
ALTER TABLE public.trace_events ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo, usually tied to Org/User)
CREATE POLICY "Allow service role full access" ON public.trace_events
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read for demo" ON public.trace_events
    FOR SELECT
    USING (true);
