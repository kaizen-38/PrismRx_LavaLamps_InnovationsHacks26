// ─────────────────────────────────────────────────────────────────────────────
// Tests: payer and drug normalization
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { normalizePayer, normalizeDrug } from '../lib/policy/normalization'

describe('normalizePayer', () => {
  it('resolves UHC aliases', () => {
    expect(normalizePayer('UHC')).toBe('uhc')
    expect(normalizePayer('UnitedHealthcare')).toBe('uhc')
    expect(normalizePayer('united health care')).toBe('uhc')
    expect(normalizePayer('United')).toBe('uhc')
  })

  it('resolves Aetna', () => {
    expect(normalizePayer('Aetna')).toBe('aetna')
    expect(normalizePayer('AETNA')).toBe('aetna')
    expect(normalizePayer('aetna health')).toBe('aetna')
  })

  it('resolves Blue Shield', () => {
    expect(normalizePayer('Blue Shield CA')).toBe('bsca')
    expect(normalizePayer('Blue Shield California')).toBe('bsca')
    expect(normalizePayer('BlueShield')).toBe('bsca')
  })

  it('resolves Cigna', () => {
    expect(normalizePayer('Cigna')).toBe('cigna')
    expect(normalizePayer('cigna healthcare')).toBe('cigna')
    expect(normalizePayer('Evernorth')).toBe('cigna')
  })

  it('resolves Anthem', () => {
    expect(normalizePayer('Anthem')).toBe('anthem')
    expect(normalizePayer('Elevance Health')).toBe('anthem')
  })

  it('returns null for unknown payer', () => {
    expect(normalizePayer('Humana')).toBeNull()
    expect(normalizePayer('')).toBeNull()
    expect(normalizePayer('some random string xyz')).toBeNull()
  })
})

describe('normalizeDrug', () => {
  it('resolves infliximab and brand names', () => {
    expect(normalizeDrug('infliximab')).toBe('infliximab')
    expect(normalizeDrug('Remicade')).toBe('infliximab')
    expect(normalizeDrug('Inflectra')).toBe('infliximab')
    expect(normalizeDrug('Avsola')).toBe('infliximab')
    expect(normalizeDrug('Renflexis')).toBe('infliximab')
  })

  it('resolves rituximab and biosimilars', () => {
    expect(normalizeDrug('rituximab')).toBe('rituximab')
    expect(normalizeDrug('Rituxan')).toBe('rituximab')
    expect(normalizeDrug('Truxima')).toBe('rituximab')
    expect(normalizeDrug('Ruxience')).toBe('rituximab')
  })

  it('resolves vedolizumab', () => {
    expect(normalizeDrug('vedolizumab')).toBe('vedolizumab')
    expect(normalizeDrug('Entyvio')).toBe('vedolizumab')
  })

  it('resolves tocilizumab', () => {
    expect(normalizeDrug('tocilizumab')).toBe('tocilizumab_iv')
    expect(normalizeDrug('Actemra')).toBe('tocilizumab_iv')
  })

  it('resolves ocrelizumab', () => {
    expect(normalizeDrug('ocrelizumab')).toBe('ocrelizumab')
    expect(normalizeDrug('Ocrevus')).toBe('ocrelizumab')
  })

  it('returns null for unknown drug', () => {
    expect(normalizeDrug('Humira')).toBeNull()
    expect(normalizeDrug('')).toBeNull()
    expect(normalizeDrug('aspirin')).toBeNull()
  })
})
