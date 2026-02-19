-- =============================================
-- Phase G: Production Identity Tables
-- org_members (replaces profiles for membership)
-- invites (token-based, single-use)
-- =============================================

-- 1. org_members — junction table (multi-org ready)
CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','dev','viewer')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- 2. invites — secure token-based invitations
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('dev','viewer')),
    token_hash TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    used_at TIMESTAMPTZ,
    UNIQUE(org_id, email)
);

-- 3. Migrate existing profiles → org_members
INSERT INTO org_members (org_id, user_id, role, display_name, created_at)
SELECT organization_id, user_id, 
       CASE WHEN role = 'member' THEN 'viewer' ELSE role END,
       display_name, created_at
FROM profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (org_id, user_id) DO NOTHING;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
