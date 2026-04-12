'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin }       from '@/lib/admin/auth'
import type {
  TemplateCategory,
  TemplateConfig,
  TemplateFormState,
  TemplateStatus,
} from '@/lib/types/marketplace'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCommonFields(formData: FormData) {
  const imageUrl = (formData.get('image_url') as string)?.trim() || null

  return {
    title:         (formData.get('title')         as string)?.trim() ?? '',
    description:   (formData.get('description')   as string)?.trim() || null,
    category:      (formData.get('category')       as TemplateCategory),
    thumbnail_url: imageUrl,
    preview_url:   null,
    reference_url: imageUrl,
    badge:         (formData.get('badge')          as string)?.trim() || null,
    sort_order:    parseInt((formData.get('sort_order') as string) ?? '0', 10) || 0,
  }
}

/**
 * Builds a typed TemplateConfig from form data.
 * Reads well-known fields per category plus any config.* prefixed extras,
 * so new fields can be added to the form without touching this function.
 */
function buildConfig(formData: FormData, category: TemplateCategory): TemplateConfig {
  const config: TemplateConfig = {}

  switch (category) {
    case 'shot_type':
      config.cameraAnglePrompt = (formData.get('config.cameraAnglePrompt') as string) ?? ''
      break
    case 'motion_style':
      config.promptFragment = (formData.get('config.promptFragment') as string) ?? ''
      break
    case 'video_flow': {
      config.flowSummary = (formData.get('config.flowSummary') as string) ?? ''
      config.defaultStepId = (formData.get('config.defaultStepId') as string) ?? ''
      const stepsJson = (formData.get('config.stepsJson') as string) ?? '[]'
      try {
        const parsed = JSON.parse(stepsJson)
        if (!Array.isArray(parsed)) {
          throw new Error('Video flow steps must be a JSON array')
        }
        config.steps = parsed
      } catch {
        throw new Error('Video flow steps JSON must be a valid array')
      }
      break
    }
    case 'avatar':
      config.gender = (formData.get('config.gender') as string) ?? ''
      config.style  = (formData.get('config.style')  as string) ?? ''
      config.promptHint = (formData.get('config.promptHint') as string) ?? ''
      break
    case 'background':
      config.roomAesthetic = (formData.get('config.roomAesthetic') as string) ?? ''
      config.roomColors    = (formData.get('config.roomColors')    as string) ?? ''
      config.roomElements  = (formData.get('config.roomElements')  as string) ?? ''
      break
    // 'other' — no predefined fields; handled by extras below
  }

  // Forward any config.extra.* fields for extensibility without a code change
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('config.extra.')) {
      config[key.replace('config.extra.', '')] = value as string
    }
  }

  return config
}

function revalidateTemplates(ids?: string | string[]) {
  revalidatePath('/admin/templates')
  revalidatePath('/templates')
  const values = typeof ids === 'string' ? [ids] : ids ?? []
  for (const id of values) {
    revalidatePath(`/admin/templates/${id}`)
  }
}

function getTemplateIds(formData: FormData) {
  return formData
    .getAll('ids')
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

async function updateTemplateStatuses(ids: string[], status: TemplateStatus) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_templates')
    .update({ status })
    .in('id', ids)

  if (error) return { error: error.message }

  revalidateTemplates(ids)

  const labels: Record<TemplateStatus, string> = {
    published: ids.length === 1 ? 'Template published' : `${ids.length} templates published`,
    draft: ids.length === 1 ? 'Template moved to draft' : `${ids.length} templates moved to draft`,
    archived: ids.length === 1 ? 'Template archived' : `${ids.length} templates archived`,
  }

  return { success: labels[status] }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const fields = extractCommonFields(formData)
  if (!fields.title)    return { error: 'Title is required' }
  if (!fields.category) return { error: 'Category is required' }

  let config: TemplateConfig
  try {
    config = buildConfig(formData, fields.category)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid template config' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('marketplace_templates')
    .insert({ ...fields, status: 'draft', config, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidateTemplates()
  redirect(`/admin/templates/${data.id}`)
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing template ID' }

  const fields = extractCommonFields(formData)
  if (!fields.title)    return { error: 'Title is required' }
  if (!fields.category) return { error: 'Category is required' }

  let config: TemplateConfig
  try {
    config = buildConfig(formData, fields.category)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid template config' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_templates')
    .update({ ...fields, config })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateTemplates(id)
  return { success: 'Template saved' }
}

// ─── Status transitions ───────────────────────────────────────────────────────

export async function setTemplateStatus(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const id     = (formData.get('id')     as string)?.trim()
  const status = (formData.get('status') as string)?.trim()

  if (!id) return { error: 'Missing template ID' }
  if (!['draft', 'published', 'archived'].includes(status)) {
    return { error: 'Invalid status' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_templates')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateTemplates(id)

  const labels: Record<string, string> = {
    published: 'Template published — now visible in the marketplace',
    draft:     'Template moved back to draft',
    archived:  'Template archived',
  }
  return { success: labels[status] ?? 'Status updated' }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTemplate(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing template ID' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateTemplates()
  redirect('/admin/templates')
}

export async function deleteTemplateInline(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing template ID' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateTemplates(id)
  return { success: 'Template deleted' }
}

export async function setTemplatesStatusInline(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const ids = getTemplateIds(formData)
  const status = (formData.get('status') as string)?.trim()

  if (ids.length === 0) return { error: 'Select at least one template' }
  if (!['draft', 'published', 'archived'].includes(status)) {
    return { error: 'Invalid status' }
  }

  return updateTemplateStatuses(ids, status as TemplateStatus)
}

export async function deleteTemplatesInline(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const user = await verifyAdmin()
  if (!user) return { error: 'Unauthorized' }

  const ids = getTemplateIds(formData)
  if (ids.length === 0) return { error: 'Select at least one template' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_templates')
    .delete()
    .in('id', ids)

  if (error) return { error: error.message }

  revalidateTemplates()
  return { success: ids.length === 1 ? 'Template deleted' : `${ids.length} templates deleted` }
}
