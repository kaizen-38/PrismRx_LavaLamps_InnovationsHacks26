// ─────────────────────────────────────────────────────────────────────────────
// Tests: ManualPolicyRepository — lookup, indexed branching, evidence, related
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { ManualPolicyRepository } from '../lib/policy/manual-repository'

const repo = new ManualPolicyRepository()

describe('listSupportedPayers', () => {
  it('returns all 5 payers', () => {
    const payers = repo.listSupportedPayers()
    expect(payers).toHaveLength(5)
    const ids = payers.map(p => p.id)
    expect(ids).toContain('uhc')
    expect(ids).toContain('aetna')
    expect(ids).toContain('cigna')
    expect(ids).toContain('bsca')
    expect(ids).toContain('anthem')
  })
})

describe('listSupportedDrugs', () => {
  it('returns all indexed drug families', () => {
    const drugs = repo.listSupportedDrugs()
    expect(drugs.length).toBeGreaterThanOrEqual(5)
    const keys = drugs.map(d => d.key)
    expect(keys).toContain('infliximab')
    expect(keys).toContain('rituximab')
    expect(keys).toContain('vedolizumab')
    expect(keys).toContain('tocilizumab_iv')
    expect(keys).toContain('ocrelizumab')
  })
})

describe('resolvePayer', () => {
  it('resolves known payer aliases', () => {
    expect(repo.resolvePayer('UHC')?.id).toBe('uhc')
    expect(repo.resolvePayer('Cigna')?.id).toBe('cigna')
    expect(repo.resolvePayer('Aetna')?.id).toBe('aetna')
  })

  it('returns null for unknown payer', () => {
    expect(repo.resolvePayer('Humana')).toBeNull()
  })
})

describe('resolveDrug', () => {
  it('resolves brand names', () => {
    expect(repo.resolveDrug('Remicade')?.key).toBe('infliximab')
    expect(repo.resolveDrug('Rituxan')?.key).toBe('rituximab')
    expect(repo.resolveDrug('Entyvio')?.key).toBe('vedolizumab')
  })

  it('returns null for unknown drug', () => {
    expect(repo.resolveDrug('Humira')).toBeNull()
  })
})

describe('findCoverageRecord — indexed lookup', () => {
  it('finds UHC + infliximab (supported combination)', () => {
    const record = repo.findCoverageRecord('uhc', 'infliximab')
    expect(record).not.toBeNull()
    expect(record?.payer.id).toBe('uhc')
    expect(record?.drug.key).toBe('infliximab')
    expect(record?.matchConfidence).toBe('exact')
    expect(record?.coverageStatus).toBeDefined()
  })

  it('finds Cigna + rituximab', () => {
    const record = repo.findCoverageRecord('cigna', 'rituximab')
    expect(record).not.toBeNull()
    expect(record?.payer.id).toBe('cigna')
  })

  it('finds Aetna + ocrelizumab', () => {
    const record = repo.findCoverageRecord('aetna', 'ocrelizumab')
    expect(record).not.toBeNull()
  })

  it('returns null for unindexed combination', () => {
    const record = repo.findCoverageRecord('humana', 'infliximab')
    expect(record).toBeNull()
  })
})

describe('getPolicyDetails', () => {
  it('returns full details for UHC + infliximab', () => {
    const details = repo.getPolicyDetails('uhc', 'infliximab')
    expect(details).not.toBeNull()
    expect(details?.frictionScore).toBeGreaterThan(0)
    expect(details?.nextBestAction).toBeTruthy()
    expect(Array.isArray(details?.priorFailureRequirements)).toBe(true)
    expect(Array.isArray(details?.evidence)).toBe(true)
  })

  it('returns null for unindexed payer+drug', () => {
    const details = repo.getPolicyDetails('humana', 'infliximab')
    expect(details).toBeNull()
  })
})

describe('getEvidence', () => {
  it('returns evidence citations for indexed combination', () => {
    const evidence = repo.getEvidence('aetna', 'infliximab')
    expect(evidence.length).toBeGreaterThan(0)
    const first = evidence[0]
    expect(first.quote).toBeTruthy()
    expect(first.sourceLabel).toBeTruthy()
    expect(first.effectiveDate).toBeTruthy()
  })

  it('returns empty array for unindexed combination', () => {
    const evidence = repo.getEvidence('humana', 'infliximab')
    expect(evidence).toEqual([])
  })
})

describe('getRelatedCombinations', () => {
  it('returns related combos for UHC + infliximab (other payers for infliximab + other drugs for UHC)', () => {
    const related = repo.getRelatedCombinations('uhc', 'infliximab')
    expect(related.length).toBeGreaterThan(0)
    // Should not include uhc+infliximab itself
    const selfRef = related.find(r => r.payer.id === 'uhc' && r.drug.key === 'infliximab')
    expect(selfRef).toBeUndefined()
  })
})
