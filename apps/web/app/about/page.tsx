// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — About page  /about
// Methodology, data posture, limitations, compliance language.
// Public — no auth required. Server component (no interactivity needed).
// ─────────────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-100 mb-3">About PrismRx</h1>
        <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
          PrismRx turns public payer policies into a searchable, comparable coverage intelligence
          layer — with citations, synthetic case simulation, and policy change tracking.
        </p>
      </div>

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
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-emerald-300 mb-1">
              Public documents + synthetic demo data only · No PHI
            </p>
            <p className="text-xs text-slate-400">
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
          <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-sm mt-2">
            <li><strong className="text-slate-300">Prior failure count</strong> — number of required failed therapies</li>
            <li><strong className="text-slate-300">Specialist gate</strong> — whether a specialist prescriber is required</li>
            <li><strong className="text-slate-300">Lab/biomarker gate</strong> — whether baseline labs are required</li>
            <li><strong className="text-slate-300">Site of care restriction</strong> — whether infusion setting is restricted</li>
            <li><strong className="text-slate-300">Renewal complexity</strong> — short renewal intervals or heavy documentation burden</li>
          </ul>
          <p className="mt-3">
            The score is synthetic and intended for comparison purposes within the PrismRx platform.
            It is not a clinical decision-support tool.
          </p>
        </Section>

        {/* Limitations */}
        <Section title="Limitations">
          <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-sm">
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
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 px-6 py-5">
      <h2 className="text-sm font-bold text-slate-200 mb-4 pb-3 border-b border-navy-700">{title}</h2>
      <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
    </div>
  )
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{label}</span>
      <p className="text-sm text-slate-300 flex-1">{value}</p>
    </div>
  )
}
