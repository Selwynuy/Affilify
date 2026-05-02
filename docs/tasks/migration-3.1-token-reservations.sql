-- =====================================================================
-- Task 3.1: reserve-then-commit token model
-- =====================================================================
-- Adds an explicit two-phase token spend so /api/generate (and other
-- token-charging routes) can hold tokens BEFORE calling Gemini, then
-- commit on success or release on failure/timeout. Eliminates the race
-- where a successful generation could fail token deduction afterwards.
--
-- Schema:
--   token_reservations(id, user_id, amount, type, description,
--                      project_id, status, expires_at, ...)
-- RPCs:
--   reserve_tokens(...)  -> uuid (NULL when balance insufficient)
--   commit_token_reservation(uuid) -> boolean
--   release_token_reservation(uuid) -> boolean
--   release_expired_token_reservations() -> integer
--
-- Balance accounting:
--   getTokenBalance reads token_ledger. Reservations DO reduce the
--   effective spendable balance via reserve_tokens checking
--   (current_balance - active_reservation_total) >= amount.
--   Committed reservations write a normal token_ledger row (negative
--   amount). Released reservations leave token_ledger untouched.
--
-- Apply manually via Supabase migration runner.
-- =====================================================================

-- Postgres has no `create type if not exists`, so we guard with a DO block.
do $$
begin
    if not exists (select 1 from pg_type where typname = 'token_reservation_status') then
        create type token_reservation_status as enum ('active', 'committed', 'released', 'expired');
    end if;
end$$;

create table if not exists token_reservations (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users(id) on delete cascade,
    amount        integer not null check (amount > 0),
    type          text not null,
    description   text not null,
    project_id    uuid,
    status        token_reservation_status not null default 'active',
    created_at    timestamptz not null default now(),
    expires_at    timestamptz not null default (now() + interval '5 minutes'),
    committed_at  timestamptz,
    released_at   timestamptz,
    released_reason text
);

create index if not exists idx_token_reservations_user_active
    on token_reservations(user_id) where status = 'active';

create index if not exists idx_token_reservations_expires
    on token_reservations(expires_at) where status = 'active';

-- ---------------------------------------------------------------------
-- reserve_tokens: atomic balance check + insert.
-- Returns the new reservation id on success, NULL when the user does
-- not have enough spendable balance after subtracting active reservations.
-- ---------------------------------------------------------------------
create or replace function reserve_tokens(
    p_user_id uuid,
    p_amount integer,
    p_type text,
    p_description text,
    p_project_id uuid default null,
    p_ttl_seconds integer default 300
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_balance integer;
    v_held integer;
    v_id uuid;
begin
    if p_amount is null or p_amount <= 0 then
        return null;
    end if;

    -- Lock the user's reservation rows to prevent concurrent oversell.
    perform 1 from token_reservations
        where user_id = p_user_id and status = 'active'
        for update;

    select coalesce(sum(amount), 0) into v_balance
        from token_ledger where user_id = p_user_id;

    select coalesce(sum(amount), 0) into v_held
        from token_reservations
        where user_id = p_user_id and status = 'active' and expires_at > now();

    if (v_balance - v_held) < p_amount then
        return null;
    end if;

    insert into token_reservations(user_id, amount, type, description, project_id, expires_at)
        values (p_user_id, p_amount, p_type, p_description, p_project_id, now() + make_interval(secs => p_ttl_seconds))
        returning id into v_id;

    return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- commit_token_reservation: mark reservation committed AND write a
-- negative token_ledger row in the same transaction. Idempotent: a
-- second call on a committed reservation returns true without
-- double-charging.
-- ---------------------------------------------------------------------
create or replace function commit_token_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row token_reservations%rowtype;
begin
    select * into v_row from token_reservations where id = p_reservation_id for update;
    if not found then
        return false;
    end if;
    if v_row.status = 'committed' then
        return true;
    end if;
    if v_row.status <> 'active' then
        return false;
    end if;
    if v_row.expires_at <= now() then
        update token_reservations
            set status = 'expired', released_at = now(), released_reason = 'expired_at_commit'
            where id = p_reservation_id;
        return false;
    end if;

    insert into token_ledger(user_id, amount, type, description, project_id)
        values (v_row.user_id, -v_row.amount, v_row.type, v_row.description, v_row.project_id);

    update token_reservations
        set status = 'committed', committed_at = now()
        where id = p_reservation_id;

    return true;
end;
$$;

-- ---------------------------------------------------------------------
-- release_token_reservation: free a hold without charging. Idempotent.
-- ---------------------------------------------------------------------
create or replace function release_token_reservation(
    p_reservation_id uuid,
    p_reason text default 'released'
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status token_reservation_status;
begin
    select status into v_status from token_reservations where id = p_reservation_id for update;
    if not found then
        return false;
    end if;
    if v_status <> 'active' then
        return v_status = 'released';
    end if;
    update token_reservations
        set status = 'released', released_at = now(), released_reason = coalesce(p_reason, 'released')
        where id = p_reservation_id;
    return true;
end;
$$;

-- ---------------------------------------------------------------------
-- release_expired_token_reservations: cron entrypoint.
-- ---------------------------------------------------------------------
create or replace function release_expired_token_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count integer;
begin
    with expired as (
        update token_reservations
            set status = 'expired', released_at = now(), released_reason = 'ttl'
            where status = 'active' and expires_at <= now()
            returning 1
    )
    select count(*) into v_count from expired;
    return coalesce(v_count, 0);
end;
$$;

revoke all on function reserve_tokens(uuid, integer, text, text, uuid, integer) from public;
revoke all on function commit_token_reservation(uuid) from public;
revoke all on function release_token_reservation(uuid, text) from public;
revoke all on function release_expired_token_reservations() from public;

grant execute on function reserve_tokens(uuid, integer, text, text, uuid, integer) to service_role;
grant execute on function commit_token_reservation(uuid) to service_role;
grant execute on function release_token_reservation(uuid, text) to service_role;
grant execute on function release_expired_token_reservations() to service_role;

alter table token_reservations enable row level security;

-- No client-side access; service_role bypasses RLS, so no policies needed.
