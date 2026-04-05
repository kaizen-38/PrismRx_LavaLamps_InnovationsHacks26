// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Assistant orchestrator (SERVER SIDE ONLY)
// Flow: entity extraction → DB lookup → (if missing: live web fetch) → Claude on document text → widgets
// Answers are grounded in live-fetched or stored policy text — Claude does not invent coverage facts.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto'
import { callBedrock, isBedrockConfigured } from '@/lib/bedrock'
import {
  lookupPolicy,
  getSupportedOptions,
  getDocumentText,
  getLivePolicyText,
  type PolicyLookupFound,
  type LivePolicyResult,
  type PolicyDocument,
} from '@/lib/policy/db-repository'
import type {
  AssistantRequest,
  AssistantResponse,
  AssistantIntent,
  Widget,
  LoaderStage,
  BlockerItem,
} from '@/lib/assistant-types'
import { compileAssistantGraph } from '@/lib/assistant-graph'
import {
  buildDocumentAnalysisUserPrompt,
  buildDocumentStreamingUserPrompt,
  buildGeneralAssistantUserContent,
  DOC_ANALYSIS_SYSTEM,
  DOC_ANALYSIS_STREAMING_SYSTEM,
  GENERAL_ASSISTANT_SYSTEM,
} from '@/lib/assistant-prompts'
import { getAssistStreamContext } from '@/lib/assistant-stream-context'
import { callBedrockStream } from '@/lib/bedrock-stream'

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

  /** Short pleasantries only — route to conversational model, not policy lookup. */
  const isPureGreeting =
    /^(hi|hello|hey|good morning|good afternoon|howdy|sup|yo|greetings)[\s!?.]*$/.test(m)
  if (isPureGreeting) return 'unknown'

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

  // If we have both from context and the message isn't a pure pleasantry, treat as lookup / follow-up
  if (payer && drug) return 'coverage_lookup'

  return 'unknown'
}

// ── Loader stages ─────────────────────────────────────────────────────────────

function buildLookupLoaderStages(payer: string, drug: string): LoaderStage[] {
  return [
    { id: 'understand', label: 'Understanding your request…', durationMs: 500 },
    { id: 'lookup', label: `Searching DB for ${payer} / ${drug} policy…`, durationMs: 600 },
    { id: 'search', label: 'Searching web for policy document…', durationMs: 1500 },
    { id: 'crawl', label: 'Crawling and extracting document text…', durationMs: 2000 },
    { id: 'analyze', label: 'Analyzing document with Claude…', durationMs: 1200 },
    { id: 'cite', label: 'Extracting citations from document…', durationMs: 500 },
    { id: 'assemble', label: 'Assembling interactive report…', durationMs: 400 },
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

interface ClaudeDocAnalysis {
  answer: string
  citations: Array<{ page: number | null; section: string; quote: string; confidence: number }>
}

// Max chars to send to Claude (~100k chars ≈ 25k tokens, well within 200k context)
const MAX_DOC_CHARS = 100_000

/** Ignore whitespace-only or trivial extractions (not a real policy body). */
const MIN_USABLE_DOC_CHARS = 80

function usableExtractedText(t: string | null | undefined): string | null {
  const s = t?.trim() ?? ''
  return s.length >= MIN_USABLE_DOC_CHARS ? s : null
}

async function analyzeDocumentWithClaude(
  userMessage: string,
  policy: PolicyLookupFound,
  documentText: string,
  hasFullDocumentText: boolean,
): Promise<{ analysis: ClaudeDocAnalysis; modelUsed: 'bedrock' | 'fallback' }> {
  const truncated = documentText.length > MAX_DOC_CHARS
    ? documentText.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated for length]'
    : documentText

  const prompt = buildDocumentAnalysisUserPrompt({
    userMessage,
    policy: {
      payer: policy.payer,
      drug_display: policy.drug_display,
      effective_date: policy.effective_date,
      version_label: policy.version_label,
    },
    truncatedDocumentText: truncated,
    hasFullDocumentText,
  })

  if (!isBedrockConfigured()) {
    return { analysis: buildFallbackAnalysis(policy, hasFullDocumentText), modelUsed: 'fallback' }
  }

  const streamCtx = getAssistStreamContext()
  if (streamCtx?.onDelta) {
    const streamUser = buildDocumentStreamingUserPrompt({
      userMessage,
      policy: {
        payer: policy.payer,
        drug_display: policy.drug_display,
        effective_date: policy.effective_date,
        version_label: policy.version_label,
      },
      truncatedDocumentText: truncated,
      hasFullDocumentText,
    })
    try {
      const streamed = await callBedrockStream(
        [{ role: 'user', content: streamUser }],
        DOC_ANALYSIS_STREAMING_SYSTEM,
        1400,
        60_000,
        streamCtx.onDelta,
      )
      const answer = streamed.trim() || buildFallbackAnalysis(policy, hasFullDocumentText).answer
      return { analysis: { answer, citations: [] }, modelUsed: 'bedrock' }
    } catch {
      return { analysis: buildFallbackAnalysis(policy, hasFullDocumentText), modelUsed: 'fallback' }
    }
  }

  try {
    const raw = await callBedrock(
      [{ role: 'user', content: prompt }],
      DOC_ANALYSIS_SYSTEM,
      1400,
      60_000, // 60s timeout for large documents
    )
    const cleaned = raw.replace(/```json?|```/g, '').trim()
    const parsed: ClaudeDocAnalysis = JSON.parse(cleaned)
    return { analysis: parsed, modelUsed: 'bedrock' }
  } catch {
    return { analysis: buildFallbackAnalysis(policy, hasFullDocumentText), modelUsed: 'fallback' }
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

function drugDisplayName(drugKey: string): string {
  return drugKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Placeholder policy when the DB has no row but we still analyze a live-fetched document */
function syntheticPolicyForLive(payer: string, drugKey: string): PolicyLookupFound {
  const display = drugDisplayName(drugKey)
  return {
    found: true,
    policy_id: '__live_only__',
    payer,
    drug_family: drugKey,
    drug_display: display,
    drug_short: drugKey,
    reference_product: '',
    biosimilars: [],
    coverage_status: 'unclear',
    pa_required: false,
    step_therapy_required: false,
    effective_date: '—',
    version_label: 'Live web document',
    friction_score: 50,
    drug_names: [],
    hcpcs_codes: [],
    covered_indications: [],
    step_therapy_requirements: [],
    diagnosis_requirements: [],
    lab_or_biomarker_requirements: [],
    prescriber_requirements: [],
    site_of_care_restrictions: [],
    dose_frequency_rules: [],
    reauthorization_rules: [],
    preferred_product_notes: [],
    exclusions: [],
    citations: [],
  }
}

function buildFallbackAnalysis(
  policy: PolicyLookupFound,
  hasFullDocumentText: boolean,
): ClaudeDocAnalysis {
  const hasStructuredSignal =
    policy.coverage_status !== 'unclear' ||
    policy.pa_required ||
    policy.step_therapy_required ||
    (policy.covered_indications?.length ?? 0) > 0 ||
    (policy.citations?.length ?? 0) > 0

  if (!hasFullDocumentText && !hasStructuredSignal) {
    return {
      answer:
        `I don't have enough to go on here—there's no policy document text and no structured coverage fields for ${policy.payer} and ${policy.drug_display} in what we pulled. I'd need a real policy excerpt or an indexed record before I can say anything useful.`,
      citations: [],
    }
  }

  const statusText = {
    covered: 'covered',
    conditional: 'covered with conditions',
    preferred: 'a preferred agent',
    nonpreferred: 'covered but non-preferred',
    not_covered: 'not covered',
    unclear: 'unclear coverage status',
  }[policy.coverage_status] ?? policy.coverage_status

  const paText = policy.pa_required
    ? 'Prior authorization looks required on this record.'
    : 'This snapshot doesn’t flag prior auth, but confirm on the official policy.'
  const stepText = policy.step_therapy_required
    ? 'Step therapy appears to apply—make sure prior failures or trials are documented if you’re pursuing PA.'
    : ''

  const docNote = hasFullDocumentText
    ? ''
    : " I'm working from extracted policy fields only (we don't have the full PDF in this run), so treat this as a summary, not the final word."
  const answer =
    `For ${policy.payer} and ${policy.drug_display}, the indexed data shows ${statusText}.${docNote} ${paText} ${stepText} Effective date on file: ${policy.effective_date}.`.trim()

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
  if (policy.policy_id === '__live_only__') {
    return 'Cross-check this summary with the payer’s official policy; it was retrieved via web search, not the indexed dataset.'
  }
  if (!policy.pa_required) return 'No prior authorization required — proceed with prescribing.'
  if (policy.step_therapy_required) return 'Document prior therapy failures before submitting PA request.'
  return 'Submit prior authorization with clinical documentation per policy criteria.'
}

// ── Response builders ─────────────────────────────────────────────────────────

function metaForGeneralTurn(
  payer: string | undefined,
  drug: string | undefined,
  modelUsed: 'bedrock' | 'fallback',
): AssistantResponse['meta'] {
  return {
    resolvedPayer: payer ?? null,
    resolvedDrug: drug ?? null,
    isIndexed: true,
    dataSource: 'manual_indexed',
    modelUsed,
    timestamp: new Date().toISOString(),
  }
}

/** Bedrock-backed chat when no indexed policy lookup is triggered. */
async function runGeneralAssistant(
  requestId: string,
  req: AssistantRequest,
  payer: string | undefined,
  drug: string | undefined,
  intent: AssistantIntent,
): Promise<AssistantResponse> {
  const userContent = buildGeneralAssistantUserContent({ req, payer, drug })

  const shell: Pick<AssistantResponse, 'intent' | 'widget' | 'sideWidgets' | 'loaderStages'> = {
    intent,
    widget: null,
    sideWidgets: [],
    loaderStages: [],
  }

  if (!isBedrockConfigured()) {
    return {
      requestId,
      ...shell,
      assistantText:
        'Conversational replies need Amazon Bedrock configured on the server (AWS_BEARER_TOKEN_BEDROCK). For a document-backed coverage readout, pick payer and drug in the workspace and ask something specific—e.g. "Does UnitedHealthcare cover infliximab?"',
      meta: metaForGeneralTurn(payer, drug, 'fallback'),
    }
  }

  const streamCtx = getAssistStreamContext()
  if (streamCtx?.onDelta) {
    try {
      const text = await callBedrockStream(
        [{ role: 'user', content: userContent }],
        GENERAL_ASSISTANT_SYSTEM,
        900,
        30_000,
        streamCtx.onDelta,
      )
      const assistantText = text.trim() || 'Sorry—I could not generate a reply. Please try again.'
      return {
        requestId,
        ...shell,
        assistantText,
        meta: metaForGeneralTurn(payer, drug, 'bedrock'),
      }
    } catch {
      return {
        requestId,
        ...shell,
        assistantText: 'Something went wrong reaching the model. Please try again in a moment.',
        meta: metaForGeneralTurn(payer, drug, 'fallback'),
      }
    }
  }

  try {
    const text = await callBedrock(
      [{ role: 'user', content: userContent }],
      GENERAL_ASSISTANT_SYSTEM,
      900,
      30_000,
    )
    const assistantText = text.trim() || 'Sorry—I could not generate a reply. Please try again.'
    return {
      requestId,
      ...shell,
      assistantText,
      meta: metaForGeneralTurn(payer, drug, 'bedrock'),
    }
  } catch {
    return {
      requestId,
      ...shell,
      assistantText: 'Something went wrong reaching the model. Please try again in a moment.',
      meta: metaForGeneralTurn(payer, drug, 'fallback'),
    }
  }
}

function liveSearchUserHint(live?: {
  attempted: boolean
  httpStatus?: number
  fetchFailed?: boolean
}): { sentence: string; datasetNote?: string } {
  if (!live?.attempted) return { sentence: '' }
  if (live.fetchFailed) {
    return {
      sentence:
        " I couldn't reach the live policy search service from the app (network hiccup or timeout).",
      datasetNote:
        'The assistant could not call GET /api/policy/live. Ensure the API is running and set API_URL on the Next.js server if it is not on 127.0.0.1:8000.',
    }
  }
  if (live.httpStatus === 404) {
    return {
      sentence:
        ' The live search endpoint isn’t on this API build (404)—a restart with the latest backend usually fixes that.',
      datasetNote:
        'The running API is missing GET /api/policy/live. Stop uvicorn, pull latest code, and start again.',
    }
  }
  if (live.httpStatus && live.httpStatus >= 400) {
    return { sentence: ` Live web search failed (HTTP ${live.httpStatus}).` }
  }
  return {
    sentence:
      ' I ran a web search but couldn’t pull readable policy text—wrong hit, login wall, or empty page.',
    datasetNote:
      'Web search and download are best-effort. Try a supported indexed combination, or retry later.',
  }
}

async function buildFallbackResponse(
  requestId: string,
  payer: string,
  drug: string,
  availablePayers: string[],
  availableDrugs: string[],
  message: string,
  liveAttempt?: { attempted: boolean; httpStatus?: number; fetchFailed?: boolean },
): Promise<AssistantResponse> {
  const payers = availablePayers.map(p => ({ id: p.toLowerCase().replace(/\s+/g, '_'), displayName: p }))
  const drugs = availableDrugs.map(d => ({ key: d.toLowerCase(), displayName: d }))
  const { sentence, datasetNote } = liveSearchUserHint(liveAttempt)
  const refusal =
    "I'm not seeing a policy PDF or clean extracted text I can trust for that payer and drug, so I can't give you a grounded answer yet."
  return {
    requestId,
    intent: 'unsupported',
    assistantText: `${refusal} ${message}${sentence} Here are combinations we do have in the index—pick one if you want a document-backed readout.`,
    widget: {
      type: 'supported_options_card',
      props: {
        requestedPayer: payer,
        requestedDrug: drug,
        supportedPayers: payers,
        supportedDrugs: drugs,
      },
    },
    sideWidgets: [{ type: 'limitation_notice', props: datasetNote ? { datasetNote } : {} }],
    loaderStages: buildFallbackLoaderStages(),
    meta: {
      resolvedPayer: payer, resolvedDrug: drug,
      isIndexed: false, dataSource: 'manual_indexed',
      modelUsed: 'fallback', timestamp: new Date().toISOString(),
    },
  }
}

async function buildCoverageFromSources(
  requestId: string,
  policy: PolicyLookupFound,
  requestedPayer: string,
  requestedDrug: string,
  userMessage: string,
  liveResult: LivePolicyResult,
  docResult: PolicyDocument,
  coverageMeta: { isIndexed: boolean; dataSource: 'manual_indexed' | 'live_web' },
): Promise<AssistantResponse> {
  const blockers = buildBlockers(policy)
  const action = nextBestAction(policy)

  const liveText = usableExtractedText(liveResult.found ? liveResult.text : null)
  const storedText = usableExtractedText(docResult.rawText ?? null)
  const rawText = liveText ?? storedText
  const hasFullDocumentText = Boolean(rawText)

  const sourceUrl = liveResult.url ?? docResult.sourceUri ?? ''
  const sourceLabel = liveResult.found
    ? `${policy.payer} (live — ${liveResult.source === 'pdf' ? 'PDF' : 'web'})`
    : (docResult.fileName?.replace(/\.[^.]+$/, '') ?? `${policy.payer} — ${policy.drug_display} Policy`)

  const documentText = rawText ?? buildStructuredSummaryText(policy)
  const { analysis, modelUsed } = await analyzeDocumentWithClaude(
    userMessage,
    policy,
    documentText,
    hasFullDocumentText,
  )
  const narrativeText = analysis.answer
  let citationList = analysis.citations.filter(c => (c.quote ?? '').trim().length > 0)
  if (citationList.length === 0 && policy.citations?.length) {
    citationList = policy.citations.map(c => ({
      page: c.page,
      section: c.section,
      quote: c.quote,
      confidence: c.confidence,
    }))
  }

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

  let completenessNote: string
  if (!coverageMeta.isIndexed && liveResult.found) {
    completenessNote =
      `No indexed policy for this payer/drug pair. Analysis uses a live-fetched ${liveResult.source === 'pdf' ? 'PDF' : 'web'} document (~${(liveResult.charCount / 1000).toFixed(0)}k chars). Verify against the payer. Does not guarantee reimbursement or PA outcome.`
  } else if (liveResult.found) {
    completenessNote =
      `Analysis grounded in live-crawled ${liveResult.source === 'pdf' ? 'PDF' : 'web'} document (${(liveResult.charCount / 1000).toFixed(0)}k chars). Does not guarantee reimbursement or PA outcome.`
  } else if (rawText) {
    completenessNote =
      `Analysis grounded in indexed source document (${docResult.pageCount ?? '?'} pages). Does not guarantee reimbursement or PA outcome.`
  } else {
    completenessNote =
      'No full policy PDF text is available; the assistant used extracted database fields only. If those fields do not answer your question, the information may not be available here. Does not guarantee reimbursement or PA outcome.'
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
      completenessNote,
    },
  })

  sideWidgets.push({ type: 'limitation_notice', props: {} })

  return {
    requestId,
    intent: 'coverage_lookup',
    assistantText: narrativeText,
    widget: primaryWidget,
    sideWidgets,
    loaderStages: getAssistStreamContext()?.onDelta
      ? []
      : buildLookupLoaderStages(policy.payer, policy.drug_display),
    meta: {
      resolvedPayer: policy.payer,
      resolvedDrug: policy.drug_display,
      isIndexed: coverageMeta.isIndexed,
      dataSource: coverageMeta.dataSource,
      modelUsed,
      timestamp: new Date().toISOString(),
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
  const [liveResult, docResult] = await Promise.all([
    getLivePolicyText(requestedPayer, requestedDrug),
    getDocumentText(policy.policy_id),
  ])
  return buildCoverageFromSources(
    requestId,
    policy,
    requestedPayer,
    requestedDrug,
    userMessage,
    liveResult,
    docResult,
    { isIndexed: true, dataSource: 'manual_indexed' },
  )
}

/** When the DB has no row, analyze using an already-fetched live crawl result */
async function buildLiveOnlyFromResult(
  requestId: string,
  payer: string,
  drug: string,
  userMessage: string,
  liveResult: LivePolicyResult,
): Promise<AssistantResponse | null> {
  if (!liveResult.found || !usableExtractedText(liveResult.text)) return null

  const synthetic = syntheticPolicyForLive(payer, drug)
  const emptyDoc: PolicyDocument = {
    rawText: null,
    fileName: null,
    sourceUri: null,
    pageCount: null,
  }
  return buildCoverageFromSources(
    requestId,
    synthetic,
    payer,
    drug,
    userMessage,
    liveResult,
    emptyDoc,
    { isIndexed: false, dataSource: 'live_web' },
  )
}

// ── Main orchestrator (LangGraph routes intent → one terminal node) ───────────

async function runCoveragePipeline(
  requestId: string,
  req: AssistantRequest,
  payer: string,
  drug: string,
): Promise<AssistantResponse> {
  let lookupResult
  try {
    lookupResult = await lookupPolicy(payer, drug)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return {
      requestId,
      intent: 'unknown',
      assistantText: `I had trouble reaching the policy database (${msg}). Please try again.`,
      widget: null,
      sideWidgets: [],
      loaderStages: [],
      meta: {
        resolvedPayer: payer,
        resolvedDrug: drug,
        isIndexed: false,
        dataSource: 'manual_indexed',
        modelUsed: 'fallback',
        timestamp: new Date().toISOString(),
      },
    }
  }

  if (!lookupResult.found) {
    const liveResult = await getLivePolicyText(
      lookupResult.requested_payer,
      lookupResult.requested_drug,
    )
    const liveResponse = await buildLiveOnlyFromResult(
      requestId,
      lookupResult.requested_payer,
      lookupResult.requested_drug,
      req.message,
      liveResult,
    )
    if (liveResponse) return liveResponse

    return buildFallbackResponse(
      requestId,
      lookupResult.requested_payer,
      lookupResult.requested_drug,
      lookupResult.available_payers,
      lookupResult.available_drugs,
      lookupResult.message,
      {
        attempted: true,
        httpStatus: liveResult.httpStatus,
        fetchFailed: liveResult.fetchFailed,
      },
    )
  }

  return buildCoverageResponse(requestId, lookupResult, payer, drug, req.message)
}

let compiledAssistantGraph: ReturnType<typeof compileAssistantGraph> | null = null

function getAssistantGraph() {
  if (!compiledAssistantGraph) {
    compiledAssistantGraph = compileAssistantGraph({
      parseState: req => {
        const payer = req.context?.payer ?? extractPayer(req.message)
        const drug = req.context?.drug ?? extractDrug(req.message)
        const intent = detectIntent(req.message, payer, drug)
        return { payer, drug, intent }
      },
      runGeneral: runGeneralAssistant,
      runCoverage: runCoveragePipeline,
    })
  }
  return compiledAssistantGraph
}

export async function orchestrate(req: AssistantRequest): Promise<AssistantResponse> {
  const requestId = randomUUID()
  const out = await getAssistantGraph().invoke({
    req,
    requestId,
  })
  if (!out.response) throw new Error('Assistant graph produced no response')
  return out.response
}
