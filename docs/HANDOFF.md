# Handoff

## Current state

Two areas changed recently and are now in a better state:

### TikTok sharing

- Generated videos can now be posted to TikTok through the Content Posting API.
- OAuth connect/callback/account/share/status routes exist under `app/api/tiktok/`.
- TikTok tokens are stored in `tiktok_accounts`.
- Share actions are exposed from generated-video results and the Storage page.

### Studio canvas

- Canvas session persistence is active through IndexedDB in `components/studio/StudioCanvas.tsx`.
- Persisted state includes cards, connections, selected ids, prompt, zoom, and pan.
- Product cards restore with regenerated blob URLs.
- Wheel zoom is implemented with `Ctrl`/`Cmd` + wheel.
- A small helper hint now explains selection/zoom behavior.
- Generated cards now retain `projectId` and generated image ids so the side-panel "Create Video" action is wired to the real `/api/export` flow.
- Created videos are shown back inside the video side panel and are persisted on the generated card.
- Product blob URLs are now revoked on card removal, user switch, canvas clear, and unmount.

## Files touched in this pass

- `components/studio/StudioCanvas.tsx`
- `app/api/upload/route.ts`
- `HANDOFF.md`

## Verification done

- `npx tsc --noEmit`
  - passes

- `npm run lint -- components/studio/StudioCanvas.tsx app/api/upload/route.ts`
  - passes with existing `next/no-img-element` warnings in `StudioCanvas.tsx`

## Remaining follow-up items

1. TikTok rollout still needs real external setup:
   - apply `supabase/migrations/20260404_tiktok_accounts.sql`
   - set `TIKTOK_CLIENT_KEY`
   - set `TIKTOK_CLIENT_SECRET`
   - configure `${NEXT_PUBLIC_APP_URL}/api/tiktok/callback` in the TikTok app
   - verify `video.publish` / Direct Post approval on the TikTok app

2. Studio canvas still has some cleanup potential:
   - file comments/section dividers still contain mojibake from earlier edits
   - `StudioCanvas.tsx` still uses several raw `<img>` tags, which is why lint warns
   - the video side-panel flow should still be manually tested end-to-end against real token balances and real generated images
   - canvas persistence should still be manually tested across refresh, navigation away, and account switches

## Practical production read

The studio canvas is materially closer to production now than before this pass:

- typecheck is clean
- the "Create Video" action is no longer a stub
- object URL cleanup is no longer obviously leaky
- zoom/select affordances are clearer

What still blocks calling it fully production-ready is mostly verification and cleanup work, not a known hard functional bug.

## 2026-04-09 Admin/templates/profitability pass

### Current state

This pass focused on the admin surface, template editing complexity, and profitability visibility.

- Admin navigation now has active-route feedback and a usable mobile nav via `app/admin/_components/admin-nav.tsx` and `app/admin/layout.tsx`.
- Admin overview, users, tickets, and ticket detail gained clearer loading/error handling and more operator feedback.
- Users and tickets list pages now support server-driven search and pagination/filtering instead of relying on full client-side datasets.
- Ticket admin APIs no longer depend on a missing Supabase relationship from `support_tickets.user_id`; they resolve user emails explicitly.
- Template admin editing was simplified around a single canonical image instead of separate thumbnail/preview/reference inputs.
- Camera templates no longer carry a redundant extra prompt fragment field; camera angle prompt remains the operative field.
- Runtime template consumers now resolve display/generation media through `lib/marketplace-template-media.ts`, which keeps older rows compatible.
- Admin analytics now includes an estimated operational profitability view: estimated token value, tracked vendor spend, estimated gross profit, and Google vs Replicate spend split.
- Successful Google image/model generations and Replicate video generations now write per-job vendor cost snapshots to `vendor_cost_events`.

### Files touched in this pass

- `app/admin/_components/admin-nav.tsx`
- `app/admin/layout.tsx`
- `app/admin/templates/_components/template-form.tsx`
- `app/admin/templates/_components/templates-table.tsx`
- `app/admin/templates/page.tsx`
- `app/admin/tickets/[id]/page.tsx`
- `app/admin/tickets/page.tsx`
- `app/admin/users/page.tsx`
- `app/api/admin/analytics/route.ts`
- `app/api/admin/template-media/route.ts`
- `app/api/admin/tickets/[id]/route.ts`
- `app/api/admin/tickets/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/export/route.ts`
- `app/api/generate/route.ts`
- `app/api/upload/route.ts`
- `app/api/user-models/generate/route.ts`
- `app/actions/templates.ts`
- `app/(dashboard)/templates/_components/marketplace-client.tsx`
- `components/studio/StudioCanvas.tsx`
- `components/ui/use-toast.ts`
- `lib/analytics/profitability.ts`
- `lib/marketplace-template-media.ts`
- `lib/preferences.ts`
- `lib/types/marketplace.ts`
- `supabase/migrations/20260409_vendor_cost_events.sql`

### Verification done

- `npx tsc --noEmit`
  - passes

- Previously during the template simplification pass:
  - `npx vitest run app/actions/templates.test.ts app/api/upload/route.test.ts app/api/user-models/generate/route.test.ts`
  - passes

### Required follow-up before production use

1. Apply the new migration:
   - `supabase/migrations/20260409_vendor_cost_events.sql`

2. Set Google vendor pricing env vars if you want complete vendor-spend accounting:
   - `GOOGLE_IMAGE_GEN_VENDOR_COST_USD`
   - `GOOGLE_MODEL_GEN_VENDOR_COST_USD`

3. Optionally tune the internal token-value estimate used by analytics:
   - `ANALYTICS_ESTIMATED_TOKEN_VALUE_USD`
   - defaults to `0.00475`

### Practical read

The admin surface is materially better than before this pass:

- templates are less over-configured for operators
- admin list/detail pages fail more transparently
- tickets/users are more scalable to operate
- profitability now has a concrete first-pass data model instead of pure guesswork

The main remaining gap is accounting rigor, not app wiring:

- Replicate video spend is now captured from modeled prices
- Google image/model spend still depends on the configured env snapshot values
- estimated token value is an internal allocation metric, not recognized revenue
