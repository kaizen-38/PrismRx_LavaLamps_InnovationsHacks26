// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Assistant orchestrator (SERVER SIDE ONLY)
// Routes intents, calls indexed data, uses Bedrock only for natural-language text.
// Coverage data NEVER comes from the model — always from PolicyRepository.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto'
import { policyRepository } from '@/lib/policy'
import { callBedrock, isBedrockConfigured } from '@/lib/bedrock'
import type {
  AssistantRequest,
  AssistantResponse,
  AssistantIntent,
  Widget,
  LoaderStage,
  BlockerItem,
} from '@/lib/assistant-types'
import type { PolicyDetails } from '@/lib/policy/repository'
import type { CoverageStatus } from '@/lib/types'

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(message: string, context: AssistantRequest['context']): AssistantIntent {
  const m = message.toLowerCase()
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|howdy|sup|yo|greetings)[\s!?.]*$/.test(m.trim())
  if (isGreeting) return 'greeting'

  const wantsCoverage =
    /\b(cover|coverage|pa|prior auth|approved|reimburs|benefit|criteria|policy|check)\b/.test(m)
  const hasDrug =
    context?.drug ||
    /\b(infliximab|remicade|inflectra|renflexis|avsola|rituximab|rituxan|truxima|ruxience|riabni|vedolizumab|entyvio|tocilizumab|actemra|ocrelizumab|ocrevus)\b/.test(m)
  const hasPayer =
    context?.payer ||
    /\b(aetna|uhc|united|cigna|anthem|blue shield|bsca)\b/.test(m)

  if (wantsCoverage || hasDrug || hasPayer) {
    if (!hasDrug && !context?.drug) return 'missing_drug'
    if (!hasPayer && !context?.payer) return 'missing_payer'
    return 'coverage_lookup'
  }
  if (/\b(compare|vs|versus|difference|which payer|all payers)\b/.test(m)) return 'compare_payers'
  if (/\b(what drugs|supported drug|available drug|list drug)\b/.test(m)) return 'explore_drugs'
  if (/\b(evidence|citation|source|quote|policy text)\b/.test(m)) return 'view_evidence'
  return 'unknown'
}

// ── Loader stage builders ──────────────────────────────────────────────────────

function buildIndexedLoaderStages(payer: string, drug: string): LoaderStage[] {
  return [
    { id: 'understand', label: 'Understanding your request…', durationMs: 600 },
    { id: 'normalize', label: `Normalizing "${payer}" and "${drug}" to indexed identifiers…`, durationMs: 700 },
    { id: 'match', label: 'Matching against indexed policy records…', durationMs: 800 },
    { id: 'version', label: 'Looking for best available indexed policy snapshot…', durationMs: 600 },
    { id: 'criteria', label: 'Reading coverage criteria and restrictions…', durationMs: 900 },
    { id: 'assemble', label: 'Assembling evidence-backed summary…', durationMs: 700 },
    { id: 'report', label: 'Preparing interactive report…', durationMs: 400 },
  ]
}

function buildGracefulLoaderStages(): LoaderStage[] {
  return [
    { id: 'understand', label: 'Understanding your request…', durationMs: 500 },
    { id: 'search', label: 'Searching indexed policy dataset…', durationMs: 700 },
    { id: 'notfound', label: 'Checking for partial matches and suggestions…', durationMs: 500 },
  ]
}

// ── Bedrock summary call ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a knowledgeable medical benefit drug policy assistant for PrismRx.
You help users understand indexed payer coverage policy data for infused biologics.
You must:
- Be concise, clear, and trustworthy
- Use language like "per indexed policy snapshot", "based on currently indexed data", "best available indexed policy"
- NEVER invent coverage details — only narrate what the structured data says
- NEVER say "live", "real-time", or "fetched" unless explicitly told a real fetch occurred
- Use professional, calm, editorial tone
- Keep responses to 2–4 sentences unless a full explanation is needed`

async function generateNarrative(
  prompt: string,
  fallback: string
): Promise<{ text: string; modelUsed: 'bedrock' | 'fallback' }> {
  if (!isBedrockConfigured()) {
    return { text: fallback, modelUsed: 'fallback' }
  }
  try {
    const text = await callBedrock(
      [{ role: 'user', content: prompt }],
      SYSTEM_PROMPT,
      512
    )
    return { text: text.trim() || fallback, modelUsed: 'bedrock' }
  } catch {
    return { text: fallback, modelUsed: 'fallback' }
  }
}

// ── Blocker builder ───────────────────────────────────────────────────────────

function buildBlockers(details: PolicyDetails): BlockerItem[] {
  const blockers: BlockerItem[] = []

  if (details.record.paRequired) {
    blockers.push({
      label: 'Prior Authorization Required',
      value: 'A prior authorization must be submitted before dispensing.',
      type: 'prior_auth',
      severity: 'hard',
    })
  }

  if (details.record.stepTherapyRequired && details.priorFailureRequirements.length > 0) {
    blockers.push({
      label: 'Step Therapy',
      value: `Required prior failures: ${details.priorFailureRequirements.join(', ')}`,
      type: 'step_therapy',
      severity: 'hard',
    })
  }

  if (details.siteOfCare) {
    blockers.push({
      label: 'Site-of-Care Restriction',
      value: details.siteOfCare,
      type: 'site_of_care',
      severity: 'soft',
    })
  }

  if (details.specialtyRequired) {
    blockers.push({
      label: 'Specialist Required',
      value: `Prescribing restricted to: ${details.specialtyRequired}`,
      type: 'specialist',
      severity: 'soft',
    })
  }

  if (details.renewalIntervalDays) {
    blockers.push({
      label: 'Reauthorization',
      value: `Renewal required every ${details.renewalIntervalDays} days.`,
      type: 'reauth',
      severity: 'info',
    })
  }

  const biosimilarNote = details.record.raw.clinical_criteria?.additional_notes?.find(
    n => /biosimilar|non-preferred|remicade/i.test(n)
  )
  if (biosimilarNote) {
    blockers.push({
      label: 'Biosimilar / Product Note',
      value: biosimilarNote,
      type: 'biosimilar_note',
      severity: 'soft',
    })
  }

  if (details.record.raw.clinical_criteria?.lab_requirements?.length) {
    blockers.push({
      label: 'Lab Requirements',
      value: details.record.raw.clinical_criteria.lab_requirements.join(', '),
      type: 'lab',
      severity: 'soft',
    })
  }

  return blockers
}

// ── Status display helpers ────────────────────────────────────────────────────

function statusLabel(s: CoverageStatus): string {
  const map: Record<CoverageStatus, string> = {
    covered: 'Covered per indexed policy',
    conditional: 'Conditional coverage — criteria apply',
    preferred: 'Preferred agent under indexed policy',
    nonpreferred: 'Non-preferred — covered with higher burden',
    not_covered: 'Not covered per indexed policy',
    unclear: 'Coverage status unclear in indexed data',
  }
  return map[s] ?? 'Coverage status unknown'
}

// ── Response builders ─────────────────────────────────────────────────────────

async function buildGreetingResponse(requestId: string): Promise<AssistantResponse> {
  const payers = policyRepository.listSupportedPayers()
  const drugs = policyRepository.listSupportedDrugs()

  return {
    requestId,
    intent: 'greeting',
    assistantText:
      "Hi — happy to help you explore indexed medical-benefit drug policy coverage. I can check coverage criteria, blockers, and evidence for the payer/drug combinations in our current indexed dataset. What would you like to explore?",
    widget: {
      type: 'welcome_quick_actions',
      props: { supportedPayerCount: payers.length, supportedDrugCount: drugs.length },
    },
    sideWidgets: [],
    loaderStages: [],
    meta: {
      resolvedPayer: null, resolvedDrug: null,
      isIndexed: true, dataSource: 'manual_indexed',
      modelUsed: 'fallback', timestamp: new Date().toISOString(),
    },
  }
}

async function buildMissingFieldResponse(
  requestId: string,
  intent: 'missing_payer' | 'missing_drug',
  context: AssistantRequest['context']
): Promise<AssistantResponse> {
  const payers = policyRepository.listSupportedPayers()
  const drugs = policyRepository.listSupportedDrugs()
  const missingField = intent === 'missing_payer' ? 'payer' : 'drug'

  return {
    requestId,
    intent,
    assistantText: intent === 'missing_payer'
      ? `I can look up indexed coverage — I just need to know which payer you're asking about. Which health plan would you like to check?`
      : `I can look up indexed coverage — I just need to know which drug you're asking about. Which biologic or drug family should I check?`,
    widget: {
      type: 'coverage_intake_form',
      props: {
        prefillPayer: context?.payer,
        prefillDrug: context?.drug,
        prefillDiagnosis: context?.diagnosis,
      },
    },
    sideWidgets: [{
      type: 'supported_options_card',
      props: {
        requestedPayer: missingField === 'payer' ? undefined : context?.payer,
        requestedDrug: missingField === 'drug' ? undefined : context?.drug,
        supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })),
        supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })),
      },
    }],
    loaderStages: [],
    meta: {
      resolvedPayer: context?.payer ?? null,
      resolvedDrug: context?.drug ?? null,
      isIndexed: false, dataSource: 'manual_indexed',
      modelUsed: 'fallback', timestamp: new Date().toISOString(),
    },
  }
}

async function buildUnindexedResponse(
  requestId: string,
  inputPayer: string,
  inputDrug: string,
  resolvedPayer: string | null,
  resolvedDrug: string | null
): Promise<AssistantResponse> {
  const payers = policyRepository.listSupportedPayers()
  const drugs = policyRepository.listSupportedDrugs()

  const what = !resolvedPayer
    ? `"${inputPayer}" is not currently in the indexed payer dataset`
    : !resolvedDrug
    ? `"${inputDrug}" is not currently in the indexed drug dataset`
    : `The combination of ${resolvedPayer} + ${resolvedDrug} is not currently indexed`

  return {
    requestId,
    intent: 'unsupported',
    assistantText: `${what}. The indexed dataset currently covers ${payers.length} payers and ${drugs.length} drug families. Here's what's available — select a supported combination to continue.`,
    widget: {
      type: 'supported_options_card',
      props: {
        requestedPayer: inputPayer,
        requestedDrug: inputDrug,
        supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })),
        supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })),
      },
    },
    sideWidgets: [{ type: 'limitation_notice', props: {} }],
    loaderStages: buildGracefulLoaderStages(),
    meta: {
      resolvedPayer, resolvedDrug,
      isIndexed: false, dataSource: 'manual_indexed',
      modelUsed: 'fallback', timestamp: new Date().toISOString(),
    },
  }
}

async function buildCoverageResponse(
  requestId: string,
  payerId: string,
  drugKey: string,
  payerDisplay: string,
  drugDisplay: string,
  context: AssistantRequest['context']
): Promise<AssistantResponse> {
  const details = policyRepository.getPolicyDetails(payerId, drugKey)
  if (!details) {
    return buildUnindexedResponse(requestId, payerDisplay, drugDisplay, payerId, drugKey)
  }

  const related = policyRepository.getRelatedCombinations(payerId, drugKey)
  const blockers = buildBlockers(details)
  const status = statusLabel(details.record.coverageStatus)

  // Ask Bedrock for a 2–3 sentence natural-language summary
  const narrativePrompt = `Summarize this indexed policy coverage record in 2-3 sentences for a healthcare professional.
Payer: ${payerDisplay}
Drug: ${drugDisplay}
Status: ${status}
PA Required: ${details.record.paRequired ? 'Yes' : 'No'}
Step Therapy: ${details.record.stepTherapyRequired ? 'Yes — ' + details.priorFailureRequirements.join(', ') : 'No'}
Site of Care: ${details.siteOfCare ?? 'Not specified'}
Effective Date: ${details.record.effectiveDate}
Next best action: ${details.nextBestAction}
Use language like "per the indexed policy snapshot" and be factual and concise.`

  const fallbackNarrative = `Per the indexed policy snapshot, ${payerDisplay} covers ${drugDisplay} with ${details.record.paRequired ? 'prior authorization required' : 'no prior authorization required'}. ${details.record.stepTherapyRequired ? `Step therapy is required — failure of ${details.priorFailureRequirements.slice(0, 2).join(', ')} must be documented.` : ''} The best available indexed policy version is effective ${details.record.effectiveDate}.`

  const { text: narrativeText, modelUsed } = await generateNarrative(narrativePrompt, fallbackNarrative)

  const primaryWidget: Widget = {
    type: 'coverage_report_hero',
    props: {
      payer: payerDisplay,
      drug: drugDisplay,
      coverageStatus: details.record.coverageStatus,
      paRequired: details.record.paRequired,
      stepTherapyRequired: details.record.stepTherapyRequired,
      effectiveDate: details.record.effectiveDate,
      versionLabel: details.record.versionLabel,
      shortTakeaway: narrativeText,
      frictionScore: details.frictionScore,
    },
  }

  const sideWidgets: Widget[] = [
    {
      type: 'blockers_and_requirements',
      props: { blockers, nextBestAction: details.nextBestAction },
    },
    {
      type: 'evidence_drawer',
      props: {
        evidence: details.evidence,
        policyTitle: `${payerDisplay} — ${drugDisplay} (${details.record.versionLabel})`,
      },
    },
    {
      type: 'policy_snapshot_card',
      props: {
        payer: payerDisplay,
        drugFamily: drugDisplay,
        effectiveDate: details.record.effectiveDate,
        versionLabel: details.record.versionLabel,
        policyId: details.record.policyId,
        confidence: 'high',
        completenessNote: 'Based on indexed policy snapshot. Does not guarantee reimbursement or PA outcome.',
      },
    },
    {
      type: 'related_actions',
      props: { payerId, drugKey, relatedCombinations: related },
    },
    { type: 'limitation_notice', props: {} },
  ]

  return {
    requestId,
    intent: 'coverage_lookup',
    assistantText: narrativeText,
    widget: primaryWidget,
    sideWidgets,
    loaderStages: buildIndexedLoaderStages(payerDisplay, drugDisplay),
    meta: {
      resolvedPayer: payerDisplay, resolvedDrug: drugDisplay,
      isIndexed: true, dataSource: 'manual_indexed',
      modelUsed, timestamp: new Date().toISOString(),
    },
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function orchestrate(req: AssistantRequest): Promise<AssistantResponse> {
  const requestId = randomUUID()

  // Merge context from message + explicit context fields
  const inputPayer = req.context?.payer ?? extractField(req.message, 'payer')
  const inputDrug = req.context?.drug ?? extractField(req.message, 'drug')

  const intent = detectIntent(req.message, { ...req.context, payer: inputPayer, drug: inputDrug })

  if (intent === 'greeting') return buildGreetingResponse(requestId)

  if (intent === 'missing_payer' || intent === 'missing_drug') {
    return buildMissingFieldResponse(requestId, intent, req.context)
  }

  if (intent === 'explore_drugs' || intent === 'compare_payers') {
    const payers = policyRepository.listSupportedPayers()
    const drugs = policyRepository.listSupportedDrugs()
    return {
      requestId, intent,
      assistantText: intent === 'explore_drugs'
        ? `The indexed dataset currently covers ${drugs.length} drug families. Here's what's available.`
        : `The indexed dataset covers ${payers.length} payers. Select a payer and drug to compare coverage criteria.`,
      widget: {
        type: 'supported_options_card',
        props: {
          supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })),
          supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })),
        },
      },
      sideWidgets: [{ type: 'limitation_notice', props: {} }],
      loaderStages: [],
      meta: {
        resolvedPayer: null, resolvedDrug: null, isIndexed: true,
        dataSource: 'manual_indexed', modelUsed: 'fallback',
        timestamp: new Date().toISOString(),
      },
    }
  }

  // Coverage lookup
  if (intent === 'coverage_lookup') {
    const resolvedPayer = inputPayer ? policyRepository.resolvePayer(inputPayer) : null
    const resolvedDrug = inputDrug ? policyRepository.resolveDrug(inputDrug) : null

    if (!resolvedPayer || !resolvedDrug) {
      return buildUnindexedResponse(
        requestId,
        inputPayer ?? 'unknown payer',
        inputDrug ?? 'unknown drug',
        resolvedPayer?.id ?? null,
        resolvedDrug?.key ?? null
      )
    }

    return buildCoverageResponse(
      requestId,
      resolvedPayer.id,
      resolvedDrug.key,
      resolvedPayer.displayName,
      resolvedDrug.displayName,
      req.context
    )
  }

  // Unknown / catch-all
  return buildGreetingResponse(requestId)
}

// ── Simple field extractor ────────────────────────────────────────────────────
// Extracts payer or drug names from free-text messages.

const PAYER_PATTERNS = [
  /\baetna\b/i, /\buhc\b/i, /\bunited\b/i, /\bcigna\b/i,
  /\banthem\b/i, /\bblue shield\b/i, /\bbsca\b/i,
]
const DRUG_PATTERNS = [
  /\binfliximab\b/i, /\bremicade\b/i, /\binflectra\b/i, /\bavsola\b/i, /\brenflexis\b/i,
  /\brituximab\b/i, /\brituxan\b/i, /\btruxima\b/i,
  /\bvedolizumab\b/i, /\bentyvio\b/i,
  /\btocilizumab\b/i, /\bactemra\b/i,
  /\bocrelizumab\b/i, /\bocrevus\b/i,
]

function extractField(message: string, field: 'payer' | 'drug'): string | undefined {
  const patterns = field === 'payer' ? PAYER_PATTERNS : DRUG_PATTERNS
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[0]
  }
  return undefined
}
