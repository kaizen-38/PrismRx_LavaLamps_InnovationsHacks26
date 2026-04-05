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
  type LivePolicyResult,
  type PolicyLookupFound,
} from '@/lib/policy/db-repository'
import type {
  AssistantRequest,
  AssistantResponse,
  AssistantIntent,
  Widget,
  LoaderStage,
  BlockerItem,
  PayerDrugMatrixRow,
} from '@/lib/assistant-types'
import type { PolicyDetails } from '@/lib/policy/repository'
import type { CoverageStatus } from '@/lib/types'

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
  [/\b(ozempic|wegovy|rybelsus|semaglutide)\b/i, 'semaglutide'],
  [/\b(mounjaro|zepbound|tirzepatide)\b/i, 'tirzepatide'],
  [/\b(trulicity|dulaglutide)\b/i, 'dulaglutide'],
  [/\b(humira|adalimumab)\b/i, 'adalimumab'],
  [/\b(dupixent|dupilumab)\b/i, 'dupilumab'],
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

/** Words that must not be treated as a drug when inferring from coverage-style phrasing. */
const INFER_DRUG_STOPWORDS = new Set([
  'care', 'health', 'united', 'uhc', 'insurance', 'plan', 'plans', 'the', 'drug', 'drugs',
  'medication', 'medications', 'biologic', 'biologics', 'payer', 'payers', 'policy', 'policies',
  'does', 'will', 'would', 'should', 'could', 'about', 'regarding', 'supports', 'support',
  'supporting', 'cover', 'coverage', 'covered', 'check', 'checking', 'asking', 'tell', 'know',
  'want', 'like', 'need', 'help', 'please', 'thanks', 'thank', 'for', 'with', 'this', 'that',
  'have', 'has', 'had', 'any', 'some', 'your', 'you', 'me', 'my', 'are', 'is', 'was', 'were',
  'can', 'may', 'not', 'under', 'what', 'which', 'how', 'when', 'where', 'who', 'why', 'prior',
  'authorization', 'authorisation', 'auth', 'step', 'therapy', 'therapies', 'included', 'include',
  'medicare', 'medicaid', 'commercial', 'benefits', 'benefit', 'pa', 'criteria', 'requirements',
])

/**
 * When the drug is not in DRUG_PATTERNS, infer a candidate from common question shapes
 * (e.g. "does UHC support ozempic") so we still run coverage_lookup + live web fallback.
 */
function inferDrugNameFromMessage(message: string): string | undefined {
  const INFER_DRUG_REGEXES: RegExp[] = [
    /\bsupports?\s+([a-z][a-z0-9-]{2,})\b/gi,
    /\bsupporting\s+([a-z][a-z0-9-]{2,})\b/gi,
    /\bcover(?:s|age)?\s+for\s+([a-z][a-z0-9-]{2,})\b/gi,
    /\bcover(?:s|age)?\s+([a-z][a-z0-9-]{2,})\b/gi,
    /\bprior\s+auth(?:orization|orisation)?\s+for\s+([a-z][a-z0-9-]{2,})\b/gi,
    /\b(?:is|are|was|were)\s+([a-z][a-z0-9-]{2,})\s+covered\b/gi,
    /\b([a-z][a-z0-9-]{2,})\s+(?:covered|included)\s+by\b/gi,
    /\bfor\s+([a-z][a-z0-9-]{2,})\s*[\s?.!]*$/i,
  ]

  for (const re of INFER_DRUG_REGEXES) {
    const r = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = r.exec(message)) !== null) {
      const raw = m[1]
      const low = raw.toLowerCase()
      if (INFER_DRUG_STOPWORDS.has(low)) continue
      if (PAYER_PATTERNS.some(([p]) => p.test(raw))) continue
      return raw.length <= 4 ? raw.toUpperCase() : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    }
  }
  return undefined
}

function resolveUserDrug(message: string, contextDrug?: string): string | undefined {
  const fromCtx = contextDrug?.trim()
  if (fromCtx) return fromCtx
  const fromPatterns = extractDrug(message)
  if (fromPatterns) return fromPatterns
  return inferDrugNameFromMessage(message)
}

// ── Intent detection ──────────────────────────────────────────────────────────

/** User wants the same drug compared across indexed payers (matrix), not a single-payer lookup. */
function wantsDrugPayerMatrixCompare(message: string): boolean {
  const m = message.toLowerCase()
  const mentionsPayers = /\bpayers?\b/.test(m) || /\bacross\s+payers?\b/.test(m)
  if (!mentionsPayers) return false
  if (/\bcompare\b/.test(m) && /\bfor\b/.test(m)) return true
  if (/\bcompare\s+coverage\b/.test(m)) return true
  if (/\bacross\s+(?:all\s+)?payers?\b/.test(m)) return true
  if (/\bwhich\s+payers?\s+(cover|covers|have|offer)\b/.test(m)) return true
  if (/\bside[\s-]by[\s-]side\b/.test(m)) return true
  return false
}

function detectIntent(
  message: string,
  payer: string | undefined,
  drug: string | undefined,
): AssistantIntent {
  const m = message.toLowerCase().trim()

  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|howdy|sup|yo|greetings)[\s!?.]*$/.test(m)
  if (isGreeting) return 'greeting'

  if (wantsDrugPayerMatrixCompare(message)) {
    const d = drug || inferDrugNameFromMessage(message)
    if (d) return 'payer_matrix_compare'
    return 'missing_drug'
  }

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

function buildLiveWebLoaderStages(): LoaderStage[] {
  return [
    { id: 'live_search', label: 'Searching the web for payer policy documents…', durationMs: 1400 },
    { id: 'live_extract', label: 'Extracting policy text from the source…', durationMs: 1000 },
    { id: 'live_summarize', label: 'Preparing a grounded summary…', durationMs: 700 },
  ]
}

function buildMatrixCompareLoaderStages(drug: string): LoaderStage[] {
  return [
    { id: 'm1', label: `Loading indexed policies for ${drug}…`, durationMs: 500 },
    { id: 'm2', label: 'Building payer × coverage matrix…', durationMs: 700 },
    { id: 'm3', label: 'Attaching policy citations per payer…', durationMs: 600 },
    { id: 'm4', label: 'Synthesizing comparison narrative…', durationMs: 550 },
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

function coverageStatusLabel(status: CoverageStatus): string {
  switch (status) {
    case 'covered':
      return 'Covered'
    case 'conditional':
      return 'Conditional coverage'
    case 'preferred':
      return 'Preferred'
    case 'nonpreferred':
      return 'Non-preferred'
    case 'not_covered':
      return 'Not covered'
    case 'unclear':
      return 'Unclear'
    default:
      return String(status)
  }
}

/** Blockers for manual PolicyDetails / PolicyDNA (stream path). */
function buildBlockersFromDetails(details: PolicyDetails): BlockerItem[] {
  const blockers: BlockerItem[] = []
  const raw = details.record.raw
  const op = raw.operational_rules

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
      value: details.priorFailureRequirements.slice(0, 2).join(' | '),
      type: 'step_therapy',
      severity: 'hard',
    })
  }

  const site = details.siteOfCare ?? op.site_of_care
  if (site) {
    blockers.push({
      label: 'Site-of-Care Restriction',
      value: site,
      type: 'site_of_care',
      severity: 'soft',
    })
  }

  const specialty = details.specialtyRequired ?? raw.clinical_criteria.specialty_required
  if (specialty) {
    blockers.push({
      label: 'Specialist Required',
      value: specialty,
      type: 'specialist',
      severity: 'soft',
    })
  }

  if (op.renewal_interval_days != null && op.renewal_interval_days < 365) {
    blockers.push({
      label: 'Reauthorization',
      value: `Renewal approximately every ${op.renewal_interval_days} days`,
      type: 'reauth',
      severity: 'info',
    })
  }

  const labs = raw.clinical_criteria.lab_requirements ?? []
  if (labs.length > 0) {
    blockers.push({
      label: 'Lab / Biomarker Requirements',
      value: labs.slice(0, 2).join(' | '),
      type: 'lab',
      severity: 'soft',
    })
  }

  const biosimilarNote = raw.clinical_criteria.additional_notes?.find(n =>
    /biosimilar|non-preferred|preferred/i.test(n),
  )
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

  // 1. Extract entities from message + context (infer drug from phrasing when not in pattern list)
  const payer = req.context?.payer?.trim() || extractPayer(req.message) || undefined
  const drug = resolveUserDrug(req.message, req.context?.drug)

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
  /**
   * When the static index cannot answer, the respond route may call the live policy API
   * using these strings before streaming (see enrichStreamPlanWithLive).
   */
  liveFallbackQuery?: { payer: string; drug: string; userMessage: string }
  /**
   * Compare same drug across payers using live web fetch per payer (drug not in index or no indexed rows).
   * Filled in orchestrateStream; resolved in enrichStreamPlanWithPayerMatrixLive.
   */
  payerLiveMatrixQuery?: { drugDisplay: string; userMessage: string }
  /** Overrides default streaming system prompt (e.g. live web excerpt grounding). */
  streamSystemPrompt?: string
  streamMaxTokens?: number
}

/** System prompt for Bedrock when narrative is grounded in a live web/PDF excerpt. */
export const STREAM_LIVE_WEB_SYSTEM_PROMPT = `You are PrismRx's medical benefit drug policy assistant. The user message includes text from a LIVE web or PDF policy fetch - not PrismRx's static indexed dataset. You may say the answer is based on a live web excerpt. Ground every factual coverage or prior-authorization claim ONLY in that excerpt. If the excerpt does not answer the question, say so clearly. Write 2-5 sentences for a healthcare professional, calm and precise. Ask the reader to verify on the payer's official site. You may use brief GitHub-flavored markdown when it helps (**bold**, short lists).`

/** Multi-payer comparison: several excerpts in one prompt. */
export const STREAM_LIVE_MATRIX_SYSTEM_PROMPT = `${STREAM_LIVE_WEB_SYSTEM_PROMPT}

You are answering a cross-payer comparison. Several labeled excerpts follow (one per payer). Compare access or coverage themes only using those excerpts. If an excerpt is missing, short, or off-topic for that payer, say so for that payer only. Do not assume parity across payers when excerpts differ in depth. Write 5-10 sentences; brief markdown lists are OK.`

const MIN_LIVE_POLICY_CHARS = 80
const MAX_LIVE_EXCERPT_CHARS = 45_000
const LIVE_PANEL_EXCERPT_CHARS = 1200

function formatLiveSourceSummary(url: string | null, source: 'pdf' | 'html' | null): string {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, '')
    } catch {
      /* ignore */
    }
  }
  if (source === 'pdf') return 'PDF document'
  if (source === 'html') return 'HTML page'
  return 'Web search'
}

export async function enrichStreamPlanWithLive(plan: StreamPlan): Promise<StreamPlan> {
  const q = plan.liveFallbackQuery
  if (!q || !q.payer.trim() || !q.drug.trim()) return plan

  try {
    const live = await getLivePolicyText(q.payer.trim(), q.drug.trim())
    const text = (live.text ?? '').trim()
    if (!live.found || text.length < MIN_LIVE_POLICY_CHARS) return plan

    const excerpt =
      text.length > MAX_LIVE_EXCERPT_CHARS
        ? `${text.slice(0, MAX_LIVE_EXCERPT_CHARS)}\n\n[Excerpt truncated for length]`
        : text
    const urlLine = live.url
      ? `Source URL: ${live.url}`
      : 'Source: web search (URL was not returned — verify on the official payer site).'
    const fmt = live.source ?? 'unknown'

    const narrativePrompt = `USER QUESTION:\n${q.userMessage}\n\n---\nBelow is text retrieved via LIVE web search for ${q.payer} + ${q.drug}. It may be incomplete, outdated, or from an unofficial page.\n${urlLine}\nFormat: ${fmt}\nApprox. character count: ${live.charCount}\n\nPOLICY EXCERPT:\n${excerpt}\n---\nAnswer the user's question using ONLY the excerpt. If the excerpt is insufficient, say what is missing.`

    const fallbackText = `A live web policy excerpt was retrieved (${live.charCount.toLocaleString()} characters) for ${q.payer} + ${q.drug}. ${live.url ? `Source: ${live.url}. ` : ''}An automated summary could not be generated — review the payer's official policy to verify coverage.`

    const sourceSummary = formatLiveSourceSummary(live.url, live.source)
    const panelExcerpt = text.slice(0, LIVE_PANEL_EXCERPT_CHARS).trim()
    const excerptQuote =
      panelExcerpt + (text.length > LIVE_PANEL_EXCERPT_CHARS ? '\n\n[Truncated in this panel — full excerpt was sent to the model.]' : '')

    const liveHero: Widget = {
      type: 'coverage_report_hero',
      props: {
        payer: q.payer,
        drug: q.drug,
        coverageStatus: 'unclear',
        paRequired: false,
        stepTherapyRequired: false,
        effectiveDate: 'Confirm effective dates on the payer site',
        versionLabel: sourceSummary,
        shortTakeaway:
          `Live policy text was retrieved for this payer and drug (not from PrismRx's static index). Read the chat summary for the model's grounded answer; use Open source or the evidence panel to verify.`,
        frictionScore: 50,
        reportSource: 'live_web',
        liveSourceUrl: live.url,
        liveExcerptFormat: live.source,
        liveCharCount: live.charCount,
      },
    }

    return {
      ...plan,
      narrativePrompt,
      fallbackText,
      streamSystemPrompt: STREAM_LIVE_WEB_SYSTEM_PROMPT,
      streamMaxTokens: 1536,
      widget: liveHero,
      sideWidgets: [
        {
          type: 'evidence_drawer',
          props: {
            policyTitle: `${q.payer} — ${q.drug} · Live excerpt`,
            evidence: [
              {
                id: 'live-excerpt',
                quote: excerptQuote,
                sourceLabel: sourceSummary,
                sourceUrl: live.url ?? '',
                effectiveDate: '',
                page: null,
                section: 'Retrieved policy text',
              },
            ],
          },
        },
        {
          type: 'limitation_notice',
          props: {
            datasetNote: live.url
              ? `Live web fetch — verify on the payer site · ${live.url}`
              : 'Live web search — excerpt may be incomplete; confirm on the payer\'s official site.',
          },
        },
      ],
      loaderStages: buildLiveWebLoaderStages(),
      meta: {
        ...plan.meta,
        isIndexed: false,
        dataSource: 'live_web',
        resolvedPayer: q.payer,
        resolvedDrug: q.drug,
        timestamp: new Date().toISOString(),
      },
      liveFallbackQuery: undefined,
    }
  } catch (e) {
    console.error('[enrichStreamPlanWithLive]', e)
    return plan
  }
}

const MAX_LIVE_EXCERPT_PER_PAYER_MATRIX = 5_500

export async function enrichStreamPlanWithPayerMatrixLive(plan: StreamPlan): Promise<StreamPlan> {
  const q = plan.payerLiveMatrixQuery
  if (!q?.drugDisplay?.trim()) return plan

  const drugDisplay = q.drugDisplay.trim()
  const drugKey =
    drugDisplay
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'unknown_drug'

  try {
    const payers = policyRepository.listSupportedPayers()
    const results = await Promise.all(
      payers.map(async p => {
        const live = await getLivePolicyText(p.displayName, drugDisplay)
        return { p, live }
      }),
    )

    type Bundle = { row: PayerDrugMatrixRow; text: string; live: LivePolicyResult }
    const bundles: Bundle[] = []

    for (const { p, live } of results) {
      const text = (live.text ?? '').trim()
      if (!live.found || text.length < MIN_LIVE_POLICY_CHARS) continue

      const sourceSummary = formatLiveSourceSummary(live.url, live.source)
      const panelQuote =
        text.slice(0, LIVE_PANEL_EXCERPT_CHARS).trim() +
        (text.length > LIVE_PANEL_EXCERPT_CHARS
          ? '\n\n[Truncated in panel — full text used for model.]'
          : '')

      bundles.push({
        row: {
          payerId: p.id,
          payerDisplay: p.displayName,
          coverageStatus: 'unclear',
          paRequired: false,
          stepTherapyRequired: false,
          frictionScore: 0,
          effectiveDate: 'Verify on payer site',
          versionLabel: sourceSummary,
          policyId: live.url ?? 'live-web',
          nextBestActionShort: 'Live web excerpt — verify on official payer policy.',
          rowSource: 'live_web',
          evidence: [
            {
              id: `live-matrix-${p.id}-${drugKey}`,
              quote: panelQuote,
              sourceLabel: sourceSummary,
              sourceUrl: live.url ?? '',
              effectiveDate: '',
              page: null,
              section: 'Live policy excerpt',
            },
          ],
        },
        text,
        live,
      })
    }

    bundles.sort((a, b) => a.row.payerDisplay.localeCompare(b.row.payerDisplay))
    const liveRows = bundles.map(b => b.row)

    if (liveRows.length === 0) {
      const drugs = policyRepository.listSupportedDrugs()
      return {
        ...plan,
        payerLiveMatrixQuery: undefined,
        narrativePrompt: null,
        fallbackText: `No usable live policy text was found for "${drugDisplay}" across payer web searches (minimum ${MIN_LIVE_POLICY_CHARS} characters per hit). Try a different spelling, the generic name (e.g. eculizumab for Soliris), or pick an indexed drug family.`,
        widget: {
          type: 'supported_options_card',
          props: {
            requestedDrug: drugDisplay,
            supportedPayers: payers.map(x => ({ id: x.id, displayName: x.displayName })),
            supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })),
          },
        },
        sideWidgets: [
          {
            type: 'limitation_notice',
            props: { datasetNote: 'Live web search did not return sufficient text for a matrix row for any payer.' },
          },
        ],
        loaderStages: buildGracefulLoaderStages(),
        meta: {
          ...plan.meta,
          resolvedPayer: 'All indexed payers',
          resolvedDrug: drugDisplay,
          isIndexed: false,
          dataSource: 'live_web',
          timestamp: new Date().toISOString(),
        },
      }
    }

    const narrativeBlocks = bundles
      .map(({ row, text, live }) => {
        const chunk =
          text.length > MAX_LIVE_EXCERPT_PER_PAYER_MATRIX
            ? `${text.slice(0, MAX_LIVE_EXCERPT_PER_PAYER_MATRIX)}\n[Truncated]`
            : text
        return `### ${row.payerDisplay}\nSource URL: ${live.url ?? 'not recorded'}\nFormat: ${live.source ?? 'unknown'}\nApprox. chars: ${live.charCount}\n\n${chunk}`
      })
      .join('\n\n---\n\n')

    const narrativePrompt = `USER QUESTION:\n${q.userMessage}\n\n---\nYou are given LIVE web-retrieved policy excerpts for "${drugDisplay}" — one block per payer. This is NOT PrismRx's static index. Excerpts may be wrong page, outdated, or incomplete.\n\n${narrativeBlocks}\n---\nCompare payers using ONLY these excerpts. Note gaps where an excerpt is thin or off-topic. Tell the user the matrix lists verbatim quotes and links per payer.`

    const fallbackText = `Live web excerpts for ${drugDisplay} from ${liveRows.length} payer searches are shown in the comparison matrix. Open **Citations** on each row for quotes and source links; the chat summary compares themes grounded only in those excerpts.`

    const matrixWidget: Widget = {
      type: 'payer_drug_matrix',
      props: {
        drugDisplay,
        drugKey,
        rows: liveRows,
        matrixSource: 'live_web',
      },
    }

    return {
      ...plan,
      payerLiveMatrixQuery: undefined,
      narrativePrompt,
      fallbackText,
      streamSystemPrompt: STREAM_LIVE_MATRIX_SYSTEM_PROMPT,
      streamMaxTokens: 2048,
      widget: matrixWidget,
      sideWidgets: [
        {
          type: 'limitation_notice',
          props: {
            datasetNote:
              'Live multi-payer web fetch — quality varies by payer. Confirm every detail on the payer\'s official formulary or medical policy.',
          },
        },
      ],
      loaderStages: buildLiveWebLoaderStages(),
      meta: {
        ...plan.meta,
        resolvedPayer: 'All indexed payers',
        resolvedDrug: drugDisplay,
        isIndexed: false,
        dataSource: 'live_web',
        timestamp: new Date().toISOString(),
      },
    }
  } catch (e) {
    console.error('[enrichStreamPlanWithPayerMatrixLive]', e)
    return {
      ...plan,
      payerLiveMatrixQuery: undefined,
      narrativePrompt: null,
      fallbackText: 'Something went wrong while fetching live payer comparisons. Try again, or use a drug from the indexed list.',
      widget: plan.widget,
      streamSystemPrompt: undefined,
      streamMaxTokens: undefined,
    }
  }
}

/**
 * Builds everything deterministically without calling Bedrock.
 * The caller is responsible for streaming the narrative text separately.
 */
export function orchestrateStream(req: AssistantRequest): StreamPlan {
  const requestId = randomUUID()
  const inputPayer = req.context?.payer?.trim() || extractPayer(req.message) || undefined
  const inputDrug = resolveUserDrug(req.message, req.context?.drug)
  const intent = detectIntent(req.message, inputPayer, inputDrug)

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

  // ── Same drug, all payers — comparison matrix + narrative (indexed or live web) ──
  if (intent === 'payer_matrix_compare') {
    const rawDrug = inputDrug?.trim()
    if (!rawDrug) {
      const payers = policyRepository.listSupportedPayers()
      const drugs = policyRepository.listSupportedDrugs()
      return {
        requestId,
        intent: 'missing_drug',
        narrativePrompt: null,
        fallbackText: 'Which drug should I compare across payers? For example: “compare payers for infliximab” or “compare payers for Soliris”.',
        widget: { type: 'coverage_intake_form', props: { prefillPayer: req.context?.payer, prefillDrug: undefined, prefillDiagnosis: req.context?.diagnosis } },
        sideWidgets: [{ type: 'supported_options_card', props: { supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })), supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })) } }],
        loaderStages: [],
        meta: { resolvedPayer: null, resolvedDrug: null, isIndexed: false, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
      }
    }

    const resolvedDrug = policyRepository.resolveDrug(inputDrug!)
    const payers = policyRepository.listSupportedPayers()
    const rows: PayerDrugMatrixRow[] = []

    if (resolvedDrug) {
      for (const p of payers) {
        const details = policyRepository.getPolicyDetails(p.id, resolvedDrug.key)
        if (!details) continue
        const nba = details.nextBestAction
        rows.push({
          payerId: p.id,
          payerDisplay: p.displayName,
          coverageStatus: details.record.coverageStatus,
          paRequired: details.record.paRequired,
          stepTherapyRequired: details.record.stepTherapyRequired,
          frictionScore: details.frictionScore,
          effectiveDate: details.record.effectiveDate,
          versionLabel: details.record.versionLabel,
          policyId: details.record.policyId,
          nextBestActionShort: nba.length > 140 ? `${nba.slice(0, 137)}…` : nba,
          evidence: details.evidence,
          rowSource: 'indexed',
        })
      }
    }

    const drugLabelForLive = resolvedDrug?.displayName ?? rawDrug

    if (rows.length === 0) {
      return {
        requestId,
        intent: 'payer_matrix_compare',
        narrativePrompt: null,
        fallbackText: `Searching the web for "${drugLabelForLive}" under each indexed payer name — this may take a moment…`,
        widget: null,
        sideWidgets: [],
        payerLiveMatrixQuery: { drugDisplay: drugLabelForLive, userMessage: req.message },
        loaderStages: [
          { id: 'lmx1', label: `Live search: ${drugLabelForLive} × each payer…`, durationMs: 2200 },
          { id: 'lmx2', label: 'Building comparison matrix from excerpts…', durationMs: 900 },
          { id: 'lmx3', label: 'Attaching citations per payer…', durationMs: 700 },
        ],
        streamSystemPrompt: STREAM_LIVE_MATRIX_SYSTEM_PROMPT,
        streamMaxTokens: 2048,
        meta: {
          resolvedPayer: 'All indexed payers',
          resolvedDrug: drugLabelForLive,
          isIndexed: false,
          dataSource: 'live_web',
          timestamp: new Date().toISOString(),
        },
      }
    }

    const drugDisplay = resolvedDrug!.displayName
    const summaryLines = rows.map(
      r =>
        `${r.payerDisplay}: coverage=${r.coverageStatus}, PA=${r.paRequired}, step_therapy=${r.stepTherapyRequired}, friction=${r.frictionScore}, effective=${r.effectiveDate}, policy_id=${r.policyId}`,
    ).join('\n')

    const narrativePrompt = `The user asked to compare indexed payers for the same drug: ${drugDisplay}.
Below is a factual summary line per payer from PrismRx's indexed policy snapshot (do not invent or extend beyond these facts):

${summaryLines}

Write 4-7 sentences for a healthcare professional comparing access burden across payers (prior auth, step therapy, friction scores where notable). Mention that the UI matrix lists verbatim **citations** per payer with source links. Use brief markdown if helpful. If two payers look similar on these fields, say so.`

    const fallbackText = `Indexed comparison for ${drugDisplay} across ${rows.length} payers is shown in the matrix. Expand **Citations** on each row for policy quotes and links; the chat summary highlights where PA, step therapy, or friction differ materially.`

    const matrixWidget: Widget = {
      type: 'payer_drug_matrix',
      props: { drugDisplay, drugKey: resolvedDrug!.key, rows, matrixSource: 'indexed' },
    }

    return {
      requestId,
      intent: 'payer_matrix_compare',
      narrativePrompt,
      fallbackText,
      widget: matrixWidget,
      sideWidgets: [{ type: 'limitation_notice', props: {} }],
      loaderStages: buildMatrixCompareLoaderStages(drugDisplay),
      meta: {
        resolvedPayer: 'All indexed payers',
        resolvedDrug: drugDisplay,
        isIndexed: true,
        dataSource: 'manual_indexed',
        timestamp: new Date().toISOString(),
      },
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
      const rawPayer = inputPayer?.trim()
      const rawDrug = inputDrug?.trim()
      const liveFallbackQuery =
        rawPayer && rawDrug
          ? { payer: rawPayer, drug: rawDrug, userMessage: req.message }
          : undefined
      return {
        requestId, intent: 'unsupported',
        narrativePrompt: null,
        fallbackText: `${what}. The indexed dataset covers ${payers.length} payers and ${drugs.length} drug families. Here's what's available.`,
        widget: { type: 'supported_options_card', props: { requestedPayer: inputPayer, requestedDrug: inputDrug, supportedPayers: payers.map(p => ({ id: p.id, displayName: p.displayName })), supportedDrugs: drugs.map(d => ({ key: d.key, displayName: d.displayName })) } },
        sideWidgets: [{ type: 'limitation_notice', props: {} }],
        loaderStages: buildGracefulLoaderStages(),
        meta: { resolvedPayer: resolvedPayer?.id ?? null, resolvedDrug: resolvedDrug?.key ?? null, isIndexed: false, dataSource: 'manual_indexed', timestamp: new Date().toISOString() },
        liveFallbackQuery,
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
        liveFallbackQuery: {
          payer: resolvedPayer.displayName,
          drug: resolvedDrug.displayName,
          userMessage: req.message,
        },
      }
    }

    const related = policyRepository.getRelatedCombinations(resolvedPayer.id, resolvedDrug.key)
    const blockers = buildBlockersFromDetails(details)
    const status = coverageStatusLabel(details.record.coverageStatus)
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
Use language like "per the indexed policy snapshot" and be factual and concise. You may use brief markdown (**bold**, short lists) if it improves clarity.`

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
