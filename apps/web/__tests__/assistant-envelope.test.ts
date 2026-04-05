// ─────────────────────────────────────────────────────────────────────────────
// Tests: assistant response envelope shape validation
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the bedrock module so tests don't need AWS credentials
vi.mock('../lib/bedrock', () => ({
  callBedrock: vi.fn().mockResolvedValue('Mocked narrative text.'),
  isBedrockConfigured: vi.fn().mockReturnValue(false),
}))

vi.mock('../lib/bedrock-stream', () => ({
  callBedrockStream: vi.fn().mockResolvedValue(''),
}))

// Live crawl hits the real API with a long timeout — stub so tests stay fast.
vi.mock('../lib/policy/db-repository', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/policy/db-repository')>()
  return {
    ...mod,
    getLivePolicyText: vi.fn().mockResolvedValue({
      found: false,
      url: null,
      text: null,
      charCount: 0,
      source: null,
    }),
  }
})

import { orchestrate } from '../lib/assistant-orchestrator'

describe('orchestrate — conversational (no Bedrock in tests)', () => {
  it('routes short greetings to general path (unknown intent), no canned widget', async () => {
    const response = await orchestrate({ message: 'hi' })
    expect(response.intent).toBe('unknown')
    expect(response.widget).toBeNull()
    expect(response.assistantText).toBeTruthy()
    expect(response.requestId).toBeTruthy()
    expect(response.meta.dataSource).toBe('manual_indexed')
    expect(response.meta.modelUsed).toBe('fallback')
  })

  it('handles hello, hey, good morning as conversational', async () => {
    for (const greeting of ['hello', 'hey', 'good morning']) {
      const res = await orchestrate({ message: greeting })
      expect(res.intent).toBe('unknown')
      expect(res.widget).toBeNull()
    }
  })
})

describe('orchestrate — coverage lookup (indexed)', () => {
  it('returns coverage_report_hero for UHC + infliximab', async () => {
    const response = await orchestrate({
      message: 'Check coverage for infliximab under UHC',
      context: { payer: 'UnitedHealthcare', drug: 'Infliximab' },
    })
    expect(response.intent).toBe('coverage_lookup')
    expect(response.widget?.type).toBe('coverage_report_hero')
    expect(response.meta.isIndexed).toBe(true)
    expect(response.loaderStages.length).toBeGreaterThan(0)
    expect(response.sideWidgets.length).toBeGreaterThan(0)
    // Should have blockers, evidence, snapshot, related
    const widgetTypes = response.sideWidgets.map(w => w.type)
    expect(widgetTypes).toContain('blockers_and_requirements')
    expect(widgetTypes).toContain('evidence_drawer')
    expect(widgetTypes).toContain('limitation_notice')
  })

  it('returns coverage_report_hero for Cigna + rituximab', async () => {
    const response = await orchestrate({
      message: 'Cigna rituximab coverage',
      context: { payer: 'Cigna', drug: 'Rituximab' },
    })
    expect(response.intent).toBe('coverage_lookup')
    expect(response.widget?.type).toBe('coverage_report_hero')
  })

  it('resolves brand name: Remicade → infliximab', async () => {
    const response = await orchestrate({
      message: 'Coverage for Remicade under Aetna',
      context: { payer: 'Aetna', drug: 'Remicade' },
    })
    expect(response.widget?.type).toBe('coverage_report_hero')
  })
})

describe('orchestrate — unsupported / unindexed', () => {
  it('returns supported_options_card for unknown payer', async () => {
    const response = await orchestrate({
      message: 'Check Humana coverage for infliximab',
      context: { payer: 'Humana', drug: 'infliximab' },
    })
    expect(response.intent).toBe('unsupported')
    expect(response.widget?.type).toBe('supported_options_card')
    expect(response.meta.isIndexed).toBe(false)
  })

  it('returns supported_options_card for unknown drug', async () => {
    const response = await orchestrate({
      message: 'Check UHC coverage for Humira',
      context: { payer: 'UHC', drug: 'Humira' },
    })
    expect(response.widget?.type).toBe('supported_options_card')
    expect(response.meta.isIndexed).toBe(false)
  })
})

describe('orchestrate — missing fields (LLM path in prod)', () => {
  it('does not use template intake widget when only payer is given', async () => {
    const response = await orchestrate({
      message: 'What does Aetna cover?',
      context: { payer: 'Aetna' },
    })
    expect(response.intent).toBe('missing_drug')
    expect(response.widget).toBeNull()
    expect(response.assistantText).toBeTruthy()
  })
})

describe('orchestrate — explore and compare', () => {
  it('handles "what drugs are indexed" via general assistant', async () => {
    const response = await orchestrate({ message: 'What drugs are in the indexed dataset?' })
    expect(response.intent).toBe('explore_drugs')
    expect(response.widget).toBeNull()
    expect(response.assistantText).toBeTruthy()
  })

  it('handles "compare payers" via general assistant', async () => {
    const response = await orchestrate({ message: 'Compare all payers' })
    expect(response.intent).toBe('compare_payers')
    expect(response.widget).toBeNull()
    expect(response.assistantText).toBeTruthy()
  })
})

describe('response envelope invariants', () => {
  it('always has requestId, intent, assistantText, meta', async () => {
    for (const msg of ['hi', 'infliximab UHC', 'Humana Humira', 'what drugs']) {
      const res = await orchestrate({ message: msg })
      expect(res.requestId).toBeTruthy()
      expect(res.intent).toBeTruthy()
      expect(res.assistantText).toBeTruthy()
      expect(res.meta.dataSource).toBe('manual_indexed')
      expect(res.meta.timestamp).toBeTruthy()
    }
  })

  it('never returns model-generated HTML', async () => {
    const res = await orchestrate({
      message: 'Coverage for infliximab under UHC',
      context: { payer: 'UHC', drug: 'infliximab' },
    })
    // assistantText should be plain text, not HTML
    expect(res.assistantText).not.toMatch(/<[a-z][\s\S]*>/i)
  })
})
