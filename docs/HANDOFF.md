# Handoff

## 2026-04-11 Video export / template taxonomy pass

### Current state

This pass focused on two areas:

- video export reliability for Replicate on Vercel Hobby
- reducing template/UX confusion by separating still-image composition from video animation behavior

Video export state now:

- `/api/export` is confirmed reaching Replicate successfully.
- A real test submitted a prediction and got back to the archive phase.
- The observed failure was not Replicate; it was Supabase Storage missing the `videos` bucket.
- Token refund on video failure worked correctly.
- `app/api/export/route.ts` now uses `maxDuration = 300`, which is valid for Vercel Hobby deployments.

Template/UX state now:

- Runtime and admin naming were moved toward:
  - `shot_type` = still-image framing/composition at image-generation time
  - `motion_style` = how the final generated image animates at video time
- A Supabase migration was added to rename marketplace template categories from `camera` / `movement` to `shot_type` / `motion_style`.
- New `user_preferences` columns were added in that migration:
  - `shot_type_template_id`
  - `motion_style_template_id`
- The app was updated to read/write those new preference keys.
- A backward-compatibility normalization layer was added in `lib/data/marketplace-templates.ts` so the app will not crash if the DB still contains old `camera` / `movement` category values before or during migration rollout.

Prompting state now:

- Video export prompting no longer depends on avatar gender or background room labels.
- Export prompting is now grounded in the final generated image and the selected motion template.
- The prompt explicitly tells Replicate to preserve:
  - exact model identity and styling
  - existing products
  - existing composition/scene
- The prompt explicitly forbids:
  - extra people
  - extra products
  - extra props/background elements
  - products being added behind/beside/on the model

### Files touched in this pass

- `app/api/export/route.ts`
- `app/api/generate/route.ts`
- `app/api/generate/route.test.ts`
- `app/api/preferences/route.ts`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/templates/page.tsx`
- `app/(dashboard)/templates/_components/marketplace-client.tsx`
- `app/admin/templates/page.tsx`
- `app/admin/templates/_components/template-form.tsx`
- `app/admin/templates/_components/templates-table.tsx`
- `app/actions/templates.ts`
- `components/dashboard/GeneratePanel.tsx`
- `components/studio/StudioCanvas.tsx`
- `lib/context/preferences-context.tsx`
- `lib/data/marketplace-templates.ts`
- `lib/types/marketplace.ts`
- `lib/types/preferences.ts`
- `lib/video-prompt.ts`
- `supabase/migrations/20260411_shot_type_motion_style_templates.sql`

### Verification done

- `npm run verify:replicate-versions`
  - passed
  - pinned versions matched Replicate `latest_version` for the currently active video models

- `npm run build`
  - passed after lowering `/api/export` `maxDuration` from `660` to `300` for Vercel Hobby

- Real export test
  - Replicate prediction submission succeeded
  - polling advanced far enough to reach archive/upload
  - failure was `Bucket not found` for Supabase Storage bucket `videos`
  - token refund path executed successfully

### Infra/setup notes

1. Supabase Storage must contain a bucket named `videos`.
   - Current code uploads finished Replicate outputs there and then calls `getPublicUrl(...)`.
   - For the current app behavior, this bucket should be public.

2. The new migration was manually corrected during rollout.
   - The initial migration used `COALESCE(uuid, text)` and failed in SQL Editor.
   - The working SQL used explicit UUID casts / safe conversion for old preference columns.
   - If the repo migration file is used later in another environment, re-check that SQL before applying.

3. Runtime compatibility was added intentionally.
   - Even if DB rows still use old category names (`camera`, `movement`), the app now normalizes them to `shot_type` / `motion_style` on read.

### Product/UX decision reached

The previous model was confusing because:

- image generation had a camera/angle control
- video generation had movement templates
- some movement templates were actually camera-direction templates
- this caused conflicts between established still-image framing and video-stage motion instructions

The intended model going forward is:

- `Shot Type`
  - image-generation stage
  - controls framing/composition of the generated still image
- `Motion Style`
  - video-generation stage
  - controls how the final generated image animates
  - should not behave like a second framing control

This means:

- old camera-heavy “movement” templates likely need review/reclassification
- anything that mainly defines framing should become `shot_type`
- `motion_style` templates should mostly describe in-frame animation, subject motion, editorial energy, and only subtle camera behavior

### Remaining follow-up items

1. Create the Supabase Storage bucket:
   - name: `videos`
   - public bucket: enabled

2. Review the migration file in-repo:
   - `supabase/migrations/20260411_shot_type_motion_style_templates.sql`
   - update it so the preference-copy SQL uses explicit UUID-safe conversion, matching what was run manually

3. Audit current templates in Supabase:
   - identify which old `movement` templates are really framing/shot templates
   - move or rewrite those into `shot_type`
   - leave only true animation behaviors in `motion_style`

4. Content pass still needed:
   - rewrite `motion_style` template prompts so they do not conflict with the generated image framing
   - avoid strong reframing terms like reveal/pan/snap/settle unless deliberately supported

5. Naming cleanup is still incomplete in some component internals:
   - several variables still use legacy local names like `cameraTemplates` / `movementTemplates`
   - runtime behavior is okay, but code readability is not fully cleaned up

6. Push status:
   - one local commit exists for the Hobby timeout fix:
     - `894b91d` `Lower export timeout for Vercel Hobby`
   - push failed in this environment because Git SSH auth is not configured (`Permission denied (publickey)`)

### Practical next step

When work resumes, do this in order:

1. Confirm the `videos` bucket exists and rerun one real export.
2. Review current `motion_style` template content in Supabase.
3. Split/rewrite templates so:
   - `shot_type` owns still-image composition
   - `motion_style` owns animation only
4. If needed, do a second prompt-builder pass after template cleanup.

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
