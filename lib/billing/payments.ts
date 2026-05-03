import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email/resend'
import { topupConfirmedEmail } from '@/lib/email/templates/topup-confirmed'

export interface BillingPaymentRecord {
  id: string
  user_id: string
  email: string
  pack_id: string
  pack_name: string
  tokens: number
  amount_centavos: number
  paymongo_payment_intent_id: string
  paymongo_payment_id: string | null
  status: 'awaiting_payment' | 'paid' | 'credited' | 'expired' | 'failed'
  kind: 'topup' | 'plan_period'
  plan_id: string | null
  period_months: number
  paid_at: string | null
  credited_at: string | null
  email_sent_at: string | null
  created_at: string
  updated_at: string
}

interface CreateBillingPaymentInput {
  userId: string
  email: string
  packId: string
  packName: string
  tokens: number
  amountCentavos: number
  paymentIntentId: string
  kind?: 'topup' | 'plan_period'
  planId?: string | null
  periodMonths?: number
}

interface CompleteBillingPaymentResult {
  already_credited: boolean
  user_id: string
  email: string
  tokens: number
  amount_centavos: number
  pack_id: string
  pack_name: string
  new_balance: number
  kind: 'topup' | 'plan_period'
  plan_id: string | null
  period_months: number
}

function formatPHP(centavos: number): string {
  return 'P' + (centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export async function createBillingPayment(input: CreateBillingPaymentInput): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('billing_payments').insert({
    user_id: input.userId,
    email: input.email,
    pack_id: input.packId,
    pack_name: input.packName,
    tokens: input.tokens,
    amount_centavos: input.amountCentavos,
    paymongo_payment_intent_id: input.paymentIntentId,
    kind: input.kind ?? 'topup',
    plan_id: input.planId ?? null,
    period_months: input.periodMonths ?? 1,
  })

  if (error) throw new Error(error.message)
}

export async function getBillingPaymentByIntentId(intentId: string): Promise<BillingPaymentRecord | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('billing_payments')
    .select('*')
    .eq('paymongo_payment_intent_id', intentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as BillingPaymentRecord | null
}

export async function getBillingPaymentForUser(userId: string, intentId: string): Promise<BillingPaymentRecord | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('billing_payments')
    .select('*')
    .eq('user_id', userId)
    .eq('paymongo_payment_intent_id', intentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as BillingPaymentRecord | null
}

export async function updateBillingPaymentStatus(
  intentId: string,
  status: BillingPaymentRecord['status'],
  extras?: { paymentId?: string | null; paidAt?: string | null },
): Promise<void> {
  const admin = createAdminClient()
  const payload: Record<string, string | null> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (extras?.paymentId) payload.paymongo_payment_id = extras.paymentId
  if (extras?.paidAt) payload.paid_at = extras.paidAt

  const { error } = await admin
    .from('billing_payments')
    .update(payload)
    .eq('paymongo_payment_intent_id', intentId)

  if (error) throw new Error(error.message)
}

export async function finalizeBillingPayment(
  intentId: string,
  paymentId?: string | null,
  paidAt?: string | null,
): Promise<{
  paid: boolean
  balance: number
  record: BillingPaymentRecord | null
  result: CompleteBillingPaymentResult
}> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('complete_billing_payment', {
    p_payment_intent_id: intentId,
    p_payment_id: paymentId ?? null,
    p_paid_at: paidAt ?? new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  const row = (data?.[0] ?? null) as CompleteBillingPaymentResult | null
  if (!row) throw new Error(`Billing payment completion returned no row for ${intentId}`)

  const record = await getBillingPaymentByIntentId(intentId)
  if (!record) throw new Error(`Billing payment record missing after completion for ${intentId}`)

  // Top-up confirmation email only fires for one-shot pack purchases.
  // Plan-period activations get a different email sent from the webhook.
  if (!record.email_sent_at && row.kind === 'topup') {
    try {
      const tpl = topupConfirmedEmail({
        email: row.email,
        tokens: row.tokens,
        amountPaid: formatPHP(row.amount_centavos),
        newBalance: row.new_balance,
      })
      await sendEmail({ to: row.email, ...tpl })

      const { error: updateError } = await admin
        .from('billing_payments')
        .update({
          email_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('paymongo_payment_intent_id', intentId)

      if (updateError) throw new Error(updateError.message)
    } catch (err) {
      logger.error('Failed to send top-up confirmation email', { intentId, paymentId }, err)
    }
  }

  return {
    paid: true,
    balance: row.new_balance,
    record,
    result: row,
  }
}
