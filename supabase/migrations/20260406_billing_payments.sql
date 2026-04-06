create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  pack_id text not null,
  pack_name text not null,
  tokens integer not null check (tokens > 0),
  amount_centavos integer not null check (amount_centavos > 0),
  paymongo_payment_intent_id text not null unique,
  paymongo_payment_id text unique,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'paid', 'credited', 'expired', 'failed')),
  paid_at timestamptz,
  credited_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_payments_user_id_idx
  on public.billing_payments (user_id, created_at desc);

create or replace function public.complete_billing_payment(
  p_payment_intent_id text,
  p_payment_id text default null,
  p_paid_at timestamptz default timezone('utc', now())
)
returns table (
  already_credited boolean,
  user_id uuid,
  email text,
  tokens integer,
  amount_centavos integer,
  pack_id text,
  pack_name text,
  new_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.billing_payments%rowtype;
  credited_before boolean;
begin
  if coalesce(trim(p_payment_intent_id), '') = '' then
    raise exception 'Payment intent ID is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_payment_intent_id, 0));

  select *
  into payment_row
  from public.billing_payments
  where paymongo_payment_intent_id = p_payment_intent_id
  for update;

  if not found then
    raise exception 'Billing payment not found for intent %', p_payment_intent_id;
  end if;

  credited_before := payment_row.credited_at is not null;

  if payment_row.paymongo_payment_id is not null
     and p_payment_id is not null
     and payment_row.paymongo_payment_id <> p_payment_id then
    raise exception 'Billing payment % already linked to payment %',
      p_payment_intent_id,
      payment_row.paymongo_payment_id;
  end if;

  update public.billing_payments
  set status = case
      when credited_before then status
      else 'credited'
    end,
    paymongo_payment_id = coalesce(paymongo_payment_id, p_payment_id),
    paid_at = coalesce(paid_at, p_paid_at),
    credited_at = case
      when credited_before then credited_at
      else timezone('utc', now())
    end,
    updated_at = timezone('utc', now())
  where id = payment_row.id;

  if not credited_before then
    insert into public.token_ledger (
      user_id,
      amount,
      type,
      description
    ) values (
      payment_row.user_id,
      payment_row.tokens,
      'topup',
      payment_row.pack_name || ' pack - ' || payment_row.tokens::text || ' tokens'
    );
  end if;

  return query
  select
    credited_before,
    payment_row.user_id,
    payment_row.email,
    payment_row.tokens,
    payment_row.amount_centavos,
    payment_row.pack_id,
    payment_row.pack_name,
    (
      select coalesce(sum(tl.amount), 0)::integer
      from public.token_ledger tl
      where tl.user_id = payment_row.user_id
    ) as new_balance;
end;
$$;

grant execute on function public.complete_billing_payment(text, text, timestamptz) to service_role;
