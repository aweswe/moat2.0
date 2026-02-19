-- Jobs Queue Table for AgentTrace Worker

create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  trace_id uuid not null, -- The trace being operated on
  type text not null, -- 'simulate', 'replay', 'fix'
  status text not null default 'queued', -- 'queued', 'processing', 'completed', 'failed'
  
  -- Inputs
  payload jsonb default '{}'::jsonb, -- e.g. overrides, target_step
  
  -- Outputs
  worker_id text, -- ID of the worker that claimed it
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  result jsonb,
  error text
);

-- RLS Policies
alter table public.jobs enable row level security;

-- Allow authenticated users to insert jobs
create policy "Users can insert their own jobs"
on public.jobs for insert
to authenticated
with check (true);

-- Allow authenticated users into view their own jobs (if we track owner)
-- For demo, we might allow public or matching trace owner.
-- Let's add user_id column for security.
alter table public.jobs add column user_id uuid references auth.users(id);

create policy "Users can view their own jobs"
on public.jobs for select
to authenticated
using (auth.uid() = user_id);

-- Worker Service Role needs full access (Service Role bypasses RLS by default)
