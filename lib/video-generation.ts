import type { VideoModel } from '@/lib/types/billing'

export type VideoResolution = '480p' | '720p' | '768p' | '1080p'
export type VideoMode = 'standard' | 'pro'
export type VideoOptionKey = 'duration' | 'resolution' | 'mode' | 'generateAudio'

export interface VideoGenerationSettings {
  duration: number
  resolution?: VideoResolution
  mode?: VideoMode
  generateAudio?: boolean
}

export interface VideoGenerationProfile extends VideoGenerationSettings {
  tokenCost: number
  vendorPriceUsd: number
}

export interface VideoOptionChoice<T extends string | number | boolean> {
  value: T
  label: string
}

const TOKEN_PRICE_BASELINE_USD = 0.19
const TOKEN_PRICE_BASELINE_TOKENS = 40
const TOKEN_GRANULARITY = 5
const PROFILE_KEYS: VideoOptionKey[] = ['duration', 'resolution', 'mode', 'generateAudio']

const RESOLUTION_ORDER: VideoResolution[] = ['480p', '720p', '768p', '1080p']
const MODE_ORDER: VideoMode[] = ['standard', 'pro']
const AUDIO_ORDER = [false, true] as const

function roundToNearestTokenStep(tokenCost: number): number {
  const stepped = Math.round(tokenCost / TOKEN_GRANULARITY) * TOKEN_GRANULARITY
  return Math.max(TOKEN_GRANULARITY, stepped)
}

function vendorUsdToTokens(vendorPriceUsd: number): number {
  const rawTokenCost = (vendorPriceUsd / TOKEN_PRICE_BASELINE_USD) * TOKEN_PRICE_BASELINE_TOKENS
  return roundToNearestTokenStep(rawTokenCost)
}

function createProfile(settings: VideoGenerationSettings, vendorPriceUsd: number): VideoGenerationProfile {
  return {
    ...settings,
    vendorPriceUsd,
    tokenCost: vendorUsdToTokens(vendorPriceUsd),
  }
}

function getProfilesForModelId(modelId: string): VideoGenerationProfile[] {
  switch (modelId) {
    case 'seedance-2-fast':
      // BytePlus direct: ~$0.074/s @ 720p. Token cost lifted to 120 to keep
      // ~30% gross margin after PayMongo fee + ~5% failure refund rate.
      return [4, 6, 8].map((duration) =>
        createProfile({ duration, resolution: '720p' }, duration * 0.074),
      )
    case 'seedance-2-pro':
      // BytePlus direct: ~$0.14/s @ 720p. Token cost lifted to 220.
      return [4, 6, 8, 10].map((duration) =>
        createProfile({ duration, resolution: '720p' }, duration * 0.14),
      )
    case 'kling-turbo':
      return [5, 10].map((duration) =>
        createProfile({ duration }, duration * 0.07),
      )
    case 'kling-v3': {
      const profiles: VideoGenerationProfile[] = []
      const unitPrices: Record<VideoMode, Record<'withAudio' | 'withoutAudio', number>> = {
        standard: { withoutAudio: 0.168, withAudio: 0.252 },
        pro: { withoutAudio: 0.224, withAudio: 0.336 },
      }

      for (const mode of MODE_ORDER) {
        for (const generateAudio of AUDIO_ORDER) {
          const priceKey = generateAudio ? 'withAudio' : 'withoutAudio'
          for (let duration = 3; duration <= 15; duration += 1) {
            profiles.push(
              createProfile(
                { duration, mode, generateAudio },
                duration * unitPrices[mode][priceKey],
              ),
            )
          }
        }
      }

      return profiles
    }
    case 'veo-fast': {
      const profiles: VideoGenerationProfile[] = []
      const durations = [4, 6, 8]
      const resolutions: VideoResolution[] = ['720p', '1080p']

      for (const resolution of resolutions) {
        for (const generateAudio of AUDIO_ORDER) {
          const unitPriceUsd = generateAudio ? 0.15 : 0.10
          for (const duration of durations) {
            profiles.push(
              createProfile({ duration, resolution, generateAudio }, duration * unitPriceUsd),
            )
          }
        }
      }

      return profiles
    }
    default:
      return [
        createProfile({ duration: 5 }, 0.19),
      ]
  }
}

function sortChoiceValues<T extends string | number | boolean>(key: VideoOptionKey, values: T[]): T[] {
  const nextValues = [...values]

  if (key === 'duration') {
    return nextValues.sort((left, right) => Number(left) - Number(right))
  }

  if (key === 'resolution') {
    return nextValues.sort(
      (left, right) =>
        RESOLUTION_ORDER.indexOf(left as VideoResolution) - RESOLUTION_ORDER.indexOf(right as VideoResolution),
    )
  }

  if (key === 'mode') {
    return nextValues.sort(
      (left, right) => MODE_ORDER.indexOf(left as VideoMode) - MODE_ORDER.indexOf(right as VideoMode),
    )
  }

  if (key === 'generateAudio') {
    return nextValues.sort(
      (left, right) => AUDIO_ORDER.indexOf(left as boolean) - AUDIO_ORDER.indexOf(right as boolean),
    )
  }

  return nextValues
}

function formatChoiceLabel(key: VideoOptionKey, value: string | number | boolean): string {
  if (key === 'duration') return `${value}s`
  if (key === 'mode') return value === 'pro' ? 'Pro' : 'Standard'
  if (key === 'generateAudio') return value ? 'Audio On' : 'Audio Off'
  return String(value).toUpperCase()
}

function profileMatches(
  profile: VideoGenerationProfile,
  settings: VideoGenerationSettings,
  ignoredKey?: VideoOptionKey,
): boolean {
  for (const key of PROFILE_KEYS) {
    if (key === ignoredKey) continue

    const value = settings[key]
    if (value === undefined) continue
    if (profile[key] !== value) return false
  }

  return true
}

export function getVideoGenerationProfiles(model: VideoModel): VideoGenerationProfile[] {
  return getProfilesForModelId(model.id)
}

export function getDefaultVideoGenerationSettings(model: VideoModel): VideoGenerationSettings {
  switch (model.id) {
    case 'seedance-2-fast':
      return { duration: 6, resolution: '720p' }
    case 'seedance-2-pro':
      return { duration: 6, resolution: '720p' }
    case 'kling-turbo':
      return { duration: 5 }
    case 'kling-v3':
      return { duration: 5, mode: 'pro', generateAudio: false }
    case 'veo-fast':
      return { duration: 6, resolution: '1080p', generateAudio: false }
    default:
      return { duration: model.defaultDuration }
  }
}

export function getVideoOptionChoices(
  model: VideoModel,
  settings: VideoGenerationSettings,
  key: VideoOptionKey,
): VideoOptionChoice<string | number | boolean>[] {
  const profiles = getVideoGenerationProfiles(model)
  const choices = new Set<string | number | boolean>()

  for (const profile of profiles) {
    const profileValue = profile[key]
    if (profileValue === undefined) continue
    if (profileMatches(profile, settings, key)) choices.add(profileValue)
  }

  return sortChoiceValues(key, Array.from(choices)).map((value) => ({
    value,
    label: formatChoiceLabel(key, value),
  }))
}

export function getAllVideoOptionChoices(
  model: VideoModel,
  key: VideoOptionKey,
): VideoOptionChoice<string | number | boolean>[] {
  const profiles = getVideoGenerationProfiles(model)
  const values = new Set<string | number | boolean>()

  for (const profile of profiles) {
    const profileValue = profile[key]
    if (profileValue !== undefined) values.add(profileValue)
  }

  return sortChoiceValues(key, Array.from(values)).map((value) => ({
    value,
    label: formatChoiceLabel(key, value),
  }))
}

export function hasMultipleVideoOptionChoices(model: VideoModel, key: VideoOptionKey): boolean {
  return getAllVideoOptionChoices(model, key).length > 1
}

export function updateVideoGenerationSettings<K extends VideoOptionKey>(
  model: VideoModel,
  currentSettings: VideoGenerationSettings,
  key: K,
  value: VideoGenerationSettings[K],
): VideoGenerationSettings {
  const nextSettings: VideoGenerationSettings = {
    ...getDefaultVideoGenerationSettings(model),
    ...currentSettings,
    [key]: value,
  }

  for (const repairKey of PROFILE_KEYS) {
    if (repairKey === key) continue

    const choices = getVideoOptionChoices(model, nextSettings, repairKey)
    if (choices.length === 0) continue

    const currentValue = nextSettings[repairKey]
    if (!choices.some((choice) => choice.value === currentValue)) {
      nextSettings[repairKey] = choices[0]!.value as never
    }
  }

  return nextSettings
}

export function normalizeVideoGenerationSettings(
  model: VideoModel,
  partialSettings: Partial<VideoGenerationSettings>,
): VideoGenerationSettings {
  let nextSettings: VideoGenerationSettings = {
    ...getDefaultVideoGenerationSettings(model),
    ...partialSettings,
  }

  for (const key of PROFILE_KEYS) {
    const currentValue = nextSettings[key]
    if (currentValue === undefined) continue
    nextSettings = updateVideoGenerationSettings(model, nextSettings, key, currentValue as never)
  }

  return nextSettings
}

export function getVideoGenerationProfile(
  model: VideoModel,
  settings: VideoGenerationSettings,
): VideoGenerationProfile {
  const normalizedSettings = normalizeVideoGenerationSettings(model, settings)
  const profile = getVideoGenerationProfiles(model).find(
    (candidate) => PROFILE_KEYS.every((key) => candidate[key] === normalizedSettings[key]),
  )

  if (!profile) {
    throw new Error(`Unsupported video generation settings for model ${model.id}`)
  }

  return profile
}

export function getVideoGenerationTokenCost(model: VideoModel, settings: VideoGenerationSettings): number {
  return getVideoGenerationProfile(model, settings).tokenCost
}

export function getMinimumVideoGenerationTokenCost(model: VideoModel): number {
  return Math.min(...getVideoGenerationProfiles(model).map((profile) => profile.tokenCost))
}
