# Product Requirements Document — Affilify AI (V2 – Lean MVP)

## Product Name
Affilify AI *(working title, can change)*

---

## Overview

**Type:** AI-powered affiliate content generator (TikTok-first, visual-only)

**Core Idea:** Turn product images + AI model into short-form TikTok-style videos using generated images and automated camera motion.

---

## Objective

Enable users to generate scroll-stopping affiliate videos in under 2 minutes without filming or editing.

---

## Target Users

- TikTok affiliates
- Dropshippers
- Faceless content creators
- Beginners who don't want to record videos

---

## What This MVP Will NOT Do

Keep this strict to stay fast:

- No talking avatars
- No AI voiceovers
- No script generation
- No captions/music engine
- No TikTok API integration

> This is **visual-only** video generation.

---

## Core User Flow

1. Upload face (or choose AI face)
2. Select avatar settings
3. Upload product images
4. Generate AI model images (3–4 outputs)
5. Select images
6. Convert to video (auto camera motion)
7. Export video

---

## Core Features

### 6.1 Avatar Builder (Simplified)

**Inputs:**
- Face upload (required)
- Gender: Male / Female
- Body type slider: lean / average / bulky (optional)

**Removed for MVP:** Height, weight (too complex, low ROI)

### 6.2 Product Input

- Upload product images (1–5)
- Future: TikTok Shop scraping (NOT in MVP)

### 6.3 Image Generation Engine

**Powered by:** NanoBanana / Google AI Studio (Imagen)

**Process:** Combine face + body + outfit (T-shirt + shorts) + product

**Output:** 3–4 generated images

### 6.4 Image Selection UI

- Select 1 or multiple images
- Preview images in gallery

### 6.5 Video Generator (CORE MVP FEATURE)

**Input:** Selected images

**Process:** Convert images into short video using:
- Zoom in/out
- Pan (left/right)
- Slight motion effects (Ken Burns effect + TikTok-style cuts)

**Output:** 5–10 second vertical video (9:16)

### 6.6 Multi-Variation Output

If user selects multiple images → generate multiple video versions automatically.

Example: 3 images → 3 videos

> This enables content testing — the main differentiator.

### 6.7 Export

- Format: MP4
- Aspect ratio: 9:16
- Download button

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js + TailwindCSS |
| Backend | Next.js API routes / edge functions |
| Hosting | Vercel |
| Database & Storage | Supabase |
| Version Control | GitHub |
| AI Services | Google AI Studio (Imagen / NanoBanana), optional: Replicate |
| Video Processing | FFmpeg (recommended for MVP) |
| Future AI | Runway (post-MVP) |

---

## System Flow (Technical)

1. Frontend (Next.js)
2. Upload assets → Supabase storage
3. Call AI API (NanoBanana / Imagen)
4. Store generated images
5. User selects images
6. Video processing (FFmpeg or API)
7. Return downloadable video

---

## Key Differentiator

Most tools generate 1 polished video.

**Affilify generates multiple raw TikTok-style variations FAST.**

That's what actually makes money.

---

## Risks & Mitigation

| Risk | Solution |
|---|---|
| "Too AI-looking" | Slight imperfections, realistic lighting, casual poses |
| Low engagement | Focus on product visibility, human presence, natural framing |
| Repetitive content | Randomize camera motion, image order |

---

## Success Metrics

- Time to generate video (target: < 2 mins)
- Videos per user
- Repeat usage
- Export rate

---

## MVP Scope (STRICT — Ship Only This)

- [x] Avatar + product → image
- [x] Generate 3–4 images
- [x] Select images
- [x] Convert to video
- [x] Download

**That's it.**

---

## Future Roadmap (DO NOT BUILD YET)

- AI voiceovers
- Hook generator
- Captions
- TikTok auto-posting
- Analytics
- Batch generation *(BIG future feature)*

---

## Strategic Summary

> The first version is NOT about AI power — it's about **speed + volume**.
>
> If users can generate 10 videos in 10 minutes and test products quickly → we win.
