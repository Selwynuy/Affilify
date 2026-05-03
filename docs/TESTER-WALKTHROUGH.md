# Genetrify — Tester Walkthrough

**For:** Beta testers helping validate the AI fashion content pipeline.
**Time needed:** 30–45 minutes for a full pass (waitlist → invite → 10–20 image generations → 1–3 video tests).
**What you'll get:** Free early access + first crack at the new tool. In exchange, you give honest feedback on quality, friction, and what would make you actually use this.

---

## What is Genetrify, in one sentence

You upload a face + product photos. Genetrify generates a custom AI model wearing your products, then turns it into a 9:16 video ready for TikTok or Reels.

---

## Phase 0 — Before you start

### What you need

- **A laptop** (the studio is built mobile-responsive but iteration is faster on desktop).
- **A working email** you can check now.
- **3 product images** from TikTok Shop or any e-commerce listing — pick something you'd actually want to sell:
  - 1 top (t-shirt, polo, button-down, hoodie)
  - 1 bottom (jeans, joggers, cargo pants, shorts)
  - 1 pair of shoes (sneakers, loafers — optional but recommended)
- **Around 30 minutes of uninterrupted time** for the iteration loop.

### How to grab product images from TikTok Shop

1. Open TikTok on your phone or web (https://shop.tiktok.com).
2. Search "men oversized tee" or "cargo pants" or whatever fits the niche you want to test.
3. Tap a product → tap the main image → screenshot it OR right-click "Save image as" on web.
4. Try to pick photos with **clean white or plain backgrounds** — the AI handles them best.
5. Save the 3 images somewhere easy to find (Desktop, Downloads).

> **Tip:** AliExpress, Shein, Lazada also work. The product image quality matters more than the source.

---

## Phase 1 — Join the waitlist

1. Go to **https://genetrify.com**.
2. You should see a hero with a "Now in early access · join the waitlist" pill.
3. Type your email into the form, click **Join waitlist**.
4. You should see a green "You're in" confirmation in the same spot.
5. **Check your inbox** for an email titled *"You're on the Genetrify waitlist 🎉"*.
   - Subject confirms you're on the list.
   - Bullet list of what you get when launched.
   - "See how it works" button.

### What to test in this phase

- [ ] Did the form submit without errors?
- [ ] Did the email arrive within ~30 seconds?
- [ ] Did the email land in **Inbox** or **Spam**? (If spam, mark "Not spam" and tell us.)
- [ ] Did the email render correctly on your device (desktop + phone if possible)?

### What to send us as feedback

- Screenshot of the email if it looks broken.
- Note if the form error message wasn't clear when you tried an invalid email.

---

## Phase 2 — Get invited (we trigger this on our end)

You can't sign up publicly yet — Genetrify is invite-only during the beta. After you join the waitlist, **message us on the channel we set up** (DM, Discord, group chat) and we'll send your invite within a few minutes.

When the invite is ready:

1. Check your inbox for *"You're invited to Genetrify — claim your spot"*.
2. Click the **"Claim my spot"** button in the email.
3. You'll land on `genetrify.com/invite/...` with your email already filled in.

### What to test

- [ ] Did the invite email arrive within a few minutes of us triggering it?
- [ ] Is the email address pre-filled and locked on the invite page?
- [ ] Does the page look clean on your device?

---

## Phase 3 — Create your account

On the invite page:

1. **Set a password** (8+ characters).
2. **Re-enter** to confirm.
3. Click **"Claim my spot"**.
4. You'll be redirected to the dashboard at `/dashboard`.
5. Check your inbox for a welcome email.

You start with **300 free tokens** — enough for ~30 image generations or a few video tests. Don't spend them all in one go; we want you to iterate carefully.

### What to test

- [ ] Did the password form accept a valid password?
- [ ] Did invalid attempts (e.g. mismatched confirm) show a clear error?
- [ ] After signup, did you land somewhere that made sense (dashboard or studio)?

---

## Phase 4 — The studio (this is the main test)

Go to **https://genetrify.com/studio**.

You should see a 4-column layout:

```
┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│  Products   │  │   Style     │  │    Prompt    │  │   Result    │
│             │→ │             │→ │              │→ │             │
│  Top        │  │  Model      │  │  [textarea]  │  │  [output]   │
│  Bottom     │  │  Scene      │  │              │  │             │
│  Shoes      │  │  Shot       │  │  [Generate]  │  │             │
└─────────────┘  └─────────────┘  └──────────────┘  └─────────────┘
```

### Step 4.1 — Pick your style (Model + Scene + Shot)

Before generating anything, click each tile in the **Style column** to set up the look:

- **Model** — Pick the avatar that best matches your target audience. Browse "My Faces" or pick a preset.
- **Scene** — Pick a background that fits the product (e.g. "Noir Studio" for streetwear, "Boho Corner" for casual).
- **Shot** — Pick how the camera frames the model (full body, mid-torso, close-up, etc.).

> **Why this matters:** these three choices anchor the entire generation. If the Model doesn't suit your product, even a perfect prompt won't fix it. Spend 1–2 minutes here.

### Step 4.2 — Upload your products

In the **Products column**, click each slot:

1. **Top** (required) → upload your shirt photo.
2. **Bottom** (required) → upload your pants photo.
3. **Shoes** (optional) → upload sneakers if you have them.

Each slot turns purple when filled. The "Generate" button stays grey until both required slots are filled.

### Step 4.3 — Tweak the prompt

The default prompt should already say something like *"editorial fashion shot, soft daylight, full body composition"*.

For your first generation, **don't change it**. We want to see if the defaults work. After your first result, you'll iterate.

### Step 4.4 — Generate your first image

1. Click **GENERATE**.
2. The Result panel will show "UPLOADING" then "GENERATING" — usually 10–25 seconds total.
3. Your first image appears.

> **Cost:** ~8 tokens per image generation. With 300 free tokens, you can run ~37 generations.

---

## Phase 5 — The iteration loop (this is the actual test)

This is the most important part. **The whole point of testing Genetrify is to find out: how many tries does it take to get a 9/10 image?**

### Run 10–20 image-only variants

Iterate on the **prompt only** for now. Don't change Model/Scene/Shot between runs (that's a different experiment). Try variants like:

| # | Prompt variation to try |
|---|--------------------------|
| 1 | *editorial fashion shot, soft daylight, full body composition* (default) |
| 2 | *editorial fashion shot, golden hour lighting, three-quarter pose* |
| 3 | *studio fashion photography, hard rim light, hands in pockets* |
| 4 | *streetwear lookbook, overcast diffused light, walking pose* |
| 5 | *high-fashion magazine shot, dramatic shadows, leaning against wall* |
| 6 | *casual outdoor catalog shot, natural daylight, candid stride* |
| 7 | *minimalist white studio, soft strobe, hand on hip* |
| 8 | *cinematic 35mm film aesthetic, warm tones, walking forward* |
| 9 | *Pinterest aesthetic, golden hour bokeh, smiling at camera* |
| 10 | *e-commerce product shot, even lighting, neutral pose, clear focus on outfit* |

**For each generation, take a screenshot and rate it 1–10.** Track:

- Does the model's body match what you'd want for your audience?
- Are the products clearly visible and accurately rendered?
- Does the lighting look professional?
- Would you actually post this?

> **Pro tip:** After 5–10 runs, you'll start to see which **prompt elements** consistently work. Lock those in. That's your "house style" template.

### What to test

- [ ] How many runs until you got a result you'd rate 8/10 or higher?
- [ ] Which prompts gave the best results? (Save the winners.)
- [ ] Were there any "broken" outputs? (Wrong outfit, distorted face, missing products, weird artifacts.)
- [ ] Did anything take longer than 30 seconds?
- [ ] Did the token counter update correctly after each run?

---

## Phase 6 — Pick your top 1–3 images

From your 10–20 generations, **shortlist your top 3**. These are the ones you'd actually want to post.

If you only got one strong result, that's fine — quality > quantity.

---

## Phase 7 — Generate video from your best image

This is the expensive part. **Each video costs 40–75 tokens** depending on the model. We want you to test 1–3 videos max.

For each shortlisted image:

1. Below the Result panel, click **"Animate to video"**.
2. A new column appears with:
   - **Motion Style** picker — click to choose how the model moves (walk-by, turn reveal, push-in, etc.).
   - **Video model** dropdown — start with the cheapest (Hailuo Fast, 40 tokens). You can try the pricier ones later if you have budget.
3. Click **Generate video**.
4. **Wait 1–5 minutes.** The video model is much slower than the image model. Don't refresh the page.
5. When ready, the video plays inline. You can download it.

### What to test

- [ ] How long did the video actually take? (Tell us if it took >5 minutes.)
- [ ] Did the model's motion match what the Motion Style preview promised?
- [ ] Was the product still clearly visible in the video?
- [ ] Was the face still consistent with the source image?
- [ ] Would you post this on TikTok/Reels? Why or why not?

---

## Phase 8 — Honest feedback (most valuable part)

After your full session, please share:

### Quality
- **Best image you generated** — paste the screenshot.
- **Worst image you generated** — paste the screenshot. What went wrong?
- **Best video you generated** — share the file or describe it.
- **Would you actually post any of this on your real TikTok/IG?** Yes / No / Maybe — and why.

### UX friction
- **What was confusing?** Anything you had to think twice about counts.
- **What was too slow?** Be specific (signup, upload, generation, video?).
- **What did you wish you could do but couldn't?**

### Pricing question
- Genetrify is launching at **₱99 for 200 tokens** (Spark pack) or **₱1,099/month** for the Starter plan (4,000 tokens/month).
- **Would you pay ₱99 to get this many tokens?** Yes / No.
- **Would you pay ₱1,099/month for unlimited daily generations?** Yes / No.
- **What's the price you'd actually pay** for the experience you had today? (Not what you think we should charge — what *you* would pay.)

### Comparison
- Have you tried ChatGPT image gen, Midjourney, or other AI tools for product content?
- How does Genetrify compare?
- What's it missing that those tools have?

### Recommendation
- On a scale of 1–10, how likely are you to recommend Genetrify to a friend who runs an online store?
- What would make that score a 10?

---

## What we'll do with your feedback

- Every screenshot gets reviewed within 48 hours.
- Bug reports get fixed in the next deploy.
- Pricing feedback shapes our launch tier structure.
- The first 10 testers who complete this walkthrough get **early-access perks** when we open public signups (TBD — likely bonus tokens or free month).

---

## Troubleshooting

| Problem | Try this |
|---------|----------|
| Waitlist email didn't arrive | Check spam. Wait 5 min. Tell us your email and we'll re-send. |
| Invite link says "Invite expired" | Tell us — we'll re-issue. Invites expire after 14 days. |
| Generate button stays grey | Make sure both Top + Bottom slots are filled. |
| Image generation fails with "Insufficient tokens" | You ran out. Tell us — we'll top up your test account. |
| Video generation hangs past 5 minutes | Refresh the page once. If still stuck, message us. |
| Studio page is blank or won't load | Hard refresh (Ctrl+Shift+R). Tell us what browser. |

---

## How to share this doc

If you're reading this as a Markdown file:

- **VS Code users:** install the "Markdown PDF" extension → right-click the file → "Markdown PDF: Export (pdf)".
- **Google Docs:** copy-paste the markdown into a new doc → File → Download → PDF.
- **Online tool:** paste into https://md-to-pdf.fly.dev for a quick conversion.

---

**Questions while testing?** Message the channel we set up. We're online during your test session.

**Done with the walkthrough?** Send your feedback in the same channel. Thank you for helping shape Genetrify 🎉
