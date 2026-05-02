# Manual migration step — Task 3.1 token reservations

**Migration SQL:** `docs/tasks/migration-3.1-token-reservations.sql` (kept here because `supabase/migrations/` is `.gitignore`d in this repo).

When applying, copy the file into `supabase/migrations/20260502000100_token_reservations.sql` locally before running, OR paste the SQL directly into the Supabase SQL editor.

## What it adds

| Object | Purpose |
|---|---|
| `token_reservation_status` enum | `active` / `committed` / `released` / `expired` |
| `token_reservations` table | Two-phase token holds with TTL |
| `reserve_tokens(user, amt, type, desc, project, ttl)` RPC | Atomic balance check + insert; returns reservation id or NULL |
| `commit_token_reservation(id)` RPC | Idempotent commit — writes negative `token_ledger` row |
| `release_token_reservation(id, reason)` RPC | Idempotent release |
| `release_expired_token_reservations()` RPC | Cron entrypoint |

## Apply

```bash
# Local
supabase db reset           # full reset, OR:
supabase migration up       # apply pending migrations

# Production / staging — via Supabase SQL editor
# Paste the migration SQL and run, or use the Supabase CLI with prod link.
```

## Schedule the cron

In Supabase Dashboard → Database → Extensions, enable `pg_cron` if not already.
Then run once:

```sql
select cron.schedule(
  'release-expired-token-reservations',
  '*/5 * * * *',                                  -- every 5 minutes
  $$ select release_expired_token_reservations(); $$
);
```

If you don't want pg_cron, expose `releaseExpiredTokenReservations()` (in `lib/billing/reservations.ts`) on a Vercel cron route hitting it every 5 min.

## Wiring it into `/api/generate`

Not done in this batch — left as a follow-up because it changes the
hot path of the most critical user flow. Recommended order when you
pick it up:

1. Replace the upfront `getTokenBalance` check with `reserveTokens(...)`.
2. On the `image` success path, call `commitTokenReservation(id)`
   instead of `deductTokens(...)`.
3. On every error/timeout path (including the new `code: 'timeout'`
   branch from Task 2.4), call `releaseTokenReservation(id, reason)`.
4. Update tests to assert the reservation is released on timeout.

## Rollback

```sql
drop function if exists release_expired_token_reservations();
drop function if exists release_token_reservation(uuid, text);
drop function if exists commit_token_reservation(uuid);
drop function if exists reserve_tokens(uuid, integer, text, text, uuid, integer);
drop table if exists token_reservations;
drop type  if exists token_reservation_status;
```
