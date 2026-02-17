# AgentTrace Dashboard Audit & Registry Report

This report analyzes every component of the dashboard to ensure end-to-end functionality and identify remaining mock data.

## 1. System Overview (`/dashboard`)
| Component | Status | Source | Notes |
| :--- | :--- | :--- | :--- |
| Stats Cards | **LIVE** | `useStats()` hook | Fetches real counts for Traces, Jobs, AFE. |
| Recent Execution Logs | **LIVE** | `useJobs()` hook | Fetches last 10 jobs. Subscribes to realtime updates. |
| Upcoming Schedules | **MOCK** | Hardcoded UI | Displays "SCH_LAYER_IDLE" regardless of state. |

## 2. Trace Registry (`/dashboard/traces`)
| Component | Status | Source | Notes |
| :--- | :--- | :--- | :--- |
| Trace List | **LIVE** | Direct Supabase query | Fetches from `public.traces`. |
| Search/Filter | **WORKING** | Local state | Correctly filters UUIDs and titles. |
| **Visibility Issue** | **CRITICAL** | RLS / Org ID | **Identified Root Cause**: The `profiles` table is empty. Supabase RLS policies block data access if the logged-in user is not linked to an organization via a profile. This is why traces are invisible. |

## 3. Trace Details (`/dashboard/traces/[id]`)
| Component | Status | Source | Notes |
| :--- | :--- | :--- | :--- |
| Trace Metadata | **LIVE** | `useTrace()` hook | Fetches title/status from DB. |
| Event Timeline | **LIVE** | Supabase Storage | Downloads `events.jsonl` from `traces` bucket. |
| Seeker Bar | **LIVE** | State-driven | Values derived from event index. |
| Execution Node | **MOCK** | Hardcoded UI | Displays "Python_3.12" / "Node-Delta-04" statically. |

## 4. Worker Fleet (`/dashboard/jobs`)
| Component | Status | Source | Notes |
| :--- | :--- | :--- | :--- |
| Job List | **LIVE** | `useJobs()` hook | Directly reflects the `jobs` table state. |
| Status Indicators | **LIVE** | Realtime | Colors/Shadows update instantly via Postgres subscriptions. |

## 5. Collaboration Space (`/dashboard/team`)
| Component | Status | Source | Notes |
| :--- | :--- | :--- | :--- |
| Member List | **MOCK** | Static Array | Hardcoded to "Unknown_User". No connection to `profiles` table. |
| Invitations | **NON-FUNC**| UI Only | Button exists but has no logic. |

## 6. Space Settings (`/dashboard/settings`)
| Component | Status | Source | Notes |
| :--- | :--- | :--- | :--- |
| Org Profile | **VIEW ONLY** | Hardcoded UI | Doesn't persist changes to `organizations` table. |
| API Keys | **MOCK** | Static String | Placeholder `at_live_xxx` isn't a real key fetch. |

---

# Strategic Fix Plan

### Phase A: Trace Visibility (FIXING NOW)
1.  **Profile Linking**: Modify Auth hook to ensure a `profile` exists and is linked to the "Default Organization" upon first login.
2.  **RLS Bypass**: Verify visibility by manually inserting a profile record for the test user.

### Phase B: Live Refinement (BUILDING NEXT)
1.  **Settings Persistence**: Update `Space Settings` to query the `organizations` table and allow updates via Supabase.
2.  **Team Registry**: Implement a `profiles` fetch for the "Authorized Operators" list.
3.  **Static Cleanup**: Remove "Upcoming Schedules" mock and replace with meaningful state or hide if empty.

### Phase C: Dashboard Polish
1.  **History Link**: Fix the "History" tab in sidebar if it's pointing to the wrong place.
2.  **Search Overlap**: Unify the Topbar search with the Registry search.
