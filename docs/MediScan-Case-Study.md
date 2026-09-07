# MediScan & Kin Health — Product & AI Engineering Case Study
### 0-to-1 Ownership of an AI-Powered Health Management Application

**Role:** Product Manager / 0-to-1 Builder (end-to-end product definition, UX, and AI workflow design)
**Platform:** Base44 (BaaS) · React + Tailwind · LLM orchestration (vision OCR, audio transcription, structured extraction)
**Timeline framing:** Concept → shipped, end-to-end, across prescription digitization, medication adherence, and doctor-visit intelligence.

---

## 1. Executive Summary

I owned a 0-to-1 AI health application from blank slate to a shipped, multi-flow product. I defined the user journeys, prioritized the feature set against real patient pain points, and personally designed and shipped three integrated AI workflows — **prescription scanning**, **health-report digitization**, and **doctor-visit capture & summarization** — into a single, seamless patient experience.

The product solves a concrete, everyday problem: **patients lose critical health information the moment it leaves the clinic.** Paper prescriptions get misplaced, medication schedules are forgotten, lab results are unreadable to laypeople, and doctor-visit conversations evaporate the second a patient walks out. MediScan & Kin Health turns each of these into structured, actionable, persistent digital records — with safety nets (drug-interaction alerts, adherence reminders) that a paper folder can never provide.

This document is the **proof and process** behind three resume claims, mapping each to the actual shipped product, the decisions made, and the AI architecture that powers it.

---

## 2. The Problem Space (Why this product exists)

| User pain | Real-world consequence | What patients do today |
|---|---|---|
| Paper prescriptions are lost or unreadable later | Missed/mistimed doses; can't recall dosage instructions | Re-call the clinic, guess, or stop taking meds |
| Multi-page lab reports are dense and jargon-heavy | Patients don't know which results are abnormal | Ignore results until the next visit |
| Doctor-visit conversations are forgotten | Patients forget questions, next steps, and advice | Rely on memory; bring incomplete notes |
| Families manage multiple people's health in one phone | Wrong meds given to the wrong person | Ad-hoc, error-prone sharing |
| No early warning for drug interactions | Dangerous combinations taken unknowingly | None — discovered at the pharmacy, if at all |

Each feature in the product was selected because it maps **1:1** to a row in this table. No feature was built for novelty.

---

## 3. Resume Claim #1 — *Owned 0-to-1 AI health app: defined flows, prioritized features, shipped prescription scans & visit summaries end-to-end.*

### 3.1 Defining the flows (product architecture)

I decomposed the patient journey into **three primary flows** and a **unified home surface**, each with explicit entry, processing, review, and persistence stages:

```
┌─────────────────────────────────────────────────────────────┐
│                      HOME / DASHBOARD                        │
│  (adherence snapshot · next doses · refill alerts · visits)  │
└───────▲───────────────────────────▲──────────────────┬──────┘
        │                           │                  │
   FLOW A: PRESCRIPTION        FLOW B: HEALTH       FLOW C: VISIT
   Scan → digitize →           Report → digitize    Prep checklist →
   reminders → drug alerts     → review → save      record audio →
                                                    transcribe → AI summary
```

Every flow follows the same **four-stage pattern**, which I standardized for consistency and reliability:

1. **Capture** — camera scan or file upload (now multi-page, stitched into one record).
2. **AI Processing** — validation gate → structured extraction → sanitization.
3. **Human Review** — preview/edit before anything is persisted (trust, but verify).
4. **Persistence & Action** — save to the right entity, trigger downstream actions (reminders, alerts, summaries).

### 3.2 Feature prioritization

I prioritized ruthlessly using a **pain × frequency × safety-risk** lens:

| Priority | Feature | Why it ranked here |
|---|---|---|
| P0 | Prescription scan + extraction | Highest frequency, highest safety stakes (wrong dose = harm) |
| P0 | Medication reminders + adherence | The #1 reason treatments fail; daily engagement driver |
| P0 | Drug-interaction alerts | Safety-critical; differentiator vs. a paper folder |
| P1 | Doctor-visit recording + AI summary | High pain, lower frequency; strong "wow" + retention |
| P1 | Multi-patient family profiles | Required for the core use case (families share one phone) |
| P2 | Health-report digitization | High value but less frequent than prescriptions |
| P2 | Visit prep checklists | Improves visit quality; lightweight to build |
| P3 | Insights/analytics dashboard | Engagement layer; built once core flows were solid |

This is why **prescriptions and visit summaries shipped first and end-to-end** — they are the two flows with the highest combined pain, frequency, and safety weight.

### 3.3 "End-to-end" — what that actually means here

"End-to-end" is not a demo. Each shipped flow is complete: every button works, data persists, lists refresh, loading and empty states exist, and errors surface cleanly to the user.

**Prescription scan, end-to-end:**
- User selects document type → picks patient → captures/uploads (single or **multiple pages, auto-stitched**) → AI validates it's a real medical document → extracts medicines, dosages, frequency, doctor, clinic, diagnosis → sanitizes hallucinations → user reviews/edits → saves → **drug-interaction check runs automatically** → user configures smart reminders → lands on dashboard with the new meds active.

**Visit summary, end-to-end:**
- User creates a visit (doctor, purpose, symptoms, questions) → builds a **prep checklist** with progress tracking → records audio in-app → audio is uploaded and **transcribed** → transcript is sent to an LLM that returns **structured key points, recommendations, and dated next steps** → summary is saved and surfaced on the dashboard and history.

### 3.4 Proof artifacts (shipped, in the codebase)

- **Entities (data model I designed):** `Prescription`, `HealthReport`, `Visit`, `MedicationReminder`, `MedicationLog`, `FamilyMember`, `UserProfile` — each with row-level security so a user only sees their own (and their family's) records.
- **Upload flow** (`src/pages/Upload.jsx`) — multi-page capture, processing view, preview/edit, reminder setup, drug-interaction modal.
- **Extraction pipeline** (`src/lib/extractionPipeline.js`) — validation gate, prescription extraction, report extraction, sanitization, date normalization, course-completion logic, drug-interaction check.
- **Visit assistant** (`src/pages/VisitAssistant.jsx`) + `VisitPrep`, `AudioRecorder`, `VisitSummary` — the full visit lifecycle.
- **Dashboard** (`src/pages/Dashboard.jsx`) — adherence snapshot, next doses, refills, recent prescriptions.

---

## 4. Resume Claim #2 — *Drove UX decisions: multi-patient profiles, auto-archiving, smart reminders & drug alerts; each solved a real user pain.*

I treat UX decisions as **product decisions**, not styling. Each of the four below was chosen to remove a specific failure mode a patient would otherwise hit.

### 4.1 Multi-patient family profiles

**Pain:** A parent manages their own meds, a child's antibiotics, and an aging parent's chronic medication — all on one phone. Without separation, the wrong person gets the wrong reminder.

**Decision:** Build a **patient switcher** that scopes every screen (dashboard, history, upload, visits) to the selected patient. Family members are first-class entities with their own allergies, conditions, and color themes.

**How it works:**
- On upload, the user picks *who* the record is for before scanning.
- The dashboard, history, and reminders all filter by the active patient.
- Adding a family member is a lightweight inline flow (name, relation, DOB, allergies, conditions).

**UX principle applied:** *Context before content.* The active patient is always visible and always the scope of the data below it.

### 4.2 Auto-archiving (active vs. history)

**Pain:** A 7-day antibiotic course from last month still shows as "active" on the dashboard, cluttering it and making the next-dose view useless. Patients stop trusting the dashboard.

**Decision:** A prescription has an `is_active` flag. The system **automatically archives** a prescription when its medication course has ended (computed from prescription date + each medicine's duration). Archiving **cascades** — it deactivates all associated reminders so no stale notifications fire.

**The two-surface model I designed:**
- **Dashboard** = *active* prescriptions only (what you're taking now).
- **History** = *everything* (the full medical record), with a per-prescription toggle to move a record between active and history.

**UX principle applied:** *Separate "now" from "then."* The dashboard stays trustworthy; history stays complete. The user controls the boundary with a single tap ("Move to History" / "Make Active").

**Proof of the cascade logic:** `isPrescriptionCourseCompleted()` in the pipeline computes the furthest end date across all medicines; chronic/ongoing meds never auto-archive. Archive toggles call `updateMany` on reminders to deactivate them in one batch.

### 4.3 Smart reminders

**Pain:** "Take this twice daily" is not actionable. Patients need *when*, *how much*, and *for how long* — and they need it to stop when the course ends.

**Decision:** After a prescription is saved, the user configures reminders that are **pre-filled from the extracted data** (medicine name, dosage, frequency, timing, duration). The system infers sensible defaults (e.g., "Twice daily" → morning + night times) so the user mostly just confirms.

**Smart behaviors I built:**
- **Duration-aware:** reminders carry `start_date` and `end_date`; notifications are suppressed after the course ends (no ghost reminders for a finished antibiotic).
- **Refill tracking:** a `refill_reminder_date` is computed from quantity prescribed, so chronic meds prompt a refill before they run out.
- **Adherence logging:** every "Take / Skip" action writes a `MedicationLog`, which feeds the adherence rate and daily streak on the dashboard.
- **Cascade deactivation:** archiving a prescription deactivates its reminders in one operation.

**UX principle applied:** *Defaults that respect the data.* The extraction already told us the frequency and duration — the reminder UI should reflect that, not ask the user to re-enter it.

### 4.4 Drug-interaction alerts

**Pain:** A patient sees two specialists, gets two prescriptions, and nobody checks the combination. Dangerous interactions (e.g., serotonin syndrome, QT prolongation, bleeding risk) go unnoticed.

**Decision:** Immediately after a prescription is saved, the system runs an **LLM-powered drug-interaction check** across the medicines. Only **moderate and severe** interactions are surfaced (mild ones would create alert fatigue). The result is shown in a clear, severity-coded modal and stored on the prescription record.

**UX principle applied:** *Safety is a moment, not a setting.* The check runs automatically — the patient never has to remember to ask. And it's framed as "consult your doctor/pharmacist," not as a diagnosis.

---

## 5. Resume Claim #3 — *Designed AI workflows combining OCR extraction, audio transcription & LLM summaries into one seamless patient experience.*

This is the technical heart of the product. I designed **three AI workflows** that share a common philosophy: **structured, validated, hallucination-resistant outputs** that plug directly into a relational data model — not free-text blobs.

### 5.1 Shared AI design principles (applied to all three workflows)

1. **Structured output over free text.** Every LLM call returns JSON matching a defined schema, so the result maps directly to entity fields — no fragile parsing.
2. **Validation gate first.** Before any extraction, a classifier confirms the input is actually a medical document. Non-medical uploads are rejected with a clear, friendly message — saving credits and preventing garbage records.
3. **Anti-hallucination protocol.** Prompts explicitly instruct the model to *omit* anything it cannot read with confidence, and to self-verify before returning. A post-extraction sanitization layer filters out non-medicine terms and duplicates.
4. **Human-in-the-loop.** AI output is always shown for review/edit before persistence. The AI proposes; the human disposes.
5. **Graceful, specific errors.** Distinct error states ("not a medical document," "no medicines found," "extraction failed") each with a tailored recovery path.

### 5.2 Workflow A — Prescription digitization (Vision OCR → structured extraction)

```
Capture (1+ pages)
   │
   ▼
Upload all pages  ──►  [Validation Gate: gemini, vision]
   │                         │ (reject if not medical)
   ▼                         ▼
[Extraction: claude, vision + multi-page]  ──►  raw JSON
   │  (medicines, dosage, frequency, timing, duration,
   │   doctor, clinic, diagnosis, date)
   ▼
[Sanitization]  ──►  filter non-medicine terms, dedupe,
   │                normalize date → ISO YYYY-MM-DD
   ▼
[Review/Edit]  ──►  [Save]  ──►  [Drug-interaction check]
                                      │
                                      ▼
                              [Smart reminders setup]
```

**Key engineering decisions:**
- **Multi-page stitching:** multiple images are uploaded and passed to the LLM as a single `file_urls` array, with a prompt instructing it to treat them as pages of one document and merge into a single record. A multi-page PDF is handled natively as one file.
- **Two-model strategy:** a fast, cheap vision model for the validation gate; a stronger model for the high-precision extraction. This balances cost and accuracy.
- **OCR error correction** is baked into the prompt (e.g., `0→O`, `SOOmg→500mg`, Latin abbreviation decoding `BD→Twice daily`), because handwritten and printed prescriptions are messy.
- **Category inference** (antibiotic, painkiller, vitamin, chronic, etc.) drives the reminder defaults and dashboard color-coding.

### 5.3 Workflow B — Health-report digitization (Vision OCR → lab-structured extraction)

Same pipeline shape as prescriptions, but tuned for lab reports:
- **Test-name standardization** in the prompt (e.g., `Hb→Hemoglobin`, `TLC→WBC`, `HbA1c→Glycated Hemoglobin`) so a user sees consistent names across labs.
- **Unit standardization** (`mg/dl→mg/dL`, `10^3/uL→10³/µL`).
- **Abnormal flagging:** the model sets `is_abnormal` when a value is outside the reference range *or* explicitly flagged High/Low on the report — so the UI can highlight concerning results in red.
- Each result row (test name, value, units, reference range, abnormal flag) becomes a structured object, not a paragraph.

### 5.4 Workflow C — Doctor-visit capture (Audio → Transcription → LLM summary)

```
Visit Prep (checklist: symptoms, questions, concerns)
   │
   ▼
In-app Audio Recording  ──►  [Upload audio]
   │                              │
   ▼                              ▼
[Transcription: Whisper]  ──►  transcript text
   │
   ▼
[LLM Summarization]  ──►  structured JSON:
   │  • key_points[]
   │  • recommendations[] (meds, lifestyle, tests)
   │  • next_steps[]  (action + due_date)
   │  • visit purpose, doctor, clinic
   ▼
[Visit Summary saved]  ──►  surfaced on Dashboard + History
```

**Key engineering decisions:**
- **Prep before capture:** the visit flow starts with a *preparation checklist* (symptoms to mention, questions to ask) so the patient walks in organized — solving the "I forgot to ask" pain *before* the recording even starts.
- **Audio → text → structure:** I deliberately split transcription and summarization into two stages. Transcription is a faithful verbatim record (stored on the visit); summarization is the actionable layer. This separation means the summary can be regenerated or corrected without re-transcribing.
- **Actionable next steps with due dates:** the summary doesn't just narrate — it extracts *what to do next and by when*, which can feed future reminders and follow-up.
- **Status lifecycle:** a visit moves through `preparing → recording → completed`, so the UI always reflects where the patient is in the flow.

### 5.5 "One seamless patient experience" — how the three workflows connect

The three AI workflows are not three separate apps. They feed **one unified patient record**:

- A **prescription** creates **reminders** and triggers **drug alerts**.
- A **visit summary** can reference medicines and produce **next steps** that become follow-up actions.
- A **health report** sits alongside prescriptions and visits in the **History** timeline, grouped by month.
- The **Dashboard** synthesizes all three: today's doses (from prescriptions), upcoming visits, recent reports, and adherence trends.

The patient never thinks "I'm using the OCR tool" or "I'm using the transcription tool." They think: *"I scanned my prescription. I recorded my visit. It's all here."* That seamlessness is the product.

---

## 6. Architecture & Data Model (the backbone I designed)

### 6.1 Entities

| Entity | Purpose | Key fields |
|---|---|---|
| `Prescription` | Digitized Rx | medicines[], doctor, clinic, diagnosis, is_active, drug_interactions[] |
| `HealthReport` | Digitized lab report | report_type, results[] (with is_abnormal), summary, lab_name |
| `Visit` | Doctor-visit lifecycle | purpose, symptoms[], questions[], audio_file_url, transcript, key_points[], recommendations[], next_steps[], status |
| `MedicationReminder` | Dose schedules | reminder_times[], start/end_date, is_active, refill_reminder_date |
| `MedicationLog` | Adherence events | scheduled_time, taken_time, status (taken/missed/skipped) |
| `FamilyMember` | Multi-patient | full_name, relation, allergies[], medical_conditions[] |
| `UserProfile` | Primary user | full_name, preferred_name, DOB, allergies[], medical_conditions[] |

### 6.2 Security & privacy (a health app must get this right)

- **Row-level security** on every health entity: a user can read/write only their own records (and their family members'); admins are the exception.
- **File storage** is separated from metadata — original prescription/report files are stored as URLs, not embedded blobs, keeping records lightweight and operations fast.
- **No PII in analytics events** — only indicative, non-identifying event names.

### 6.3 Reliability patterns I established

- **Multi-stage extraction pipeline** (validate → extract → sanitize) with dedicated, user-facing error states per failure mode.
- **Idempotent, batched data operations** for cascade effects (e.g., deactivating all reminders for an archived prescription in one call).
- **Real-time subscriptions** so lists refresh the instant data changes — no manual pull-to-refresh.
- **Loading and empty states on every flow**, with smart CTAs ("Scan your first prescription") so a new user is never staring at a blank screen.

---

## 7. Impact & Outcomes (how success would be measured)

| Dimension | What the product enables |
|---|---|
| **Safety** | Drug-interaction alerts and abnormal-result flagging catch risks a paper folder cannot. |
| **Adherence** | Duration-aware reminders + adherence logging turn "take this twice daily" into a trackable, stopping schedule. |
| **Comprehension** | Structured, standardized lab results with abnormal flags make dense reports legible to laypeople. |
| **Continuity** | Visit summaries persist the conversation — next steps and due dates survive beyond the clinic door. |
| **Family coverage** | Multi-patient profiles make one phone safely serve a whole family. |
| **Trust** | Human-in-the-loop review on every AI output; auto-archiving keeps the active view honest. |

---

## 8. Decision Log (selected, with rationale)

| Decision | Alternatives considered | Why I chose this |
|---|---|---|
| Structured JSON from LLMs, not free text | Free-text summaries | Maps to entity fields; enables search, filtering, and structured UI. |
| Validation gate before extraction | Extract everything, filter later | Saves cost; gives a clean "not a medical document" error instead of garbage data. |
| Auto-archive by computing course end | Manual archive only | Patients forget; stale active meds destroy dashboard trust. |
| Cascade-deactivate reminders on archive | Leave reminders running | Prevents ghost notifications for finished courses. |
| Multi-page stitch into one record | One file = one record | Real prescriptions/reports span pages; users think in documents, not files. |
| Split transcription and summarization | One combined call | Verbatim transcript is retained; summary is regenerable and correctable independently. |
| Show only moderate/severe interactions | All interactions | Alert fatigue; mild interactions would train users to dismiss alerts. |
| History shows all records by default | Hide inactive behind a toggle | History is a record of the past — hiding past records defeats its purpose. |

---

## 9. What I Would Do Next (honest roadmap)

1. **Provider-side integration** — send structured visit summaries back to a patient's doctor portal.
2. **Adherence nudges via push** — escalate missed doses with smart, non-annoying timing.
3. **Longitudinal insights** — trend lab values over time (e.g., HbA1c trajectory) with plain-language interpretation.
4. **Offline capture** — let patients scan/record without connectivity, sync when reconnected.
5. **Multi-language extraction** — extend OCR/summarization for prescriptions in regional scripts.

---

## 10. Claim-to-Evidence Cross-Reference

| Resume claim | Evidence in this document | Evidence in the product |
|---|---|---|
| *Owned 0-to-1 AI health app* | §1, §3 | Full app: Dashboard, Upload, VisitAssistant, History, Insights |
| *Defined flows* | §3.1 (three flows + four-stage pattern) | Upload.jsx, VisitAssistant.jsx, Dashboard.jsx |
| *Prioritized features* | §3.2 (pain × frequency × safety table) | Prescription + visit shipped first; reports P2 |
| *Shipped prescription scans end-to-end* | §3.3, §5.2 | Upload flow → extractionPipeline → reminders → drug alerts |
| *Shipped visit summaries end-to-end* | §3.3, §5.4 | VisitAssistant → AudioRecorder → transcription → LLM summary |
| *Multi-patient profiles* | §4.1 | PatientSwitcher, FamilyMember entity |
| *Auto-archiving* | §4.2 | isPrescriptionCourseCompleted, is_active, cascade deactivation |
| *Smart reminders* | §4.3 | MedicationReminder, MedicationLog, duration-aware suppression |
| *Drug alerts* | §4.4 | checkDrugInteractions, severity-coded modal |
| *OCR extraction workflow* | §5.2, §5.3 | processPrescription, processHealthReport |
| *Audio transcription workflow* | §5.4 | TranscribeAudio integration |
| *LLM summaries workflow* | §5.4 | Structured visit summarization |
| *One seamless experience* | §5.5 | Unified Dashboard + History tying all three together |

---

*Prepared as a portfolio case study documenting the design, prioritization, and AI workflow architecture of MediScan & Kin Health. All features referenced are shipped in the live application.*