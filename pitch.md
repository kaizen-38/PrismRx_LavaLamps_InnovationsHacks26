# PrismRx — Hackathon pitch

## 1. The problem (10–15 seconds)

Access teams and clinicians drown in **payer-specific drug policies** (coverage, prior authorization, step therapy, site of care). Answers are buried in PDFs and portals, so people **guess, re-read the same document, or stall**—slow for patients and risky for denials.

## 2. What you built (one sentence)

**PrismRx** is a **medical benefit drug policy copilot**: it ties a **structured policy corpus** to a **conversational workspace** that can **ground answers in real policy text** (indexed or live-fetched), not generic LLM hand-waving.

## 3. Demo story (60–90 seconds)

Walk one path end-to-end:

- Open **Workspace** → user asks in plain English with **payer + drug** (or uses your selectors).
- Show the **orchestrator** resolving intent, pulling the **right policy** (database first).
- If it’s not in the index, mention **live policy retrieval** as a fallback so the demo still works.
- Highlight the **right-hand report**: coverage summary, **PA / step / site-of-care** style signals, **evidence/citations** tied to the document where possible.
- Optionally flash **Matrix / Simulate / Radar** as proof you didn’t only build chat—you built **tooling around the same data**.

## 4. Why judges care (differentiation)

- **Grounding by design**: For real coverage questions, the assistant is steered toward **document-backed** analysis, with clear **limits** when text isn’t there (honest refusal beats hallucination).
- **Ops-shaped UI**: Not just a chat bubble—**widgets** (hero summary, blockers, snapshot, etc.) match how access teams actually work.
- **Modern AI wiring**: **Streaming** responses, **routing** (e.g. LangGraph-style **general chat vs coverage pipeline**), **Bedrock** for the model layer—shows you can ship production-shaped patterns under time pressure.
- **Full stack**: **FastAPI** services for **ingest** (PDF + URL), **policy APIs**, **lookup/live**, plus **simulate/diff/matrix**-style surfaces—this is a **platform**, not a slide deck.

## 5. Tech you can name-drop (credibility, not jargon dump)

Next.js 14, React workspace UI, SSE streaming assistant route, AWS Bedrock, LangGraph for orchestration, FastAPI + SQLite/async DB, PDF ingestion and extraction pipeline, REST for policy/matrix/simulate/diff.

## 6. Traction / honesty (10 seconds)

State what’s **real in the demo** (indexed payers/drugs, one or two golden queries) vs **best-effort** (live crawl, edge payers). Judges reward **clarity** about limitations.

## 7. Where it goes next (optional closer)

Deeper EHR/PA integrations, more payers in the index, evaluation harness for citation quality, role-based views (pharmacy vs MD), or enterprise auth—pick **one** line for the close.

---

## Elevator line (memorize)

*“PrismRx turns messy payer drug policies into a grounded copilot: ask in plain language, get answers anchored in the actual policy text—with a workspace built for how access teams work, not just a chatbot.”*

---

## Time-box variants

- **~2 minutes**: Problem → one sentence → demo path → one differentiation bullet → elevator line.
- **~5 minutes**: Full sections above + live demo + 30 seconds on limitations and roadmap.

Adjust depth for **clinical**, **engineering**, or **business** judges (more “workflow + safety” vs “architecture” vs “market + ROI”).
