# Genetrify — Claude Reference

## What This App Does

**Genetrify** is an AI fashion model photography studio. Users upload product images (clothing, accessories), select a model avatar, background, and camera angle from a marketplace of templates, and the app generates a photorealistic image of the model wearing the products. Users can then create a short video from the approved image and share it to TikTok.

**Niche:** AI fashion model photography / virtual lookbook generation (also called virtual try-on).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Supabase (auth + postgres + storage), Gemini API (image generation), Replicate/Kling/Hailuo/Veo (video generation), PayMongo (QRPH payments), Resend (email), Upstash Redis (rate limiting).

---

## File Structure

### Root Config
| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config with security headers (HSTS, CSP, Referrer-Policy) |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `components.json` | Shadcn/ui config (Base Nova style, Lucide icons) |
| `instrumentation.ts` | Validates all env vars at startup via `lib/env.ts` |
| `proxy.ts` | Proxy config for external API calls |

---

### App Directory

#### Root
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout — Poppins, Bebas Neue, Geist Mono fonts, global metadata |
| `app/page.tsx` | Landing page or dashboard redirect if authenticated |

#### Auth — `app/(auth)/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Split layout: branding left, form right |
| `login/page.tsx` | Login form |
| `signup/page.tsx` | Signup form |
| `forgot-password/page.tsx` | Password reset request |
| `reset-password/page.tsx` | Password change form |
| `check-email/page.tsx` | Post-signup email confirmation waiting page |
| `confirmed/page.tsx` | Account confirmation success |
| `app/auth/confirm/route.ts` | Email OTP confirmation callback → sends welcome email |

#### Dashboard — `app/(dashboard)/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Authenticated layout with sidebar, preferences provider, token context |
| `dashboard/page.tsx` | Main studio page — renders `StudioCanvas` |
| `projects/page.tsx` | Projects list |
| `projects/[id]/page.tsx` | Project detail — images and videos gallery |
| `billing/page.tsx` | Subscription status and credit pack purchase |
| `templates/page.tsx` | Marketplace browser (avatars, backgrounds, cameras, movement) |
| `templates/_components/marketplace-client.tsx` | Client-side marketplace component |
| `support/page.tsx` | Support ticket list |
| `support/[id]/page.tsx` | Ticket thread + reply form |
| `storage/page.tsx` | Redirects to /projects |
| `profile/page.tsx` | Redirects to /templates |

#### Admin — `app/admin/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Admin sidebar layout (requires admin role) |
| `page.tsx` | Admin dashboard — stats cards and quick links |
| `users/page.tsx` | User management table with email, plan, token balance |
| `tickets/page.tsx` | All support tickets with status filter |
| `tickets/[id]/page.tsx` | Ticket detail with message thread |
| `templates/page.tsx` | Template CRUD management |
| `templates/new/page.tsx` | Create new template |
| `templates/[id]/page.tsx` | Edit existing template |
| `templates/_components/templates-table.tsx` | Template table with filters and pagination |
| `templates/_components/template-form.tsx` | Create/edit template form (category-specific fields) |

#### Legal Pages
| File | Purpose |
|------|---------|
| `app/cookies/page.tsx` | Cookie policy |
| `app/privacy/page.tsx` | Privacy policy |
| `app/terms/page.tsx` | Terms of service |
| `app/refunds/page.tsx` | Refund policy |

---

### API Routes — `app/api/`

#### Generation & Projects
| Route | Purpose |
|-------|---------|
| `generate/route.ts` | **Main image gen** — Gemini API, deducts tokens, streams NDJSON |
| `projects/route.ts` | GET/POST projects (supports folder filter) |
| `projects/[id]/route.ts` | GET/PUT/DELETE individual project |
| `projects/[id]/duplicate/route.ts` | Duplicate a project |
| `projects/[id]/regenerate/route.ts` | Re-run image generation |
| `folders/route.ts` | Create/list folders |
| `folders/[id]/route.ts` | Update/delete folder |
| `upload/route.ts` | File upload — MIME validation, base64 encoding |
| `export/route.ts` | Export/download video |
| `history/route.ts` | Generation history |

#### User & Preferences
| Route | Purpose |
|-------|---------|
| `preferences/route.ts` | Save/get user template preferences |
| `user-models/route.ts` | List user's custom AI models |
| `user-models/generate/route.ts` | Generate model from face upload |

#### TikTok
| Route | Purpose |
|-------|---------|
| `tiktok/connect/route.ts` | OAuth initiation with PKCE |
| `tiktok/callback/route.ts` | OAuth callback, exchange code for tokens |
| `tiktok/account/route.ts` | Get connected TikTok account info |
| `tiktok/share/route.ts` | Direct video publish to TikTok |
| `tiktok/publish-status/route.ts` | Check publish status |

#### Billing
| Route | Purpose |
|-------|---------|
| `billing/checkout/route.ts` | Create PayMongo QRPH payment |
| `billing/subscribe/route.ts` | Create subscription |
| `billing/portal/route.ts` | Stripe billing portal redirect |
| `billing/status/route.ts` | Check subscription status |
| `billing/balance/route.ts` | Get token balance |
| `billing/webhook/route.ts` | PayMongo webhook handler |

#### Support
| Route | Purpose |
|-------|---------|
| `support/tickets/route.ts` | GET user tickets, POST new ticket |
| `support/tickets/[id]/route.ts` | GET ticket + messages, POST reply |

#### Admin
| Route | Purpose |
|-------|---------|
| `admin/stats/route.ts` | System stats (users, subscriptions, tickets, projects) |
| `admin/users/route.ts` | List all users |
| `admin/tickets/route.ts` | List all tickets |
| `admin/tickets/[id]/route.ts` | Get/update ticket status |
| `admin/template-media/route.ts` | Fetch template media assets |
| `template-media/route.ts` | Serve template images |
| `reviews/route.ts` | Get/post user reviews |

---

### Server Actions — `app/actions/`
| File | Purpose |
|------|---------|
| `auth.ts` | login, signup, logout, forgotPassword, resetPassword |
| `templates.ts` | Template CRUD server actions |

---

### Components

#### UI — `components/ui/`
Shadcn/ui primitives: `button`, `input`, `label`, `badge`, `card`, `separator`, `hover-footer`

#### Auth — `components/auth/`
| File | Purpose |
|------|---------|
| `login-form.tsx` | Email/password login form |
| `signup-form.tsx` | Signup with password confirmation |
| `forgot-password-form.tsx` | Forgot password form |
| `reset-password-form.tsx` | Reset password form |

#### Dashboard — `components/dashboard/`
| File | Purpose |
|------|---------|
| `sidebar.tsx` | Nav sidebar with token balance widget |
| `PageWrapper.tsx` | Consistent page padding/max-width container |
| `StudioCanvas.tsx` | **Main generation UI** — upload products, select avatar/background/camera/movement, generate image, review, create video |
| `GeneratePanel.tsx` | Generate button, video options, generation state controls |
| `ProjectsClient.tsx` | Projects list with folder management |
| `ProjectDetailClient.tsx` | Project detail — generated images and video gallery |
| `BillingPageClient.tsx` | Subscription status and credit pack purchase UI |
| `SupportPageClient.tsx` | Support ticket list and create form |
| `TikTokShareButton.tsx` | Share generated video to TikTok |

#### Landing — `components/landing/`
| File | Purpose |
|------|---------|
| `landing-page.tsx` | Full landing page composition |
| `legal-page.tsx` | Reusable legal page layout |
| `NavbarUserMenu.tsx` | User dropdown in navbar |
| `hooks/useInView.ts` | Intersection observer for scroll animations |
| `sections/NavbarSection.tsx` | Top nav |
| `sections/HeroSection.tsx` | Hero banner with CTA |
| `sections/CarouselSection.tsx` | Feature/use-case image carousel |
| `sections/IntroSection.tsx` | Product introduction |
| `sections/BigStatementSection.tsx` | Value prop highlight |
| `sections/FeaturesSection.tsx` | Features grid |
| `sections/HowItWorksSections.tsx` | Step-by-step guide |
| `sections/PricingSection.tsx` | Pricing tiers and credit packs |
| `sections/ReviewsSection.tsx` | Testimonials carousel |
| `sections/FaqSection.tsx` | FAQ accordion |
| `sections/CtaSection.tsx` | Call-to-action |
| `sections/FooterSection.tsx` | Footer with policy links |

#### Other
| File | Purpose |
|------|---------|
| `components/brand-logo.tsx` | Logo with sizing options |
| `components/studio/StudioCanvas.tsx` | Studio section canvas (mirrors dashboard canvas) |

---

### Lib Directory

#### Database & Auth
| File | Purpose |
|------|---------|
| `lib/dal.ts` | Data Access Layer — `verifySession()` caches auth state |
| `lib/supabase/server.ts` | Supabase server client (uses cookies) |
| `lib/supabase/admin.ts` | Supabase admin client (service role key) |
| `lib/supabase/client.ts` | Supabase browser client |
| `lib/supabase/proxy.ts` | Supabase proxy config |
| `lib/admin/auth.ts` | Verify admin role for protected pages |

#### Data Fetching — `lib/data/`
| File | Purpose |
|------|---------|
| `dashboard.ts` | Billing data, subscription status, support tickets |
| `projects.ts` | Projects, folders, project details, storage summary |
| `marketplace-templates.ts` | Published templates grouped by category |
| `avatar-presets.ts` | Avatar preset configs and customization options |
| `background-presets.ts` | Background room aesthetic presets |
| `plans.ts` | Pricing plans, credit packs, video models, token costs |

#### Billing — `lib/billing/`
| File | Purpose |
|------|---------|
| `tokens.ts` | Get token balance, deduct tokens |
| `payments.ts` | Create billing payment records |
| `paymongo.ts` | PayMongo API client (QRPH, subscriptions) |

#### Context Providers — `lib/context/`
| File | Purpose |
|------|---------|
| `preferences-context.tsx` | Avatar/background/camera/movement template selections |
| `token-context.tsx` | Token balance with real-time updates |

#### Email — `lib/email/`
| File | Purpose |
|------|---------|
| `resend.ts` | Email sending via Resend |
| `templates/base.ts` | Base HTML email structure |
| `templates/welcome.ts` | Welcome email |
| `templates/password-reset.ts` | Password reset email |
| `templates/subscription-activated.ts` | Subscription activation |
| `templates/subscription-cancelled.ts` | Subscription cancellation |
| `templates/payment-failed.ts` | Payment failure notification |
| `templates/topup-confirmed.ts` | Credit top-up confirmation |

#### Types — `lib/types/`
| File | Purpose |
|------|---------|
| `billing.ts` | `Plan`, `Subscription`, `CreditPack`, `TokenBalance` |
| `preferences.ts` | `AvatarConfig`, `BackgroundConfig`, `UserPreferences` |
| `marketplace.ts` | `MarketplaceTemplate`, `TemplateCategory`, `TemplateStatus` |
| `support.ts` | `SupportTicket`, `TicketMessage`, `TicketStatus`, `TicketCategory` |

#### Utilities
| File | Purpose |
|------|---------|
| `lib/preferences.ts` | Build avatar/background configs from templates + custom data |
| `lib/security.ts` | UUID validation, text sanitization, MIME check, CSRF origin verify, safe URL check |
| `lib/env.ts` | Env var validation at startup |
| `lib/rate-limit.ts` | Rate limiter (Upstash/Redis) |
| `lib/db-rate-limit.ts` | Database-backed rate limiting |
| `lib/video-generation.ts` | Token costs, video model options, resolution/duration/mode configs |
| `lib/tiktok.ts` | TikTok OAuth PKCE flow, token management, publish API |
| `lib/logger.ts` | Structured logging (JSON prod, human-readable dev) |
| `lib/utils.ts` | `cn()` — clsx + tailwind-merge |

---

### Public Assets
| Path | Purpose |
|------|---------|
| `public/logo.png` | Genetrify logo |
| `public/tiktok-demo.mp4` | Landing page demo video |
| `public/ffmpeg-core.js` + `.wasm` | Client-side FFmpeg for video processing |
| `public/Homepage Carousel/1–8.png` | Landing page carousel images |
| `public/Introduction Section/1–6.png` | Landing intro section images |

---

## Key Flows

### Image Generation Flow
1. User uploads 1–5 product images → `app/api/upload/route.ts`
2. Selects avatar, background, camera templates (stored in `lib/context/preferences-context.tsx`)
3. Hits generate → `app/api/generate/route.ts`
4. Route builds prompt + sends avatar image + background image + product images to **Gemini API**
5. Streams NDJSON back, saves result to `project_images` table + Supabase storage
6. User reviews → approve triggers video generation via `app/api/export/route.ts` (Replicate)

### Template System
- Categories: `avatar | background | camera | movement | other`
- Each template has: `thumbnail_url`, `preview_url`, `reference_url` (sent to Gemini), `config` (JSONB)
- Admin manages via `app/admin/templates/`
- Users browse via `app/(dashboard)/templates/`
- Selected templates stored in user preferences via `app/api/preferences/route.ts`

### Billing Flow
- Token-based system — image gen and video gen cost tokens
- Credit packs purchased via PayMongo QRPH → webhook at `app/api/billing/webhook/route.ts`
- Token balance tracked in Supabase, exposed via `lib/context/token-context.tsx`

### TikTok Flow
- OAuth PKCE connect → `app/api/tiktok/connect/` + `callback/`
- Share video → `app/api/tiktok/share/route.ts`
- Poll publish status → `app/api/tiktok/publish-status/route.ts`

---

## Conventions
- Server Components by default; `"use client"` only when needed
- Supabase server client uses `lib/supabase/server.ts`; browser uses `lib/supabase/client.ts`
- All mutations validate auth via `lib/dal.ts` `verifySession()`
- Admin routes verify role via `lib/admin/auth.ts`
- Env vars validated at boot via `lib/env.ts` / `instrumentation.ts`
- `cn()` from `lib/utils.ts` for all className merging
