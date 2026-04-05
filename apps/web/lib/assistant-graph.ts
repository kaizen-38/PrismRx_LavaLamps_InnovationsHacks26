import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import type { AssistantRequest, AssistantResponse, AssistantIntent } from '@/lib/assistant-types'

const AssistantState = Annotation.Root({
  req: Annotation<AssistantRequest>(),
  requestId: Annotation<string>(),
  payer: Annotation<string | undefined>(),
  drug: Annotation<string | undefined>(),
  intent: Annotation<AssistantIntent>(),
  response: Annotation<AssistantResponse | undefined>(),
})

export type AssistantGraphState = typeof AssistantState.State

export type AssistantGraphDeps = {
  parseState: (req: AssistantRequest) => { payer?: string; drug?: string; intent: AssistantIntent }
  runGeneral: (
    requestId: string,
    req: AssistantRequest,
    payer: string | undefined,
    drug: string | undefined,
    intent: AssistantIntent,
  ) => Promise<AssistantResponse>
  runCoverage: (requestId: string, req: AssistantRequest, payer: string, drug: string) => Promise<AssistantResponse>
}

function routeAfterParse(state: AssistantGraphState): 'general' | 'coverage' {
  if (state.intent === 'coverage_lookup' && state.payer && state.drug) return 'coverage'
  return 'general'
}

export function compileAssistantGraph(deps: AssistantGraphDeps) {
  return new StateGraph(AssistantState)
    .addNode('parse', (s: AssistantGraphState) => {
      const { payer, drug, intent } = deps.parseState(s.req)
      return { payer, drug, intent }
    })
    .addNode('general', async (s: AssistantGraphState) => ({
      response: await deps.runGeneral(s.requestId, s.req, s.payer, s.drug, s.intent),
    }))
    .addNode('coverage', async (s: AssistantGraphState) => ({
      response: await deps.runCoverage(s.requestId, s.req, s.payer!, s.drug!),
    }))
    .addEdge(START, 'parse')
    .addConditionalEdges('parse', routeAfterParse, {
      general: 'general',
      coverage: 'coverage',
    })
    .addEdge('general', END)
    .addEdge('coverage', END)
    .compile()
}
