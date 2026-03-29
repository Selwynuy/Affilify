'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface TokenContextValue {
  balance: number | null
  planId: string | null
  refreshBalance: () => void
}

const TokenContext = createContext<TokenContextValue | null>(null)

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)

  const refreshBalance = useCallback(() => {
    fetch('/api/billing/balance')
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.balance ?? 0)
        setPlanId(d.planId ?? null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { refreshBalance() }, [refreshBalance])

  return (
    <TokenContext.Provider value={{ balance, planId, refreshBalance }}>
      {children}
    </TokenContext.Provider>
  )
}

export function useTokens() {
  const ctx = useContext(TokenContext)
  if (!ctx) throw new Error('useTokens must be used inside TokenProvider')
  return ctx
}
