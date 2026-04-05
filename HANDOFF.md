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
