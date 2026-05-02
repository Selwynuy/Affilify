import { createAdminClient } from '@/lib/supabase/admin'
import type { LedgerType } from '@/lib/types/billing'

export interface ReservationParams {
  userId: string
  amount: number
  type: LedgerType
  description: string
  projectId?: string | null
  ttlSeconds?: number
}

export class InsufficientBalanceError extends Error {
  constructor(message = 'Insufficient token balance for reservation') {
    super(message)
    this.name = 'InsufficientBalanceError'
  }
}

/**
 * Hold tokens against a user's balance before performing an operation
 * that may fail (e.g. external API calls). Returns the reservation id;
 * caller MUST eventually call commitTokenReservation or
 * releaseTokenReservation.
 *
 * Throws InsufficientBalanceError when the user does not have enough
 * spendable balance after subtracting active reservations.
 */
export async function reserveTokens(params: ReservationParams): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('reserve_tokens', {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_description: params.description,
    p_project_id: params.projectId ?? null,
    p_ttl_seconds: params.ttlSeconds ?? 300,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new InsufficientBalanceError()

  return data as string
}

/**
 * Convert a reservation into a real ledger debit. Idempotent — calling
 * twice on the same reservation does not double-charge.
 *
 * Returns false when the reservation expired or was already released.
 */
export async function commitTokenReservation(reservationId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('commit_token_reservation', {
    p_reservation_id: reservationId,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

/**
 * Free a held reservation without charging the user. Idempotent.
 * Use when generation fails, times out, or the user cancels.
 */
export async function releaseTokenReservation(reservationId: string, reason = 'released'): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('release_token_reservation', {
    p_reservation_id: reservationId,
    p_reason: reason,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

/**
 * Cron entrypoint. Marks all active-but-past-TTL reservations as
 * expired so their held amount is no longer counted against balance.
 */
export async function releaseExpiredTokenReservations(): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('release_expired_token_reservations')
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}
