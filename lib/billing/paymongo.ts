/**
 * PayMongo API client — typed fetch wrapper with Basic Auth.
 * All amounts are in PHP centavos (integer). Currency is always PHP.
 * Docs: https://developers.paymongo.com/reference
 */

import crypto from 'crypto'

const BASE_URL = 'https://api.paymongo.com/v1'

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not set')
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

async function pmFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayMongo ${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface PMCustomer {
  id: string
  attributes: {
    email: string
    default_payment_method_id: string | null
  }
}

export async function createCustomer(email: string, userId: string): Promise<PMCustomer> {
  const res = await pmFetch<{ data: PMCustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          email,
          metadata: { userId },
        },
      },
    }),
  })
  return res.data
}

export async function getCustomer(customerId: string): Promise<PMCustomer> {
  const res = await pmFetch<{ data: PMCustomer }>(`/customers/${customerId}`)
  return res.data
}

// ── Payment Methods (vaulted to customer) ─────────────────────────────────────

export interface PMPaymentMethod {
  id: string
  attributes: {
    type: string
    billing: { email: string } | null
  }
}

export async function listCustomerPaymentMethods(customerId: string): Promise<PMPaymentMethod[]> {
  const res = await pmFetch<{ data: PMPaymentMethod[] }>(`/customers/${customerId}/payment_methods?type=card`)
  return res.data
}

// ── Setup Intents (vault a card without charging) ─────────────────────────────

export interface PMSetupIntent {
  id: string
  attributes: {
    status: string
    client_key: string
    next_action: { redirect: { url: string } } | null
    payment_method_id: string | null
    last_setup_error: string | null
  }
}

export async function createSetupIntent(customerId: string): Promise<PMSetupIntent> {
  const res = await pmFetch<{ data: PMSetupIntent }>('/setup_intents', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          customer_id: customerId,
          payment_method_types: ['card'],
          metadata: {},
        },
      },
    }),
  })
  return res.data
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface PMSubscription {
  id: string
  attributes: {
    status: string
    customer_id: string
    default_customer_payment_method_id: string
    next_billing_schedule: string | null
    cancelled_at: number | null
    cancellation_reason: string | null
    plan: {
      id: string
      amount: number
      currency: string
      interval: string
      interval_count: number
      name: string
    }
    latest_invoice: {
      id: string
      amount: number
      status: string
      due_date: string
      payment_intent: {
        id: string
        status: string
        next_action_url?: string
      } | null
    } | null
    setup_intent: {
      id: string
      status: string
      next_action_url: string | null
    } | null
    created_at: number
    updated_at: number
  }
}

export async function createSubscription(
  customerId: string,
  planId: string,
  paymentMethodId: string,
): Promise<PMSubscription> {
  const res = await pmFetch<{ data: PMSubscription }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          customer_id: customerId,
          plan_id: planId,
          default_customer_payment_method_id: paymentMethodId,
        },
      },
    }),
  })
  return res.data
}

export async function cancelSubscription(subscriptionId: string): Promise<PMSubscription> {
  const res = await pmFetch<{ data: PMSubscription }>(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        attributes: { cancel_at_period_end: true },
      },
    }),
  })
  return res.data
}

export async function getSubscription(subscriptionId: string): Promise<PMSubscription> {
  const res = await pmFetch<{ data: PMSubscription }>(`/subscriptions/${subscriptionId}`)
  return res.data
}

// ── Payment Intents (one-time top-ups) ────────────────────────────────────────

export interface PMPaymentIntent {
  id: string
  attributes: {
    amount: number
    currency: string
    status: string
    client_key: string
    payment_method_allowed: string[]
    metadata: Record<string, string>
  }
}

export async function createPaymentIntent(
  amountCentavos: number,
  description: string,
  metadata: Record<string, string>,
): Promise<PMPaymentIntent> {
  const res = await pmFetch<{ data: PMPaymentIntent }>('/payment_intents', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          currency: 'PHP',
          payment_method_allowed: ['qrph'],
          description,
          capture_type: 'automatic',
          metadata,
        },
      },
    }),
  })
  return res.data
}

// ── QRPH Payment Method + Attach ──────────────────────────────────────────────

export interface PMPaymentMethodQRPH {
  id: string
  attributes: { type: string }
}

/** Creates a QRPH payment method server-side. billing.name and billing.email are required by PayMongo. */
export async function createQRPHPaymentMethod(
  email: string,
  name: string,
): Promise<PMPaymentMethodQRPH> {
  const res = await pmFetch<{ data: PMPaymentMethodQRPH }>('/payment_methods', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          type: 'qrph',
          billing: { name, email },
        },
      },
    }),
  })
  return res.data
}

export interface PMAttachResult {
  id: string
  attributes: {
    status: string
    client_key: string
    next_action: {
      type: string
      code: {
        id: string
        image_url: string   // base64 PNG: "data:image/png;base64,..."
        amount: number
        label: string
      }
    } | null
  }
}

/**
 * Attaches a QRPH payment method to a payment intent.
 * Returns the updated intent — `next_action.code.image_url` contains the base64 QR PNG.
 */
export async function attachQRPHPaymentMethod(
  intentId: string,
  clientKey: string,
  paymentMethodId: string,
): Promise<PMAttachResult> {
  const res = await pmFetch<{ data: PMAttachResult }>(`/payment_intents/${intentId}/attach`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: clientKey,
        },
      },
    }),
  })
  return res.data
}

// ── Webhook signature verification ────────────────────────────────────────────

/**
 * Verifies the `Paymongo-Signature` header.
 * Header format: t=<timestamp>,te=<test_sig>,li=<live_sig>
 * Uses the webhook secret key from PAYMONGO_WEBHOOK_SECRET env var.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!secret) throw new Error('PAYMONGO_WEBHOOK_SECRET is not set')

  const parts: Record<string, string> = {}
  for (const chunk of signatureHeader.split(',')) {
    const idx = chunk.indexOf('=')
    if (idx !== -1) parts[chunk.slice(0, idx)] = chunk.slice(idx + 1)
  }

  const { t, te, li } = parts
  if (!t) return false

  const payload = `${t}.${rawBody}`
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  // te = test signature, li = live signature
  const expected = secret.startsWith('whsk_test') ? te : li
  if (!expected) return false

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
