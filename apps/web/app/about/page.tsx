// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — About page  /about
// Methodology, data posture, limitations, compliance language.
// Public — no auth required. Server component (no interactivity needed).
// ─────────────────────────────────────────────────────────────────────────────

import { WorkspaceHeader, WorkspacePage } from '@/components/layout/workspace-page'

export default function AboutPage() {
  return (
    <WorkspacePage width="narrow">
      <WorkspaceHeader
        eyebrow="Product Context"
        title="About PrismRx"
        description="PrismRx turns public payer policies into a searchable, comparable coverage intelligence layer with citations, synthetic case simulation, and policy change tracking."
      />

      <div className="space-y-8">

        {/* What it is */}
        <Section title="What PrismRx Is">
          <p>
            PrismRx is a coverage intelligence workspace for medical-benefit drug policies.
            It ingests publicly available payer clinical policy bulletins, extracts structured
            coverage criteria using an LLM pipeline, and surfaces the results in a searchable,
            comparable interface with full source citation traceability.
          </p>
          <p>
            The core workflow: compare coverage posture across payers, simulate approval barriers
            using synthetic patient scenarios, and track quarter-over-quarter policy drift.
          </p>
        </Section>

        {/* Data posture */}
        <Section title="Data Posture">
          <DataPoint
            label="Source documents"
            value="Publicly available payer clinical policy bulletins and medical drug policy documents only."
          />
          <DataPoint
            label="Patient data"
            value="Synthetic cases only. No real patient records, member data, or claims data are used or stored anywhere in this system."
          />
          <DataPoint
            label="PHI"
            value="PrismRx does not process, transmit, or store Protected Health Information (PHI). The platform is intentionally scoped to public policy documents and synthetic demo scenarios."
          />
          <DataPoint
            label="Identifiers"
            value="The simulator accepts structured clinical inputs for synthetic scenarios. Users are explicitly instructed not to enter real patient identifiers."
          />
        </Section>

        {/* Compliance posture */}
        <Section title="Compliance Posture">
          <div className="mb-4 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(16, 185, 129, 0.2)', background: 'var(--accent-mint-soft)' }}>
            <p className="mb-1 text-sm font-semibold text-emerald-700">
              Public documents + synthetic demo data only · No PHI
            </p>
            <p className="text-xs text-slate-600">
              Designed to be adaptable to regulated environments.
            </p>
          </div>
          <p>
            PrismRx is a hackathon prototype operating exclusively on public payer policy documents
            and synthetic patient scenarios. It is not a production HIPAA-regulated platform
            and does not claim HIPAA compliance in its current form.
          </p>
          <p>
            The HIPAA Rules apply to covered entities and business associates that create, receive,
            maintain, or transmit PHI. Because PrismRx does not handle PHI in this build,
            those requirements do not currently apply.
          </p>
          <p>
            A production version handling real patient data would require: covered entity or
            business associate determination, risk analysis, access controls, audit logging,
            encryption, incident response, and BAAs with relevant vendors.
          </p>
        </Section>

        {/* Methodology */}
        <Section title="Extraction Methodology">
          <p>
            Policy documents are fetched from payer websites in PDF or HTML format. An LLM-powered
            extraction pipeline parses each document and normalizes coverage criteria into a
            structured PolicyDNA schema: coverage status, PA/step therapy flags, clinical criteria,
            operational rules, and evidence citations with page/section references.
          </p>
          <p>
            Each extracted fact is linked to its source quote, page number, and document section.
            Confidence scores reflect extraction certainty. Lower scores indicate ambiguous or
            implicit policy language.
          </p>
          <p>
            All LLM inference runs server-side. No API keys are exposed to the browser.
            Extracted facts are stored with document hashes for version traceability.
          </p>
        </Section>

        {/* Friction score */}
        <Section title="Access Friction Score">
          <p>
            The Access Friction Score (0–100) is a composite measure of administrative burden
            for a given drug-payer combination. Higher scores indicate more friction.
            It is computed from five factors:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-700">
            <li><strong className="text-slate-800">Prior failure count</strong> — number of required failed therapies</li>
            <li><strong className="text-slate-800">Specialist gate</strong> — whether a specialist prescriber is required</li>
            <li><strong className="text-slate-800">Lab/biomarker gate</strong> — whether baseline labs are required</li>
            <li><strong className="text-slate-800">Site of care restriction</strong> — whether infusion setting is restricted</li>
            <li><strong className="text-slate-800">Renewal complexity</strong> — short renewal intervals or heavy documentation burden</li>
          </ul>
          <p className="mt-3">
            The score is synthetic and intended for comparison purposes within the PrismRx platform.
            It is not a clinical decision-support tool.
          </p>
        </Section>

        {/* Limitations */}
        <Section title="Limitations">
          <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
            <li>Policy documents may not be fully current — effective dates are shown for each source.</li>
            <li>Extraction confidence varies by document structure and policy language clarity.</li>
            <li>The simulator uses synthetic scenarios and does not constitute clinical or legal advice.</li>
            <li>Coverage determinations in real clinical workflows depend on individual plan terms, member eligibility, and clinical context.</li>
            <li>PrismRx covers a focused set of payers and drug families — not a comprehensive national formulary.</li>
          </ul>
        </Section>

        {/* Built by */}
        <Section title="Built by">
          <p>
            PrismRx was built at Innovation Hacks 2026 (Anton RX Track) by the LavaLamps team.
          </p>
          <p className="font-mono text-xs text-slate-500 mt-2">
            Public payer documents · Synthetic cases only · No PHI ·
            Designed to be adaptable to regulated environments.
          </p>
        </Section>
      </div>
    </WorkspacePage>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="workspace-panel px-6 py-5">
      <h2 className="mb-4 border-b pb-3 text-sm font-bold text-slate-900" style={{ borderColor: 'var(--line-soft)' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  )
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</span>
      <p className="flex-1 text-sm text-slate-700">{value}</p>
    </div>
  )
}
