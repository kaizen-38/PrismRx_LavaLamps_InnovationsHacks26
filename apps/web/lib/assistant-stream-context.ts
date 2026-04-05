import { AsyncLocalStorage } from 'node:async_hooks'

export type AssistStreamStore = {
  onDelta: (chunk: string) => void
}

export const assistStreamContext = new AsyncLocalStorage<AssistStreamStore>()

export function getAssistStreamContext(): AssistStreamStore | undefined {
  return assistStreamContext.getStore()
}
