# Pricing Matrix

Last verified: 2026-04-06

This document maps the app's current video pricing to the actual Replicate billing tiers exposed in the UI and used by `app/api/export/route.ts`.

## Source Of Truth

- App model catalog: `lib/data/plans.ts`
- App pricing and option logic: `lib/video-generation.ts`
- Export route: `app/api/export/route.ts`
- Replicate vendor pricing: the official model pages linked at the bottom of this file

## Token Pricing Rule

The app now derives video token cost from live Replicate vendor pricing using a single anchor:

- `Hailuo Fast`, `768p`, `6s` = `$0.19` = `40 tokens`

Formula:

`token cost = round_to_nearest_5((vendor_price_usd / 0.19) * 40)`

This keeps token pricing proportional to Replicate cost while still giving clean token numbers.

## App-Exposed Video Options

These are the current controls available in the app:

| App model | Options exposed in app | Notes |
| --- | --- | --- |
| Hailuo Fast | `duration`, `resolution` | `1080p` is only available at `6s` |
| Wan 2.1 | `duration` | Fixed `480p` model |
| Hailuo 2.3 | `duration`, `resolution` | `1080p` is only available at `6s` |
| Kling v2.5 Turbo | `duration` | Duration-based pricing |
| Kling v3 | `duration`, `mode`, `generateAudio` | `3s` to `15s`, `standard` or `pro`, audio on/off |
| Veo 3.1 Fast | `duration`, `resolution`, `generateAudio` | `720p` and `1080p`, audio on/off |

## Effective Vendor Pricing

These are the Replicate billing rules the app now exposes:

| App model | Replicate billing |
| --- | --- |
| Hailuo Fast | `768p 6s = $0.19`, `768p 10s = $0.32`, `1080p 6s = $0.33` |
| Wan 2.1 | `$0.09` per second |
| Hailuo 2.3 | `768p 6s = $0.28`, `768p 10s = $0.56`, `1080p 6s = $0.49` |
| Kling v2.5 Turbo | `$0.07` per second |
| Kling v3 | `standard/no-audio = $0.168/s`, `standard/audio = $0.252/s`, `pro/no-audio = $0.224/s`, `pro/audio = $0.336/s` |
| Veo 3.1 Fast | `without-audio = $0.10/s`, `with-audio = $0.15/s` |

## Current App Token Pricing

Representative per-run token costs after the new pricing update:

| App model | App token pricing |
| --- | --- |
| Hailuo Fast | `768p 6s = 40`, `768p 10s = 65`, `1080p 6s = 70` |
| Wan 2.1 | `3s = 55`, `5s = 95`, `8s = 150` |
| Hailuo 2.3 | `768p 6s = 60`, `768p 10s = 120`, `1080p 6s = 105` |
| Kling v2.5 Turbo | `5s = 75`, `10s = 145` |
| Kling v3 | Range: `105` to `1060` depending on duration, mode, and audio |
| Veo 3.1 Fast | Range: `85` to `255` depending on duration and audio. `720p` and `1080p` currently price the same on Replicate |

Examples for the dynamic models:

| Model | Example selection | Vendor cost | Token cost |
| --- | --- | ---: | ---: |
| Kling v3 | `standard`, `5s`, `audio off` | `$0.84` | `175` |
| Kling v3 | `pro`, `5s`, `audio off` | `$1.12` | `235` |
| Kling v3 | `pro`, `10s`, `audio on` | `$3.36` | `705` |
| Veo 3.1 Fast | `4s`, `audio off` | `$0.40` | `85` |
| Veo 3.1 Fast | `6s`, `audio off` | `$0.60` | `125` |
| Veo 3.1 Fast | `8s`, `audio on` | `$1.20` | `255` |

## Current App Revenue Side

### Subscription plans

| Plan | Monthly price | Tokens | Effective PHP per token |
| --- | ---: | ---: | ---: |
| Starter | `PHP 1,099` | 4,250 | `0.2586` |
| Growth | `PHP 2,199` | 9,500 | `0.2315` |
| Pro | `PHP 4,999` | 22,000 | `0.2272` |
| Business | `PHP 10,999` | 60,000 | `0.1833` |

### Top-up packs

| Pack | Price | Tokens | Effective PHP per token |
| --- | ---: | ---: | ---: |
| Spark | `PHP 100` | 200 | `0.5000` |
| Trial | `PHP 249` | 520 | `0.4788` |
| Basic | `PHP 649` | 1,500 | `0.4327` |
| Creator | `PHP 1,499` | 4,000 | `0.3748` |
| Studio | `PHP 3,299` | 10,000 | `0.3299` |

## Quick Margin Check

Formula:

`run revenue in PHP = token cost x effective PHP per token`

Examples using subscription rates:

| Selection | Starter | Growth | Pro | Business |
| --- | ---: | ---: | ---: | ---: |
| Hailuo Fast `768p 6s` `40 tokens` | `PHP 10.34` | `PHP 9.26` | `PHP 9.09` | `PHP 7.33` |
| Hailuo 2.3 `1080p 6s` `105 tokens` | `PHP 27.15` | `PHP 24.31` | `PHP 23.86` | `PHP 19.25` |
| Kling v2.5 Turbo `10s` `145 tokens` | `PHP 37.50` | `PHP 33.57` | `PHP 32.95` | `PHP 26.58` |
| Kling v3 `pro 5s audio off` `235 tokens` | `PHP 60.77` | `PHP 54.41` | `PHP 53.39` | `PHP 43.08` |
| Veo 3.1 Fast `8s audio on` `255 tokens` | `PHP 65.94` | `PHP 59.03` | `PHP 57.94` | `PHP 46.75` |

Examples using top-up pack rates:

| Selection | Spark | Trial | Basic | Creator | Studio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hailuo Fast `768p 6s` `40 tokens` | `PHP 20.00` | `PHP 19.15` | `PHP 17.31` | `PHP 14.99` | `PHP 13.20` |
| Hailuo 2.3 `1080p 6s` `105 tokens` | `PHP 52.50` | `PHP 50.28` | `PHP 45.43` | `PHP 39.35` | `PHP 34.64` |
| Kling v2.5 Turbo `10s` `145 tokens` | `PHP 72.50` | `PHP 69.42` | `PHP 62.74` | `PHP 54.35` | `PHP 47.84` |
| Kling v3 `pro 5s audio off` `235 tokens` | `PHP 117.50` | `PHP 112.51` | `PHP 101.69` | `PHP 88.08` | `PHP 77.53` |
| Veo 3.1 Fast `8s audio on` `255 tokens` | `PHP 127.50` | `PHP 122.09` | `PHP 110.33` | `PHP 95.57` | `PHP 84.12` |

## Pricing Risks To Watch

- Hailuo `1080p` availability is constrained to `6s`, so the UI must keep that pairing valid.
- Kling v3 gets expensive quickly once `pro` and `audio on` are enabled.
- Veo pricing currently changes with audio, not with resolution. If Replicate changes that, `lib/video-generation.ts` must be updated.
- Any customer-facing pricing copy should be re-checked against the current Replicate pages before release.

## Replicate References

- Hailuo Fast: https://replicate.com/minimax/hailuo-2.3-fast
- Wan 2.1: https://replicate.com/wavespeedai/wan-2.1-i2v-480p
- Hailuo 2.3: https://replicate.com/minimax/hailuo-2.3
- Kling v2.5 Turbo Pro: https://replicate.com/kwaivgi/kling-v2.5-turbo-pro
- Kling v3 Video: https://replicate.com/kwaivgi/kling-v3-video
- Veo 3.1 Fast: https://replicate.com/google/veo-3.1-fast
