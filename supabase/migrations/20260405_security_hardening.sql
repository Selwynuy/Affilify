create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  window_started_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.claim_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer,
  p_now timestamptz default timezone('utc', now())
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.rate_limits%rowtype;
  next_reset timestamptz;
  window_interval interval;
begin
  if p_limit <= 0 or p_window_ms <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  window_interval := (p_window_ms::text || ' milliseconds')::interval;

  perform pg_advisory_xact_lock(hashtextextended(p_key, 0));

  select *
  into current_row
  from public.rate_limits
  where key = p_key
  for update;

  if not found or current_row.window_started_at + window_interval <= p_now then
    insert into public.rate_limits (key, count, window_started_at, updated_at)
    values (p_key, 1, p_now, p_now)
    on conflict (key) do update
      set count = 1,
          window_started_at = excluded.window_started_at,
          updated_at = excluded.updated_at;

    next_reset := p_now + window_interval;
    return query select true, greatest(p_limit - 1, 0), next_reset;
    return;
  end if;

  next_reset := current_row.window_started_at + window_interval;

  if current_row.count >= p_limit then
    return query select false, 0, next_reset;
    return;
  end if;

  update public.rate_limits
  set count = current_row.count + 1,
      updated_at = p_now
  where key = p_key;

  return query select true, greatest(p_limit - (current_row.count + 1), 0), next_reset;
end;
$$;

create or replace function public.consume_tokens(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_project_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(sum(amount), 0)::integer
  into current_balance
  from public.token_ledger
  where user_id = p_user_id;

  if current_balance < p_amount then
    return false;
  end if;

  insert into public.token_ledger (
    user_id,
    amount,
    type,
    description,
    project_id
  ) values (
    p_user_id,
    -p_amount,
    p_type,
    p_description,
    p_project_id
  );

  return true;
end;
$$;

grant execute on function public.claim_rate_limit(text, integer, integer, timestamptz) to authenticated, service_role;
grant execute on function public.consume_tokens(uuid, integer, text, text, uuid) to authenticated, service_role;
