-- =====================================================================
-- Task 8.1: DB-native analytics adapter
-- =====================================================================
-- Append-only events table for activation/retention/funnel analytics.
-- Read by Supabase views (cohort D1/D7/D30 etc.) and by the admin UI.
--
-- PII rule: do NOT insert raw email or IP. user_id (FK to auth.users)
-- is the only identifier. lib/analytics/track.ts strips email/IP from
-- the props payload at call time.
--
-- Schema:
--   analytics_events(
--     id uuid PK,
--     user_id uuid NULL (anonymous events permitted),
--     event text NOT NULL (e.g. 'signup', 'first_image_generated'),
--     props jsonb NOT NULL DEFAULT '{}'::jsonb,
--     created_at timestamptz NOT NULL DEFAULT now()
--   )
-- =====================================================================

create table if not exists analytics_events (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid references auth.users(id) on delete set null,
    event      text not null,
    props      jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_event_created
    on analytics_events(event, created_at desc);

create index if not exists idx_analytics_events_user_event
    on analytics_events(user_id, event)
    where user_id is not null;

-- For idempotency on first_* events: a unique partial index that
-- prevents the same user from recording the same first_* event twice.
create unique index if not exists uniq_analytics_events_user_first
    on analytics_events(user_id, event)
    where user_id is not null and event like 'first_%';

alter table analytics_events enable row level security;

-- service_role bypasses RLS; no client-side policies — analytics is
-- emitted only from server routes/actions.
