// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Payer and drug alias normalization
// Maps user-supplied strings (brand names, aliases, misspellings) to canonical ids.
// ─────────────────────────────────────────────────────────────────────────────

// ── Payer alias map ───────────────────────────────────────────────────────────
// Key: canonical payer id (matches PAYERS keys in mock-data.ts)

export const PAYER_ALIAS_MAP: Record<string, string[]> = {
  aetna: [
    'aetna', 'aetna inc', 'aetna health', 'aetna insurance',
  ],
  uhc: [
    'uhc', 'united', 'unitedhealthcare', 'unitedhealth', 'united health',
    'united healthcare', 'united health care', 'unitedhealthgroup',
    'optum', 'uhg',
  ],
  bsca: [
    'bsca', 'blue shield', 'blue shield ca', 'blue shield california',
    'blueshield', 'blueshield california', 'blueshield ca',
    'blue shield of california', 'bs ca',
  ],
  anthem: [
    'anthem', 'anthem blue cross', 'anthem bluecross', 'elevance',
    'elevance health', 'anthem bcbs', 'anthem inc',
  ],
  cigna: [
    'cigna', 'cigna health', 'cigna healthcare', 'cigna evernorth',
    'evernorth', 'cigna group',
  ],
}

// ── Drug alias map ────────────────────────────────────────────────────────────
// Key: canonical drug key (matches DrugFamily.key in mock-data.ts)

export const DRUG_ALIAS_MAP: Record<string, string[]> = {
  infliximab: [
    'infliximab', 'remicade', 'inflectra', 'renflexis', 'avsola',
    'infliximab-axxq', 'infliximab-dyyb', 'infliximab-abda',
    'ifx', 'tnf inhibitor infliximab', 'anti-tnf infliximab',
    'biosimilar infliximab',
  ],
  rituximab: [
    'rituximab', 'rituxan', 'truxima', 'ruxience', 'riabni',
    'rtx', 'anti-cd20 rituximab', 'rituximab biosimilar',
  ],
  vedolizumab: [
    'vedolizumab', 'entyvio', 'vdz',
    'alpha-4 beta-7', 'anti-integrin',
  ],
  tocilizumab_iv: [
    'tocilizumab', 'tocilizumab iv', 'actemra', 'tyenne',
    'tcz', 'il-6 inhibitor', 'anti-il6', 'anti-il-6',
  ],
  ocrelizumab: [
    'ocrelizumab', 'ocrevus', 'ocr',
    'anti-cd20 ocrelizumab', 'ms biologic',
  ],
}

// ── Normalization helpers ─────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Returns the canonical payer id for a user-supplied string, or null. */
export function normalizePayer(input: string): string | null {
  const n = normalize(input)
  if (n.length < 2) return null
  // Exact match first
  for (const [canonical, aliases] of Object.entries(PAYER_ALIAS_MAP)) {
    if (aliases.some(a => normalize(a) === n)) return canonical
  }
  // Partial match fallback (only for inputs >= 4 chars to avoid false positives)
  if (n.length >= 4) {
    for (const [canonical, aliases] of Object.entries(PAYER_ALIAS_MAP)) {
      if (aliases.some(a => { const an = normalize(a); return an.length >= 4 && (an.includes(n) || n.includes(an)) })) {
        return canonical
      }
    }
  }
  return null
}

/** Returns the canonical drug key for a user-supplied string, or null. */
export function normalizeDrug(input: string): string | null {
  const n = normalize(input)
  if (n.length < 3) return null
  // Exact match first
  for (const [canonical, aliases] of Object.entries(DRUG_ALIAS_MAP)) {
    if (aliases.some(a => normalize(a) === n)) return canonical
  }
  // Partial match fallback (only for inputs >= 5 chars)
  if (n.length >= 5) {
    for (const [canonical, aliases] of Object.entries(DRUG_ALIAS_MAP)) {
      if (aliases.some(a => { const an = normalize(a); return an.length >= 5 && (an.includes(n) || n.includes(an)) })) {
        return canonical
      }
    }
  }
  return null
}
