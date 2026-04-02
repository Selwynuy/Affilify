'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdmin }       from '@/lib/admin/auth'
import type {
  TemplateCategory,
  TemplateConfig,
  TemplateFormState,
} from '@/lib/types/marketplace'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCommonFields(formData: FormData) {
  return {
    title:         (formData.get('title')         as string)?.trim() ?? '',
    description:   (formData.get('description')   as string)?.trim() || null,
    category:      (formData.get('category')       as TemplateCategory),
    thumbnail_url: (formData.get('thumbnail_url') as string)?.trim() || null,
    preview_url:   (formData.get('preview_url')   as string)?.trim() || null,
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
    case 'camera':
      config.promptFragment    = (formData.get('config.promptFragment')    as string) ?? ''
      config.cameraAnglePrompt = (formData.get('config.cameraAnglePrompt') as string) ?? ''
      break
    case 'movement':
      config.promptFragment = (formData.get('config.promptFragment') as string) ?? ''
      break
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

function revalidateTemplates(id?: string) {
  revalidatePath('/admin/templates')
  revalidatePath('/templates')
  if (id) revalidatePath(`/admin/templates/${id}`)
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

  const config = buildConfig(formData, fields.category)

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

  const config = buildConfig(formData, fields.category)

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

  revalidateTemplates()
  return { success: 'Template deleted' }
}
