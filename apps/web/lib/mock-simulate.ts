// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Mock simulation results
// Used as fallback when backend /api/simulate is unavailable.
// Covers 3 payers × 2 scenarios for demo purposes.
// ─────────────────────────────────────────────────────────────────────────────

import type { SimulationResult, SimulationCase } from './types'

// ── Scenario A: Infliximab / RA / good prior therapy history ─────────────────
// Patient has failed MTX → one blocker (site of care) → mostly approvable

export const MOCK_SIM_RESULTS_GOOD: SimulationResult[] = [
  {
    case_id: 'mock_case_good_aetna',
    drug_key: 'infliximab',
    payer_id: 'aetna',
    payer_name: 'Aetna',
    coverage_status: 'conditional',
    fit_score: 74,
    blockers: [
      {
        type: 'wrong_care_setting',
        severity: 'soft',
        description: 'Aetna requires infusion in an outpatient infusion center or physician office. Hospital outpatient setting requires a separate site-of-care exception.',
        resolution: 'Switch site of care to outpatient infusion center or submit Aetna site-of-care exception form alongside PA.',
        citation: {
          id: 'cite_ifx_aetna_2',
          page: 5,
          section: '2.3 Site of Care',
          quote: 'Infusion of infliximab in a hospital outpatient setting requires prior authorization and demonstration that lower-cost settings are not medically appropriate.',
          source_label: 'Aetna Clinical Policy Bulletin: Infliximab (CPB #0208)',
          source_url: 'https://www.aetna.com/cpb/medical/data/200_299/0208.html',
          effective_date: '2024-10-01',
        },
      },
    ],
    next_best_action: 'Submit PA with MTX failure documentation and TB test. Request infusion center instead of hospital outpatient to avoid site-of-care exception.',
    pa_summary: 'Patient meets step-therapy requirements (MTX ≥3 months, one additional csDMARD). PA likely approvable with complete documentation. Site-of-care exception needed only if hospital setting is required.',
    evidence_checklist: [
      'Methotrexate trial documentation (≥3 months duration)',
      'Second csDMARD failure documentation',
      'QuantiFERON or TST result (negative)',
      'Baseline LFTs within 3 months',
      'Rheumatologist prescriber attestation',
      'Biosimilar selection note (Inflectra, Renflexis, or Avsola)',
    ],
  },
  {
    case_id: 'mock_case_good_uhc',
    drug_key: 'infliximab',
    payer_id: 'uhc',
    payer_name: 'UnitedHealthcare',
    coverage_status: 'conditional',
    fit_score: 81,
    blockers: [],
    next_best_action: 'Proceed with PA submission. Include MTX failure documentation, TB screen, and CBC. Request biosimilar per UHC Biosimilar Initiative.',
    pa_summary: 'Patient meets UHC step therapy requirements (MTX ≥3 months). No hard blockers identified. Complete PA submission with standard documentation set should achieve approval.',
    evidence_checklist: [
      'Methotrexate trial documentation (≥3 months duration)',
      'Negative TB screening (QuantiFERON or TST)',
      'CBC within 6 months',
      'Rheumatologist / specialty confirmation',
      'Biosimilar infliximab specified on order',
    ],
  },
  {
    case_id: 'mock_case_good_cigna',
    drug_key: 'infliximab',
    payer_id: 'cigna',
    payer_name: 'Cigna',
    coverage_status: 'conditional',
    fit_score: 52,
    blockers: [
      {
        type: 'missing_prior_failure',
        severity: 'hard',
        description: 'Cigna Q4 2024 now requires documented failure of an FDA-approved biosimilar infliximab before Remicade (originator) is covered. If prescribing Remicade specifically, this is a hard blocker.',
        resolution: 'Prescribe biosimilar infliximab (Inflectra, Renflexis, or Avsola) as first choice. If patient is already biosimilar-experienced, document that trial and submit.',
        citation: {
          id: 'cite_ifx_cigna_diff_1',
          page: 2,
          section: 'Coverage Conditions — Step Therapy',
          quote: 'Documentation of an adequate trial and failure of an FDA-approved biosimilar infliximab product is required.',
          source_label: 'Cigna Coverage Policy: Infliximab (MMR1005) — Q4 2024',
          source_url: 'https://www.cigna.com/static/www-cigna-com/docs/health-care-professionals/coverage-policies/ph_1005_coveragepositioncriteria_infliximab.pdf',
          effective_date: '2024-10-01',
        },
      },
      {
        type: 'wrong_care_setting',
        severity: 'hard',
        description: 'Cigna Q4 2024 restricts infliximab infusion to non-hospital outpatient settings. Hospital outpatient requires a site-of-care exception that is rarely granted.',
        resolution: 'Arrange infusion at a freestanding infusion center or physician office. Hospital setting will likely result in claim denial.',
        citation: null,
      },
    ],
    next_best_action: 'Switch to biosimilar infliximab (not Remicade) and confirm non-hospital infusion site before submitting PA. Two hard blockers present.',
    pa_summary: 'Cigna tightened policy in Q4 2024. Biosimilar step therapy and site-of-care restriction are now hard requirements. Originator Remicade will be denied without prior biosimilar failure. Hospital outpatient setting will also be denied.',
    evidence_checklist: [
      'Biosimilar infliximab trial documentation (if applicable)',
      'Methotrexate failure documentation (≥3 months)',
      'Second csDMARD failure documentation',
      'Negative TB test',
      'Non-hospital infusion site confirmed',
      'Rheumatologist prescriber attestation',
    ],
  },
]

// ── Scenario B: Infliximab / RA / insufficient prior therapy ─────────────────
// Patient has NOT failed MTX → hard blockers across all payers

export const MOCK_SIM_RESULTS_BLOCKED: SimulationResult[] = [
  {
    case_id: 'mock_case_blocked_aetna',
    drug_key: 'infliximab',
    payer_id: 'aetna',
    payer_name: 'Aetna',
    coverage_status: 'not_covered',
    fit_score: 18,
    blockers: [
      {
        type: 'missing_prior_failure',
        severity: 'hard',
        description: 'Aetna requires documented trial and failure of methotrexate for at least 3 months AND one additional csDMARD. Patient has not met this requirement.',
        resolution: 'Initiate methotrexate therapy. Document adequate trial (≥3 months) and clinical failure before resubmitting PA. Consider DMARD combination if contraindications exist.',
        citation: {
          id: 'cite_ifx_aetna_1',
          page: 3,
          section: '2.1 Coverage Criteria',
          quote: 'Coverage for infliximab and its biosimilars requires documentation of adequate trial and failure of at least two conventional synthetic DMARDs, including methotrexate for a minimum duration of three months unless contraindicated.',
          source_label: 'Aetna Clinical Policy Bulletin: Infliximab (CPB #0208)',
          source_url: 'https://www.aetna.com/cpb/medical/data/200_299/0208.html',
          effective_date: '2024-10-01',
        },
      },
      {
        type: 'missing_lab',
        severity: 'hard',
        description: 'Baseline LFTs within the past 3 months are required for PA approval. No labs on file.',
        resolution: 'Order baseline LFT panel. Submit results with PA application.',
        citation: null,
      },
    ],
    next_best_action: 'Initiate MTX + second csDMARD regimen. Return for biologic PA after 3 months of documented DMARD therapy. Order LFTs and TB test now.',
    pa_summary: 'PA will be denied. Patient has not met step therapy requirements (no prior DMARD failure documented). Aetna will not approve infliximab without this documentation.',
    evidence_checklist: [
      'Methotrexate initiation and failure documentation (required, not yet met)',
      'Second csDMARD initiation and failure (required, not yet met)',
      'QuantiFERON or TST (required)',
      'Baseline LFTs within 3 months (required)',
    ],
  },
  {
    case_id: 'mock_case_blocked_uhc',
    drug_key: 'infliximab',
    payer_id: 'uhc',
    payer_name: 'UnitedHealthcare',
    coverage_status: 'not_covered',
    fit_score: 22,
    blockers: [
      {
        type: 'missing_prior_failure',
        severity: 'hard',
        description: 'UHC requires inadequate response to methotrexate (≥3 months) before biologic approval for Rheumatoid Arthritis.',
        resolution: 'Initiate and document MTX trial. Submit after minimum 3-month duration with documented clinical failure.',
        citation: {
          id: 'cite_ifx_uhc_1',
          page: 2,
          section: 'Coverage Criteria — Rheumatoid Arthritis',
          quote: 'Prior authorization is required. Patient must have an inadequate response to methotrexate of at least 3 months duration.',
          source_label: 'UHC Medical Drug Policy: Tumor Necrosis Factor (TNF) Inhibitors (D0010)',
          source_url: 'https://www.uhcprovider.com/content/dam/provider/docs/public/policies/drug/tnf-inhibitors.pdf',
          effective_date: '2024-10-01',
        },
      },
    ],
    next_best_action: 'Start MTX. Resubmit PA after 3 months with failure documentation and biosimilar selection.',
    pa_summary: 'Step therapy requirement not met. UHC requires methotrexate trial before biologic approval. PA submission at this time will be denied.',
    evidence_checklist: [
      'Methotrexate trial documentation (required, not yet met)',
      'TB screening (required)',
      'CBC (required)',
    ],
  },
  {
    case_id: 'mock_case_blocked_cigna',
    drug_key: 'infliximab',
    payer_id: 'cigna',
    payer_name: 'Cigna',
    coverage_status: 'not_covered',
    fit_score: 10,
    blockers: [
      {
        type: 'step_therapy_required',
        severity: 'hard',
        description: 'Cigna requires prior failure of MTX AND one additional csDMARD. Neither has been documented.',
        resolution: 'Initiate DMARD therapy. Document both MTX failure and a second DMARD failure before resubmitting.',
        citation: null,
      },
      {
        type: 'missing_prior_failure',
        severity: 'hard',
        description: 'Biosimilar infliximab step therapy also applies. If Remicade is prescribed, prior biosimilar failure is required on top of csDMARD step therapy.',
        resolution: 'Prescribe biosimilar infliximab once step therapy is cleared. This avoids the additional biosimilar-first hurdle.',
        citation: {
          id: 'cite_ifx_cigna_diff_1',
          page: 2,
          section: 'Coverage Conditions — Step Therapy',
          quote: 'Documentation of an adequate trial and failure of an FDA-approved biosimilar infliximab product is required.',
          source_label: 'Cigna Coverage Policy: Infliximab (MMR1005) — Q4 2024',
          source_url: 'https://www.cigna.com/static/www-cigna-com/docs/health-care-professionals/coverage-policies/ph_1005_coveragepositioncriteria_infliximab.pdf',
          effective_date: '2024-10-01',
        },
      },
    ],
    next_best_action: 'Multiple hard blockers. Do not submit PA. Begin DMARD therapy (MTX + one additional csDMARD). Plan to prescribe biosimilar infliximab, not Remicade.',
    pa_summary: 'PA will be denied. Cigna has the strictest step-therapy policy of the three payers for this drug. Three hard blockers present: no csDMARD failure, no biosimilar trial, hospital setting risk.',
    evidence_checklist: [
      'MTX trial (required, not yet met)',
      'Second csDMARD trial (required, not yet met)',
      'Biosimilar infliximab selection confirmed',
      'Non-hospital infusion site confirmed',
    ],
  },
]

// ── Helper: pick results based on prior therapy count ────────────────────────

export function getMockSimulationResults(caseData: SimulationCase): SimulationResult[] {
  const hasPriorTherapy = caseData.prior_therapies.length >= 2
  return hasPriorTherapy ? MOCK_SIM_RESULTS_GOOD : MOCK_SIM_RESULTS_BLOCKED
}
