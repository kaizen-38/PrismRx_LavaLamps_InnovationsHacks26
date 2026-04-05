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
  runGreeting: (requestId: string) => Promise<AssistantResponse>
  runMissing: (
    requestId: string,
    reason: 'missing_payer' | 'missing_drug',
    payer: string | undefined,
    drug: string | undefined,
  ) => Promise<AssistantResponse>
  runExploreCompare: (requestId: string, intent: 'explore_drugs' | 'compare_payers') => Promise<AssistantResponse>
  runCoverage: (requestId: string, req: AssistantRequest, payer: string, drug: string) => Promise<AssistantResponse>
}

function routeAfterParse(state: AssistantGraphState): 'greeting' | 'explore_compare' | 'missing_response' | 'coverage' {
  if (state.intent === 'greeting') return 'greeting'
  if (state.intent === 'explore_drugs' || state.intent === 'compare_payers') return 'explore_compare'
  if (state.intent === 'missing_drug' || state.intent === 'missing_payer') return 'missing_response'
  if (!state.payer || !state.drug) return 'missing_response'
  return 'coverage'
}

export function compileAssistantGraph(deps: AssistantGraphDeps) {
  return new StateGraph(AssistantState)
    .addNode('parse', (s: AssistantGraphState) => {
      const { payer, drug, intent } = deps.parseState(s.req)
      return { payer, drug, intent }
    })
    .addNode('greeting', async (s: AssistantGraphState) => ({
      response: await deps.runGreeting(s.requestId),
    }))
    .addNode('explore_compare', async (s: AssistantGraphState) => ({
      response: await deps.runExploreCompare(
        s.requestId,
        s.intent as 'explore_drugs' | 'compare_payers',
      ),
    }))
    .addNode('missing_response', async (s: AssistantGraphState) => {
      const reason: 'missing_payer' | 'missing_drug' =
        s.intent === 'missing_drug' || s.intent === 'missing_payer'
          ? s.intent
          : !s.payer
            ? 'missing_payer'
            : 'missing_drug'
      return { response: await deps.runMissing(s.requestId, reason, s.payer, s.drug) }
    })
    .addNode('coverage', async (s: AssistantGraphState) => ({
      response: await deps.runCoverage(s.requestId, s.req, s.payer!, s.drug!),
    }))
    .addEdge(START, 'parse')
    .addConditionalEdges('parse', routeAfterParse, {
      greeting: 'greeting',
      explore_compare: 'explore_compare',
      missing_response: 'missing_response',
      coverage: 'coverage',
    })
    .addEdge('greeting', END)
    .addEdge('explore_compare', END)
    .addEdge('missing_response', END)
    .addEdge('coverage', END)
    .compile()
}
