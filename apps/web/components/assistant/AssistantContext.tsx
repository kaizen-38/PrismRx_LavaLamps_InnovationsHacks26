'use client'

import { createContext, useContext } from 'react'

interface AssistantContextValue {
  open: (prefill?: string) => void
}

export const AssistantContext = createContext<AssistantContextValue>({ open: () => {} })

export function useAssistant() {
  return useContext(AssistantContext)
}
