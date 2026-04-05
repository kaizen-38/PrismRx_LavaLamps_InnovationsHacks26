// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Assistant orchestrator (SERVER SIDE ONLY)
// Flow: entity extraction → DB lookup → Claude verification → widget assembly
// Coverage data ALWAYS comes from the DB — Claude only narrates, never invents.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto'
import { policyRepository } from '@/lib/policy'
import { callBedrock, streamBedrock, isBedrockConfigured } from '@/lib/bedrock'
import {
  lookupPolicy,
  getSupportedOptions,
  getDocumentText,
  getLivePolicyText,
  type PolicyLookupFound,
} from '@/lib/policy/db-repository'
import type {
  AssistantRequest,
  AssistantResponse,
  AssistantIntent,
  Widget,
  LoaderStage,
  BlockerItem,
} from '@/lib/assistant-types'

// ── Entity extraction ─────────────────────────────────────────────────────────

const PAYER_PATTERNS: Array<[RegExp, string]> = [
  [/\b(united\s*health\s*care|uhc|unitedhealthcare)\b/i, 'UnitedHealthcare'],
  [/\bcigna\b/i, 'Cigna'],
  [/\baetna\b/i, 'Aetna'],
  [/\bpriority\s*health\b/i, 'Priority Health'],
  [/\banthem\b/i, 'Anthem'],
  [/\bblue\s*shield\b/i, 'Blue Shield'],
]

const DRUG_PATTERNS: Array<[RegExp, string]> = [
  [/\b(infliximab|remicade|inflectra|avsola|renflexis|ixifi)\b/i, 'infliximab'],
  [/\b(rituximab|rituxan|truxima|ruxience|riabni)\b/i, 'rituximab'],
  [/\b(vedolizumab|entyvio)\b/i, 'vedolizumab'],
  [/\b(ocrelizumab|ocrevus)\b/i, 'ocrelizumab'],
  [/\b(tocilizumab|actemra)\b/i, 'tocilizumab'],
]

function extractPayer(text: string): string | undefined {
  for (const [pattern, canonical] of PAYER_PATTERNS) {
    if (pattern.test(text)) return canonical
  }
  return undefined
}

function extractDrug(text: string): string | undefined {
  for (const [pattern, canonical] of DRUG_PATTERNS) {
    if (pattern.test(text)) return canonical
  }
  return undefined
}

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(
  message: string,
  payer: string | undefined,
  drug: string | undefined,
): AssistantIntent {
  const m = message.toLowerCase().trim()

  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|howdy|sup|yo|greetings)[\s!?.]*$/.test(m)
  if (isGreeting) return 'greeting'

  const wantsCoverage =
    /\b(cover|coverage|pa|prior auth|approved|reimburs|benefit|criteria|policy|check|does|will|is)\b/.test(m)
  const mentionsDrug = Boolean(drug) || DRUG_PATTERNS.some(([p]) => p.test(m))
  const mentionsPayer = Boolean(payer) || PAYER_PATTERNS.some(([p]) => p.test(m))

  if (mentionsDrug && mentionsPayer) return 'coverage_lookup'
  if (wantsCoverage || mentionsDrug || mentionsPayer) {
    if (!mentionsDrug && !drug) return 'missing_drug'
    if (!mentionsPayer && !payer) return 'missing_payer'
    return 'coverage_lookup'
  }

  if (/\b(compare|vs|versus|difference|which payer|all payers)\b/.test(m)) return 'compare_payers'
  if (/\b(what drugs|supported drug|available drug|list drug|show)\b/.test(m)) return 'explore_drugs'

  // If we have both from context, treat as follow-up lookup
  if (payer && drug) return 'coverage_lookup'

  return 'unknown'
}

// ── Loader stages ─────────────────────────────────────────────────────────────

function buildIndexedLoaderStages(payer: string, drug: string): LoaderStage[] {
  return [
    { id: 'resolve',    label: `Resolving ${payer} payer contract records…`,            durationMs: 700  },
    { id: 'fetch',      label: `Fetching latest indexed policy documents for ${drug}…`, durationMs: 1100 },
    { id: 'parse',      label: 'Parsing prior authorization criteria and step therapy…', durationMs: 900  },
    { id: 'index',      label: 'Indexing site-of-care restrictions and billing codes…',  durationMs: 800  },
    { id: 'evidence',   label: 'Pulling evidence citations from source policy text…',    durationMs: 950  },
    { id: 'insights',   label: 'Getting coverage insights and access burden signals…',   durationMs: 850  },
    { id: 'compile',    label: 'Compiling interactive report…',                          durationMs: 500  },
  ]
}

function buildGracefulLoaderStages(): LoaderStage[] {
  return [
    { id: 'resolve',  label: 'Checking payer and drug identifiers…',          durationMs: 600 },
    { id: 'search',   label: 'Searching indexed policy dataset…',             durationMs: 800 },
    { id: 'suggest',  label: 'Finding closest available indexed options…',    durationMs: 600 },
  ]
}

function buildLookupLoaderStages(payer: string, drug: string): LoaderStage[] {
  return [
    { id: 'understand', label: 'Understanding your request…',                  durationMs: 500  },
    { id: 'lookup',     label: `Searching DB for ${payer} / ${drug} policy…`,  durationMs: 600  },
    { id: 'search',     label: 'Searching web for policy document…',           durationMs: 1500 },
    { id: 'crawl',      label: 'Crawling and extracting document text…',       durationMs: 2000 },
    { id: 'analyze',    label: 'Analyzing document with Claude…',              durationMs: 1200 },
    { id: 'cite',       label: 'Extracting citations from document…',          durationMs: 500  },
    { id: 'assemble',   label: 'Assembling interactive report…',               durationMs: 400  },
  ]
}

function buildFallbackLoaderStages(): LoaderStage[] {
  return [
    { id: 'understand', label: 'Understanding your request…', durationMs: 400 },
    { id: 'lookup', label: 'Searching indexed policy dataset…', durationMs: 600 },
    { id: 'notfound', label: 'Checking for partial matches…', durationMs: 400 },
  ]
}

// ── Document-grounded Claude analysis ────────────────────────────────────────

const DOC_ANALYSIS_SYSTEM = `You are a medical benefit drug policy analyst for PrismRx.
You are given the full text of a payer policy document and a user's question.
Answer based ONLY on content in the document — never invent facts.
Return valid JSON only, no markdown fences.`

interface ClaudeDocAnalysis {
  answer: string
  citations: Array<{ page: number | null; section: string; quote: string; confidence: number }>
}

// Max chars to send to Claude (~100k chars ≈ 25k tokens, well within 200k context)
const MAX_DOC_CHARS = 100_000

async function analyzeDocumentWithClaude(
  userMessage: string,
  policy: PolicyLookupFound,
  rawText: string,
): Promise<{ analysis: ClaudeDocAnalysis; modelUsed: 'bedrock' | 'fallback' }> {
  const truncated = rawText.length > MAX_DOC_CHARS
    ? rawText.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated for length]'
    : rawText

  const prompt = `USER QUESTION: ${userMessage}

PAYER: ${policy.payer}
DRUG: ${policy.drug_display}
EFFECTIVE DATE: ${policy.effective_date}
POLICY VERSION: ${policy.version_label}

FULL POLICY DOCUMENT TEXT:
${truncated}

Based on the document above, answer the user's question. Extract 2-5 citations with exact verbatim quotes.

Respond with valid JSON only:
{
  "answer": "2-3 sentence professional response. Reference the document explicitly (e.g. 'Per the ${policy.payer} policy...'). Never invent facts.",
  "citations": [
    {
      "page": null,
      "section": "exact section heading from document",
      "quote": "exact verbatim quote from document (max 250 chars)",
      "confidence": 0.9
    }
  ]
}`

  if (!isBedrockConfigured()) {
    return { analysis: buildFallbackAnalysis(policy), modelUsed: 'fallback' }
  }

  try {
    const raw = await callBedrock(
      [{ role: 'user', content: prompt }],
      DOC_ANALYSIS_SYSTEM,
      1024,
      60_000, // 60s timeout for large documents
    )
    const cleaned = raw.replace(/```json?|```/g, '').trim()
    const parsed: ClaudeDocAnalysis = JSON.parse(cleaned)
    return { analysis: parsed, modelUsed: 'bedrock' }
  } catch {
    return { analysis: buildFallbackAnalysis(policy), modelUsed: 'fallback' }
  }
}

/** Generates a structured text summary from DB fields when raw_text is unavailable */
function buildStructuredSummaryText(policy: PolicyLookupFound): string {
  const lines = [
    `PAYER: ${policy.payer}`,
    `DRUG: ${policy.drug_display} (${policy.drug_family})`,
    `COVERAGE STATUS: ${policy.coverage_status}`,
    `PRIOR AUTHORIZATION REQUIRED: ${policy.pa_required ? 'Yes' : 'No'}`,
    `STEP THERAPY REQUIRED: ${policy.step_therapy_required ? 'Yes' : 'No'}`,
    `EFFECTIVE DATE: ${policy.effective_date}`,
    `POLICY VERSION: ${policy.version_label}`,
    '',
  ]
  if (policy.covered_indications.length) {
    lines.push('COVERED INDICATIONS:', ...policy.covered_indications.map(s => `- ${s}`), '')
  }
  if (policy.step_therapy_requirements.length) {
    lines.push('STEP THERAPY REQUIREMENTS:', ...policy.step_therapy_requirements.map(s => `- ${s}`), '')
  }
  if (policy.diagnosis_requirements.length) {
    lines.push('DIAGNOSIS REQUIREMENTS:', ...policy.diagnosis_requirements.map(s => `- ${s}`), '')
  }
  if (policy.lab_or_biomarker_requirements.length) {
    lines.push('LAB / BIOMARKER REQUIREMENTS:', ...policy.lab_or_biomarker_requirements.map(s => `- ${s}`), '')
  }
  if (policy.prescriber_requirements.length) {
    lines.push('PRESCRIBER REQUIREMENTS:', ...policy.prescriber_requirements.map(s => `- ${s}`), '')
  }
  if (policy.site_of_care_restrictions.length) {
    lines.push('SITE-OF-CARE RESTRICTIONS:', ...policy.site_of_care_restrictions.map(s => `- ${s}`), '')
  }
  if (policy.dose_frequency_rules.length) {
    lines.push('DOSE / FREQUENCY RULES:', ...policy.dose_frequency_rules.map(s => `- ${s}`), '')
  }
  if (policy.reauthorization_rules.length) {
    lines.push('REAUTHORIZATION RULES:', ...policy.reauthorization_rules.map(s => `- ${s}`), '')
  }
  if (policy.preferred_product_notes.length) {
    lines.push('PREFERRED PRODUCT NOTES:', ...policy.preferred_product_notes.map(s => `- ${s}`), '')
  }
  if (policy.exclusions.length) {
    lines.push('EXCLUSIONS:', ...policy.exclusions.map(s => `- ${s}`), '')
  }
  return lines.join('\n')
}

function buildFallbackAnalysis(policy: PolicyLookupFound): ClaudeDocAnalysis {
  const statusText = {
    covered: 'covered',
    conditional: 'covered with conditions',
    preferred: 'a preferred agent',
    nonpreferred: 'covered but non-preferred',
    not_covered: 'not covered',
    unclear: 'unclear coverage status',
  }[policy.coverage_status] ?? policy.coverage_status

  const paText = policy.pa_required ? 'Prior authorization is required.' : 'No prior authorization is required.'
  const stepText = policy.step_therapy_required
    ? `Step therapy is required — document prior treatment failures.`
    : ''

  const answer = `Per the ${policy.payer} policy, ${policy.drug_display} is ${statusText}. ${paText} ${stepText} Policy effective ${policy.effective_date}.`.trim()

  const citations = (policy.citations || []).slice(0, 3).map(c => ({
    page: c.page ?? null,
    section: c.section ?? '',
    quote: c.quote ?? '',
    confidence: c.confidence ?? 0.7,
  }))

  return { answer, citations }
}

// ── Blocker builder ───────────────────────────────────────────────────────────

function buildBlockers(policy: PolicyLookupFound): BlockerItem[] {
  const blockers: BlockerItem[] = []

  if (policy.pa_required) {
    blockers.push({
      label: 'Prior Authorization Required',
      value: 'A prior authorization must be submitted before dispensing.',
      type: 'prior_auth',
      severity: 'hard',
    })
  }

  if (policy.step_therapy_required && policy.step_therapy_requirements.length > 0) {
    blockers.push({
      label: 'Step Therapy',
      value: policy.step_therapy_requirements.slice(0, 2).join(' | '),
      type: 'step_therapy',
      severity: 'hard',
    })
  }

  if (policy.site_of_care_restrictions.length > 0) {
    blockers.push({
      label: 'Site-of-Care Restriction',
      value: policy.site_of_care_restrictions[0],
      type: 'site_of_care',
      severity: 'soft',
    })
  }

  if (policy.prescriber_requirements.length > 0) {
    blockers.push({
      label: 'Specialist Required',
      value: policy.prescriber_requirements[0],
      type: 'specialist',
      severity: 'soft',
    })
  }

  if (policy.reauthorization_rules.length > 0) {
    blockers.push({
      label: 'Reauthorization',
      value: policy.reauthorization_rules[0],
      type: 'reauth',
      severity: 'info',
    })
  }

  if (policy.lab_or_biomarker_requirements.length > 0) {
    blockers.push({
      label: 'Lab / Biomarker Requirements',
      value: policy.lab_or_biomarker_requirements.slice(0, 2).join(' | '),
      type: 'lab',
      severity: 'soft',
    })
  }

  const biosimilarNote = policy.preferred_product_notes[0]
  if (biosimilarNote) {
    blockers.push({
      label: 'Product Preference Note',
      value: biosimilarNote,
      type: 'biosimilar_note',
      severity: 'soft',
    })
  }

  return blockers
}

function nextBestAction(policy: PolicyLookupFound): string {
  if (!policy.pa_required) return 'No prior authorization required — proceed with prescribing.'
  if (policy.step_therapy_required) return 'Document prior therapy failures before submitting PA request.'
  return 'Submit prior authorization with clinical documentation per policy criteria.'
}

// ── Response builders ─────────────────────────────────────────────────────────

async function buildGreetingResponse(requestId: string): Promise<AssistantResponse> {
  const { payers, drugs } = await getSupportedOptions().catch(() => ({ payers: [], drugs: [] }))
  return {
    requestId,
    intent: 'greeting',
    assistantText:
      "Hi — I can help you check medical benefit drug policy coverage. Tell me the payer and drug you'd like to look up. For example: \"Does UnitedHealthcare cover infliximab?\"",
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
  payer: string | undefined,
  drug: string | undefined,
): Promise<AssistantResponse> {
  const { payers, drugs } = await getSupportedOptions().catch(() => ({ payers: [], drugs: [] }))
  return {
    requestId,
    intent,
    assistantText: intent === 'missing_payer'
      ? `I need to know which payer you're asking about. Which health plan should I check${drug ? ` for ${drug}` : ''}?`
      : `I need to know which drug you're asking about. Which biologic should I check${payer ? ` for ${payer}` : ''}?`,
    widget: {
      type: 'coverage_intake_form',
      props: { prefillPayer: payer, prefillDrug: drug },
    },
    sideWidgets: [{
      type: 'supported_options_card',
      props: {
        requestedPayer: payer,
        requestedDrug: drug,
        supportedPayers: payers,
        supportedDrugs: drugs,
      },
    }],
    loaderStages: [],
    meta: {
      resolvedPayer: payer ?? null, resolvedDrug: drug ?? null,
      isIndexed: false, dataSource: 'manual_indexed',
      modelUsed: 'fallback', timestamp: new Date().toISOString(),
    },
  }
}

async function buildFallbackResponse(
  requestId: string,
  payer: string,
  drug: string,
  availablePayers: string[],
  availableDrugs: string[],
  message: string,
): Promise<AssistantResponse> {
  const payers = availablePayers.map(p => ({ id: p.toLowerCase().replace(/\s+/g, '_'), displayName: p }))
  const drugs = availableDrugs.map(d => ({ key: d.toLowerCase(), displayName: d }))
  return {
    requestId,
    intent: 'unsupported',
    assistantText: `${message} Here are the payer/drug combinations currently indexed — select one to continue.`,
    widget: {
      type: 'supported_options_card',
      props: {
        requestedPayer: payer,
        requestedDrug: drug,
        supportedPayers: payers,
        supportedDrugs: drugs,
      },
    },
    sideWidgets: [{ type: 'limitation_notice', props: {} }],
    loaderStages: buildFallbackLoaderStages(),
    meta: {
      resolvedPayer: payer, resolvedDrug: drug,
      isIndexed: false, dataSource: 'manual_indexed',
      modelUsed: 'fallback', timestamp: new Date().toISOString(),
    },
  }
}

async function buildCoverageResponse(
  requestId: string,
  policy: PolicyLookupFound,
  requestedPayer: string,
  requestedDrug: string,
  userMessage: string,
): Promise<AssistantResponse> {
  const blockers = buildBlockers(policy)
  const action = nextBestAction(policy)

  // 1. Try live web crawl + stored doc in parallel
  const [liveResult, docResult] = await Promise.all([
    getLivePolicyText(requestedPayer, requestedDrug),
    getDocumentText(policy.policy_id),
  ])

  // Prefer live crawl → stored raw_text → structured fields
  const rawText = liveResult.found && liveResult.text
    ? liveResult.text
    : docResult.rawText

  const sourceUrl = liveResult.url ?? docResult.sourceUri ?? ''
  const sourceLabel = liveResult.found
    ? `${policy.payer} (live — ${liveResult.source === 'pdf' ? 'PDF' : 'web'})`
    : (docResult.fileName?.replace(/\.[^.]+$/, '') ?? `${policy.payer} — ${policy.drug_display} Policy`)

  // 2. Analyze document (or structured fallback) with Claude
  const documentText = rawText ?? buildStructuredSummaryText(policy)
  const { analysis, modelUsed } = await analyzeDocumentWithClaude(userMessage, policy, documentText)
  const narrativeText = analysis.answer
  const citationList = analysis.citations

  // Evidence from Claude-extracted citations
  const evidence = citationList.slice(0, 5).map((c, i) => ({
    id: `cit-${i}`,
    quote: c.quote,
    sourceLabel,
    sourceUrl,
    effectiveDate: policy.effective_date,
    page: c.page ?? null,
    section: c.section ?? null,
  }))

  const primaryWidget: Widget = {
    type: 'coverage_report_hero',
    props: {
      payer: policy.payer,
      drug: policy.drug_display,
      coverageStatus: policy.coverage_status as any,
      paRequired: policy.pa_required,
      stepTherapyRequired: policy.step_therapy_required,
      effectiveDate: policy.effective_date,
      versionLabel: policy.version_label,
      shortTakeaway: narrativeText,
      frictionScore: policy.friction_score,
    },
  }

  const sideWidgets: Widget[] = [
    {
      type: 'blockers_and_requirements',
      props: { blockers, nextBestAction: action },
    },
  ]

  if (policy.site_of_care_restrictions.length > 0) {
    sideWidgets.push({
      type: 'site_of_care',
      props: { siteOfCare: policy.site_of_care_restrictions[0] },
    })
  }

  if (policy.biosimilars.length > 0 || policy.reference_product) {
    sideWidgets.push({
      type: 'preferred_alternative',
      props: {
        preferredProduct: policy.biosimilars[0] ?? null,
        nonPreferredProduct: policy.reference_product ?? null,
        biosimilars: policy.biosimilars,
        note: policy.preferred_product_notes[0] ?? null,
      },
    })
  }

  if (evidence.length > 0) {
    sideWidgets.push({
      type: 'evidence_drawer',
      props: {
        evidence,
        policyTitle: `${policy.payer} — ${policy.drug_display} (${policy.version_label})`,
      },
    })
  }

  sideWidgets.push({
    type: 'policy_snapshot_card',
    props: {
      payer: policy.payer,
      drugFamily: policy.drug_display,
      effectiveDate: policy.effective_date,
      versionLabel: policy.version_label,
      policyId: policy.policy_id,
      confidence: liveResult.found ? 'high' : rawText ? 'high' : 'medium',
      completenessNote: liveResult.found
        ? `Analysis grounded in live-crawled ${liveResult.source === 'pdf' ? 'PDF' : 'web'} document (${(liveResult.charCount / 1000).toFixed(0)}k chars). Does not guarantee reimbursement or PA outcome.`
        : rawText
          ? `Analysis grounded in indexed source document (${docResult.pageCount ?? '?'} pages). Does not guarantee reimbursement or PA outcome.`
          : 'Analysis based on extracted policy fields. Source document unavailable. Does not guarantee reimbursement or PA outcome.',
    },
  })

  sideWidgets.push({ type: 'limitation_notice', props: {} })

  return {
    requestId,
    intent: 'coverage_lookup',
    assistantText: narrativeText,
    widget: primaryWidget,
    sideWidgets,
    loaderStages: buildLookupLoaderStages(policy.payer, policy.drug_display),
    meta: {
      resolvedPayer: policy.payer,
      resolvedDrug: policy.drug_display,
      isIndexed: true,
      dataSource: 'manual_indexed',
      modelUsed,
      timestamp: new Date().toISOString(),
    },
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function orchestrate(req: AssistantRequest): Promise<AssistantResponse> {
  const requestId = randomUUID()

  // 1. Extract entities from message + context
  const payer = req.context?.payer ?? extractPayer(req.message)
  const drug = req.context?.drug ?? extractDrug(req.message)

  // 2. Detect intent
  const intent = detectIntent(req.message, payer, drug)

  if (intent === 'greeting') {
    return buildGreetingResponse(requestId)
  }

  if (intent === 'missing_drug') {
    return buildMissingFieldResponse(requestId, 'missing_drug', payer, drug)
  }

  if (intent === 'missing_payer') {
    return buildMissingFieldResponse(requestId, 'missing_payer', payer, drug)
  }

  if (intent === 'explore_drugs' || intent === 'compare_payers') {
    const { payers, drugs } = await getSupportedOptions().catch(() => ({ payers: [], drugs: [] }))
    return {
      requestId, intent,
      assistantText: intent === 'explore_drugs'
        ? `The indexed dataset covers ${drugs.length} drug families. Here's what's available.`
        : `The indexed dataset covers ${payers.length} payers. Select a payer and drug to check coverage.`,
      widget: {
        type: 'supported_options_card',
        props: {
          supportedPayers: payers,
          supportedDrugs: drugs,
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

  // 3. Coverage lookup — must have both payer and drug
  if (!payer || !drug) {
    return buildMissingFieldResponse(
      requestId,
      !payer ? 'missing_payer' : 'missing_drug',
      payer,
      drug,
    )
  }

  // Unknown / catch-all
  return buildGreetingResponse(requestId)
}

// ── Streaming plan — deterministic parts separated from text generation ───────

export interface StreamPlan {
  requestId: string
  intent: AssistantIntent
  /** Prompt to send to Bedrock for streaming. Null = use fallbackText directly. */
  narrativePrompt: string | null
  fallbackText: string
  widget: Widget | null
  sideWidgets: Widget[]
  loaderStages: LoaderStage[]
  meta: Omit<AssistantResponse['meta'], 'modelUsed'>
}

/**
 * Builds everything deterministically without calling Bedrock.
 * The caller is responsible for streaming the narrative text separately.
 */
export function orchestrateStream(req: AssistantRequest): StreamPlan {
  const requestId = randomUUID()
  const inputPayer = req.context?.payer ?? extractField(req.message, 'payer')
  const inputDrug = req.context?.drug ?? extractField(req.message, 'drug')
  const intent = detectIntent(req.message, { ...req.context, payer: inputPayer, drug: inputDrug })

  // ── Greeting ──
  if (intent === 'greeting') {
    const payers = policyRepository.listSupportedPayers()
    const drugs = policyRepository.listSupportedDrugs()
    return {
      requestId, intent,
      narrativePrompt: null,
      fallbackText: "Hi — happy to help you explore indexed medical-benefit drug policy coverage. I can check coverage criteria, blockers, and evidence for the payer/drug combinations in our current indexed dataset. What would you like to explore?",
      widget: { type: 'welcome_quick_actions', props: { supportedPayerCount: payers.length, supportedDrugCount: drugs.length } },
      sideWidgets: [],
      loaderStages: [],
      meta: { resolvedPayer: null, resolvedDrug: null, isIndexed: true, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
    }
  }

  // ── Missing fields ──
  if (intent === 'missing_payer' || intent === 'missing_drug') {
    const payers = policyRepository.listSupportedPayers()
    const drugs = policyRepository.listSupportedDrugs()
    const missingField = intent === 'missing_payer' ? 'payer' : 'drug'
    return {
      requestId, intent,
      narrativePrompt: null,
      fallbackText: intent === 'missing_payer'
        ? "I can look up indexed coverage — which payer would you like to check?"
        : "I can look up indexed coverage — which drug or biologic should I check?",
      widget: { type: 'coverage_intake_form', props: { prefillPayer: req.context?.payer, prefillDrug: req.context?.drug, prefillDiagnosis: req.context?.diagnosis } },
      sideWidgets: [{ type: 'supported_options_card', props: { requestedPayer: missingField === 'drug' ? req.context?.payer : undefined, requestedDrug: missingField === 'payer' ? req.context?.drug : undefined, supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })), supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })) } }],
      loaderStages: [],
      meta: { resolvedPayer: req.context?.payer ?? null, resolvedDrug: req.context?.drug ?? null, isIndexed: false, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
    }
  }

  // ── Explore / compare ──
  if (intent === 'explore_drugs' || intent === 'compare_payers') {
    const payers = policyRepository.listSupportedPayers()
    const drugs = policyRepository.listSupportedDrugs()
    return {
      requestId, intent,
      narrativePrompt: null,
      fallbackText: intent === 'explore_drugs'
        ? `The indexed dataset covers ${drugs.length} drug families. Here's what's available.`
        : `The indexed dataset covers ${payers.length} payers. Select a combination to explore coverage criteria.`,
      widget: { type: 'supported_options_card', props: { supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })), supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })) } },
      sideWidgets: [{ type: 'limitation_notice', props: {} }],
      loaderStages: [],
      meta: { resolvedPayer: null, resolvedDrug: null, isIndexed: true, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
    }
  }

  // ── Coverage lookup ──
  if (intent === 'coverage_lookup') {
    const resolvedPayer = inputPayer ? policyRepository.resolvePayer(inputPayer) : null
    const resolvedDrug = inputDrug ? policyRepository.resolveDrug(inputDrug) : null

    if (!resolvedPayer || !resolvedDrug) {
      const payers = policyRepository.listSupportedPayers()
      const drugs = policyRepository.listSupportedDrugs()
      const what = !resolvedPayer
        ? `"${inputPayer ?? 'that payer'}" is not in the indexed payer dataset`
        : `"${inputDrug ?? 'that drug'}" is not in the indexed drug dataset`
      return {
        requestId, intent: 'unsupported',
        narrativePrompt: null,
        fallbackText: `${what}. The indexed dataset covers ${payers.length} payers and ${drugs.length} drug families. Here's what's available.`,
        widget: { type: 'supported_options_card', props: { requestedPayer: inputPayer, requestedDrug: inputDrug, supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })), supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })) } },
        sideWidgets: [{ type: 'limitation_notice', props: {} }],
        loaderStages: buildGracefulLoaderStages(),
        meta: { resolvedPayer: resolvedPayer?.id ?? null, resolvedDrug: resolvedDrug?.key ?? null, isIndexed: false, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
      }
    }

    const details = policyRepository.getPolicyDetails(resolvedPayer.id, resolvedDrug.key)
    if (!details) {
      const payers = policyRepository.listSupportedPayers()
      const drugs = policyRepository.listSupportedDrugs()
      return {
        requestId, intent: 'unsupported',
        narrativePrompt: null,
        fallbackText: `The combination of ${resolvedPayer.displayName} + ${resolvedDrug.displayName} is not currently indexed.`,
        widget: { type: 'supported_options_card', props: { requestedPayer: resolvedPayer.displayName, requestedDrug: resolvedDrug.displayName, supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })), supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })) } },
        sideWidgets: [{ type: 'limitation_notice', props: {} }],
        loaderStages: buildGracefulLoaderStages(),
        meta: { resolvedPayer: resolvedPayer.id, resolvedDrug: resolvedDrug.key, isIndexed: false, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
      }
    }

    const related = policyRepository.getRelatedCombinations(resolvedPayer.id, resolvedDrug.key)
    const blockers = buildBlockers(details)
    const status = statusLabel(details.record.coverageStatus)
    const payerDisplay = resolvedPayer.displayName
    const drugDisplay = resolvedDrug.displayName

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

    const fallbackText = `Per the indexed policy snapshot, ${payerDisplay} covers ${drugDisplay} with ${details.record.paRequired ? 'prior authorization required' : 'no prior authorization required'}. ${details.record.stepTherapyRequired ? `Step therapy is required — failure of ${details.priorFailureRequirements.slice(0, 2).join(', ')} must be documented.` : ''} The best available indexed policy version is effective ${details.record.effectiveDate}.`

    const primaryWidget: Widget = {
      type: 'coverage_report_hero',
      props: {
        payer: payerDisplay, drug: drugDisplay,
        coverageStatus: details.record.coverageStatus,
        paRequired: details.record.paRequired,
        stepTherapyRequired: details.record.stepTherapyRequired,
        effectiveDate: details.record.effectiveDate,
        versionLabel: details.record.versionLabel,
        shortTakeaway: fallbackText, // will be replaced by streamed text on client
        frictionScore: details.frictionScore,
      },
    }

    const sideWidgets: Widget[] = [
      { type: 'blockers_and_requirements', props: { blockers, nextBestAction: details.nextBestAction } },
      { type: 'evidence_drawer', props: { evidence: details.evidence, policyTitle: `${payerDisplay} — ${drugDisplay} (${details.record.versionLabel})` } },
      { type: 'policy_snapshot_card', props: { payer: payerDisplay, drugFamily: drugDisplay, effectiveDate: details.record.effectiveDate, versionLabel: details.record.versionLabel, policyId: details.record.policyId, confidence: 'high', completenessNote: 'Based on indexed policy snapshot. Does not guarantee reimbursement or PA outcome.' } },
      { type: 'related_actions', props: { payerId: resolvedPayer.id, drugKey: resolvedDrug.key, relatedCombinations: related } },
      { type: 'limitation_notice', props: {} },
    ]

    if (details.siteOfCare) sideWidgets.splice(1, 0, { type: 'site_of_care', props: { siteOfCare: details.siteOfCare } })

    const biosimilars = details.record.raw.biosimilars ?? []
    const referenceProduct = details.record.raw.reference_product ?? null
    if (biosimilars.length > 0 || referenceProduct) {
      const biosimilarNote = details.record.raw.clinical_criteria?.additional_notes?.find(n => /biosimilar|non-preferred|preferred/i.test(n)) ?? null
      sideWidgets.splice(2, 0, { type: 'preferred_alternative', props: { preferredProduct: biosimilars[0] ?? null, nonPreferredProduct: biosimilars.length > 0 ? referenceProduct : null, biosimilars, note: biosimilarNote } })
    }

    const sameDrugRelated = related.filter(r => r.drug.key === resolvedDrug.key)
    if (sameDrugRelated.length > 0) sideWidgets.splice(-2, 0, { type: 'mini_comparison', props: { drugDisplay, combinations: sameDrugRelated } })

    return {
      requestId, intent: 'coverage_lookup',
      narrativePrompt,
      fallbackText,
      widget: primaryWidget,
      sideWidgets,
      loaderStages: buildIndexedLoaderStages(payerDisplay, drugDisplay),
      meta: { resolvedPayer: payerDisplay, resolvedDrug: drugDisplay, isIndexed: true, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
    }
  }

  // ── Fallback ──
  const payers = policyRepository.listSupportedPayers()
  const drugs = policyRepository.listSupportedDrugs()
  return {
    requestId, intent: 'greeting',
    narrativePrompt: null,
    fallbackText: "Hi — happy to help you explore indexed medical-benefit drug policy coverage. What would you like to explore?",
    widget: { type: 'welcome_quick_actions', props: { supportedPayerCount: payers.length, supportedDrugCount: drugs.length } },
    sideWidgets: [],
    loaderStages: [],
    meta: { resolvedPayer: null, resolvedDrug: null, isIndexed: true, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
  }
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

  // 5. Not found — show fallback
  if (!lookupResult.found) {
    return buildFallbackResponse(
      requestId,
      lookupResult.requested_payer,
      lookupResult.requested_drug,
      lookupResult.available_payers,
      lookupResult.available_drugs,
      lookupResult.message,
    )
  }

  // 6. Fetch document + analyze with Claude
  return buildCoverageResponse(requestId, lookupResult, payer, drug, req.message)
}
