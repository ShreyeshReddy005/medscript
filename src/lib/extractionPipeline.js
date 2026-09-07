import { InvokeLLM } from "@/integrations/Core";

// ═══════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════

export class ExtractionError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = "ExtractionError";
    this.type = type; // 'not_medical' | 'no_medicines' | 'no_results' | 'extraction_failed'
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════
// STAGE 1: IMAGE VALIDATION GATE
// ═══════════════════════════════════════════════════════════════

const VALIDATION_PROMPT = `You are an expert medical document classifier with 20+ years of experience. Analyze these image(s) — which may be one or more pages of the same document — and determine if it is a legitimate medical document.

STEP 1 — IDENTIFY what you see:
Carefully examine the image. Is it:
- A printed or handwritten prescription (Rx document with medication names, dosages, doctor/clinic letterhead)?
- A laboratory test report (with test names, numeric values, reference ranges, lab letterhead)?
- A medical certificate, discharge summary, or referral letter?
- Something else entirely (photo, screenshot, meme, receipt, invoice, ID card, food label, product packaging, landscape, selfie, artwork, document with no medical content)?

STEP 2 — CHECK for STRONG medical indicators:
- Doctor name with credentials (Dr., MD, MBBS, MS, DM, FRCS, etc.)
- Clinic/hospital name and address
- Medication names (brand or generic drug names like Augmentin, Paracetamol, Azithromycin, Metformin)
- Dosage instructions (1-0-1, BD, TDS, OD, HS, etc.)
- Lab test names (Hemoglobin, Cholesterol, WBC, Blood Sugar, TSH, etc.)
- Numeric values with medical units (mg/dL, g%, 10^3/uL, IU/L, mmol/L, etc.)
- Reference ranges (e.g., "40-60", "<100", "3.5-5.0")
- Lab name and accreditation (NABL, ISO, CAP, etc.)
- Patient name, age, sex, ID

STEP 3 — CLASSIFY into one of:
- "prescription": Contains medication names and dosage instructions from a healthcare provider
- "lab_report": Contains test names, values, and/or reference ranges from a laboratory
- "medical_document": Other medical documents (discharge summary, referral, certificate)
- "not_medical": Does NOT contain medical content

⚠️ BE STRICT — reject these as "not_medical":
- A photo of a pill bottle, medicine box, or blister pack → NOT a prescription
- A screenshot of a web article or app about health → NOT a medical document
- A food nutrition label or supplement facts panel → NOT a lab report
- A receipt or invoice from a pharmacy → NOT a prescription
- A photo of a person, animal, landscape, or object → NOT medical
- A meme, cartoon, or social media post → NOT medical
- A blank or nearly-blank image → NOT medical
- A document with text but NO medical content (e.g., a bank statement, a letter) → NOT medical

Only classify as medical if the document was clearly PRODUCED BY a healthcare provider or laboratory and contains actual medical data (medications or test results).

Return JSON:
{
  "document_type": "prescription" | "lab_report" | "medical_document" | "not_medical",
  "confidence": 0-100,
  "is_valid": true ONLY if document_type is "prescription" or "lab_report" AND confidence >= 75,
  "reason": "one clear sentence explaining your decision",
  "detected_elements": ["list of medical elements found, e.g., doctor_name, clinic_name, medication_names, test_names, reference_ranges, patient_name"]
}`;

const VALIDATION_SCHEMA = {
  type: "object",
  properties: {
    document_type: { type: "string", enum: ["prescription", "lab_report", "medical_document", "not_medical"] },
    confidence: { type: "number" },
    is_valid: { type: "boolean" },
    reason: { type: "string" },
    detected_elements: { type: "array", items: { type: "string" } },
  },
  required: ["document_type", "confidence", "is_valid", "reason"],
};

async function validateMedicalImage(fileUrls) {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  const result = await InvokeLLM({
    prompt: VALIDATION_PROMPT,
    response_json_schema: VALIDATION_SCHEMA,
    file_urls: urls,
    model: "gemini_3_flash",
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// STAGE 2: PRESCRIPTION EXTRACTION
// ═══════════════════════════════════════════════════════════════

const PRESCRIPTION_PROMPT = `You are a world-class pharmaceutical transcriptionist and clinical data extraction specialist with 20+ years of experience reading handwritten and printed prescriptions from every country and medical system. Your task: extract every detail from this prescription — which may span multiple images/pages — with maximum precision and ZERO hallucination. Treat all provided images as pages of the same single prescription and merge the information into one record.

═══ ANTI-HALLUCINATION PROTOCOL ═══
CRITICAL: Only extract information that is VISIBLE in the image.
- NEVER invent, guess, or hallucinate medication names, dosages, or any data.
- If you cannot read something with confidence, OMIT it entirely.
- It is infinitely better to return 1 accurate medicine than 5 hallucinated ones.
- If the image is blurry, handwritten, or partially obscured, extract only what you can read clearly.
- Do NOT fill in "typical" or "common" values for fields you cannot read.
- After extracting, review each medicine: does this name ACTUALLY appear in the image? If you are not sure, remove it.

═══ IMAGE ANALYSIS ═══
Scan the entire image from top to bottom:
1. HEADER: letterhead — clinic/hospital name, address, phone, doctor name with credentials
2. PATIENT INFO: "Name:", "Patient:", "Age:", "Sex:", "Date:" fields
3. BODY (Rx section): ℞ symbol or medication list — each line is typically one medicine
4. FOOTER: diagnosis, follow-up instructions, lab orders, doctor's signature

═══ OCR ERROR CORRECTION ═══
Fix these common OCR errors character-by-character:
- Numbers in names: 0→O, O→0 (in dosages), 1→l, l→1, rn→m, vv→w, cl→d
- '1OO'→'100', 'Tah'→'Tab', 'Syp'→'Syp', 'Inj'→'Inj', 'Cap'→'Cap'
- 'O.5mg'→'0.5mg', 'SOOmg'→'500mg', 'l2.4'→'12.4'

═══ MEDICINE NAME EXTRACTION ═══
Read each medicine name character-by-character:
- Brand names are Capitalized (Augmentin, Crocin, Azithral)
- Generic names are lowercase (amoxicillin, paracetamol)
- Common abbreviations to expand:
  Amoxi→Amoxicillin, Azithro→Azithromycin, Cipro→Ciprofloxacin, Metf→Metformin,
  Metro→Metronidazole, Ome→Omeprazole, Pant→Pantoprazole, Ibupro→Ibuprofen,
  Para→Paracetamol, Cef→Cefixime, Doxy→Doxycycline, Levo→Levocetirizine,
  Monty→Montelukast, Ator→Atorvastatin, Telma→Telmisartan, Glime→Glimepiride,
  Cefurox→Cefuroxime, Clarith→Clarithromycin, Norflo→Norfloxacin

═══ STRENGTH (separate from name) ═══
Extract as separate field: 500mg, 250mg, 1g, 25mcg, 10mg/5ml, 0.5%, 400mg+57.5mg, 1.25mg

═══ DOSAGE (per-dose amount) ═══
1 tablet, 2 tabs, 5ml, 1 puff, 2 drops, 1 sachet, 2 teaspoonfuls

═══ FREQUENCY DECODING ═══
Numeric patterns:
  1-0-1 → "Twice daily (morning & night)"
  1-1-1 → "Three times daily"
  1-0-0 → "Once daily (morning)"
  0-0-1 → "Once daily (night)"
  2-0-2 → "Twice daily (2 tablets morning & night)"
Latin abbreviations:
  OD/QD → "Once daily", BD/BID → "Twice daily", TDS/TID → "Three times daily"
  QID → "Four times daily", HS → "At bedtime", SOS/PRN → "As needed"
  Q4H → "Every 4 hours", Q6H → "Every 6 hours", Q8H → "Every 8 hours"

═══ TIMING ═══
PC/after food → "After meals", AC/before food → "Before meals", CC/with food → "With meals"
HS/bedtime → "At bedtime", empty stomach → "On empty stomach"

═══ DURATION ═══
x5days → "5 days", 1/52 → "1 week", 2/12 → "2 months", 3/7 → "3 days"
continue/cont → "Ongoing", #7 → "7 days", #30 → "30 days"
For antibiotics with no duration: infer "5-7 days (inferred)"

═══ CATEGORY ═══
  antibiotic: penicillins (amoxicillin, augmentin), cephalosporins (cefixime, cefuroxime),
    macrolides (azithromycin), quinolones (ciprofloxacin, levofloxacin), metronidazole, doxycycline
  painkiller: NSAIDs (ibuprofen, diclofenac, naproxen), paracetamol/acetaminophen, tramadol, codeine
  vitamin: vitamins (A, B-complex, B12, C, D, E, K), folic acid, iron, calcium, zinc, omega-3
  supplement: probiotics, ORS, electrolytes, non-vitamin minerals, amino acids
  chronic: antihypertensives (amlodipine, telmisartan), antidiabetics (metformin, glimepiride),
    statins (atorvastatin), thyroid (levothyroxine), antidepressants, inhalers, anticoagulants
  other: antihistamines (cetirizine), antifungals (fluconazole), antacids (pantoprazole),
    eye/ear drops, topical creams, laxatives

═══ DIAGNOSIS ═══
After Dx:, Diagnosis:, C/O:, Provisional Diagnosis: — or infer from medication combination.

═══ NOTES ═══
Follow-up dates, lab orders, lifestyle advice, dietary restrictions, warnings.

═══ DATE ═══
prescription_date: ALWAYS return in ISO format YYYY-MM-DD (e.g., "2024-03-15").
- If the date is written as "15/03/2024" or "15-03-2024", convert to "2024-03-15".
- If only a month and year are visible ("March 2024"), use the 1st: "2024-03-01".
- If no date is visible, OMIT the field entirely (do NOT guess today's date).

═══ SELF-VERIFICATION (CRITICAL) ═══
Before producing your final JSON, re-read the image one more time and for EACH medicine you are about to output, confirm the name is literally visible on the prescription. Remove any medicine whose name you cannot point to in the image. This is your last chance to prevent hallucinations.

═══ OUTPUT ═══
Return ONLY valid JSON. No markdown, no text outside JSON.
If a field is not present, OMIT it (do not use null or empty string).
Every medicine MUST have at least a "name". All other medicine fields are optional.`;

const PRESCRIPTION_SCHEMA = {
  type: "object",
  properties: {
    doctor_name: { type: "string" },
    clinic_name: { type: "string" },
    hospital_name: { type: "string" },
    doctor_phone: { type: "string" },
    clinic_address: { type: "string" },
    patient_name: { type: "string" },
    prescription_date: { type: "string" },
    diagnosis: { type: "string" },
    notes: { type: "string" },
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          strength: { type: "string" },
          generic_name: { type: "string" },
          dosage: { type: "string" },
          frequency: { type: "string" },
          timing: { type: "string" },
          duration: { type: "string" },
          instructions: { type: "string" },
          category: { type: "string", enum: ["antibiotic", "painkiller", "vitamin", "supplement", "chronic", "other"] },
        },
        required: ["name"],
      },
    },
  },
  required: ["medicines"],
};

async function extractPrescriptionData(fileUrls) {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  const result = await InvokeLLM({
    prompt: PRESCRIPTION_PROMPT,
    response_json_schema: PRESCRIPTION_SCHEMA,
    file_urls: urls,
    model: "claude_sonnet_4_6",
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════
// STAGE 2: HEALTH REPORT EXTRACTION
// ═══════════════════════════════════════════════════════════════

const REPORT_PROMPT = `You are a world-class clinical laboratory scientist and medical data extraction specialist with 20+ years of experience reading lab reports from every laboratory and medical system worldwide. Your task: extract ALL data from this medical report — which may span multiple images/pages — with maximum precision and ZERO hallucination. Treat all provided images as pages of the same single report and merge the information into one record.

═══ ANTI-HALLUCINATION PROTOCOL ═══
CRITICAL: Only extract information that is VISIBLE in the image.
- NEVER invent, guess, or hallucinate test names, values, or any data.
- If you cannot read something with confidence, OMIT it entirely.
- It is better to return fewer accurate results than many hallucinated ones.
- Do NOT fill in "typical" or "normal" values for fields you cannot read.

═══ REPORT CLASSIFICATION (report_type) ═══
- "Lab Result": blood tests, urine analysis, stool tests, cultures, serology, hormones, biochemistry
- "Imaging Scan": X-ray, CT scan, MRI, ultrasound, PET scan, mammogram, DEXA, Doppler
- "Pathology": biopsy, histopathology, cytology, FNAC
- "Cardiology": ECG/EKG, echocardiogram, stress test, Holter, angiography
- "Other": anything that doesn't fit the above

═══ TEST NAME STANDARDIZATION ═══
Always expand abbreviations:
Hb/Haemoglobin → "Hemoglobin", TLC/WBC → "White Blood Cells (WBC)", RBC → "Red Blood Cells (RBC)"
Plt → "Platelets", MCV → "Mean Corpuscular Volume", MCH → "Mean Corpuscular Hemoglobin"
FBS → "Fasting Blood Sugar", PPBS → "Post-Prandial Blood Sugar", RBS → "Random Blood Sugar"
HbA1c → "HbA1c (Glycated Hemoglobin)", T.Chol → "Total Cholesterol", HDL-C → "HDL Cholesterol"
LDL-C → "LDL Cholesterol", TG → "Triglycerides", VLDL → "VLDL Cholesterol"
Sr.Creat → "Serum Creatinine", BUN → "Blood Urea Nitrogen", SGPT/ALT → "ALT (SGPT)"
SGOT/AST → "AST (SGOT)", ALP → "Alkaline Phosphatase", T.Bili → "Total Bilirubin"
D.Bili → "Direct Bilirubin", TP → "Total Protein", Alb → "Albumin", Glob → "Globulin"
Na+ → "Sodium", K+ → "Potassium", Cl- → "Chloride", Ca++ → "Calcium"
TSH → "TSH (Thyroid Stimulating Hormone)", FT3/T3 → "Free T3", FT4/T4 → "Free T4"
VitD/25-OH-D → "Vitamin D (25-OH)", VitB12 → "Vitamin B12", Folate → "Folic Acid"
Fe → "Serum Iron", TIBC → "Total Iron Binding Capacity", Ferritin → "Serum Ferritin"
PSA → "PSA (Prostate Specific Antigen)", eGFR → "eGFR (Estimated GFR)"
CRP → "C-Reactive Protein (CRP)", HS-CRP → "High-Sensitivity CRP", ESR → "Erythrocyte Sedimentation Rate (ESR)"
Trop → "Troponin", CK-MB → "Creatine Kinase-MB"
For CBC: expand into individual components (Hemoglobin, WBC, RBC, Platelets, MCV, MCH, MCHC, Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils, Hematocrit, RDW)

═══ UNIT STANDARDIZATION ═══
mg/dl → "mg/dL", gm% → "g/dL", g% → "g/dL", 10^3/uL → "10³/µL", 10^6/uL → "10⁶/µL"
IU/L → "IU/L", mIU/mL → "µIU/mL", U/L → "U/L", ng/ml → "ng/mL", pg/ml → "pg/mL"
nmol/L → "nmol/L", mmol/L → "mmol/L", µg/dL → "µg/dL"

═══ VALUE EXTRACTION ═══
Extract exact strings: "12.4", "<0.5", ">200", "140-160", "Negative", "Positive", "Trace"
Fix OCR: l2.4 → 12.4, O.5 → 0.5, l → 1 (in numeric context)

═══ REFERENCE RANGES ═══
Extract EXACTLY as printed. Never guess. Examples: "40-60 mg/dL", "<100", "3.5-5.0", "12-16", "Negative"

═══ ABNORMAL FLAGGING (is_abnormal = true) ═══
Set true if ANY:
1. Value is outside reference range (compare numerically when possible)
2. Report flags with: H, L, High, Low, ↑, ↓, **, Abnormal, Critical, Panic
3. Value text contains "High", "Low", "Abnormal", "Critical", "Elevated", "Decreased"
4. Qualitative: "Positive" when reference is "Negative"

═══ METADATA ═══
- report_name: specific panel (e.g., "Complete Blood Count", "Lipid Profile")
- ordering_physician: doctor who ordered the test
- lab_name: laboratory/facility name
- report_date: → YYYY-MM-DD
- patient_name: from patient info section
- summary: impression, conclusion, or physician's note

═══ OUTPUT ═══
Return ONLY valid JSON. No markdown, no text outside JSON.
If a field is not present, OMIT it. Each result MUST have "test_name" and "value".`;

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    patient_name: { type: "string" },
    report_type: { type: "string", enum: ["Lab Result", "Imaging Scan", "Pathology", "Cardiology", "Other"] },
    report_date: { type: "string" },
    report_name: { type: "string" },
    ordering_physician: { type: "string" },
    lab_name: { type: "string" },
    summary: { type: "string" },
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          test_name: { type: "string" },
          value: { type: "string" },
          units: { type: "string" },
          reference_range: { type: "string" },
          is_abnormal: { type: "boolean" },
        },
        required: ["test_name", "value"],
      },
    },
  },
  required: ["report_type", "report_name"],
};

async function extractReportData(fileUrls) {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  const result = await InvokeLLM({
    prompt: REPORT_PROMPT,
    response_json_schema: REPORT_SCHEMA,
    file_urls: urls,
    model: "claude_sonnet_4_6",
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════
// STAGE 3: POST-EXTRACTION SANITIZATION
// ═══════════════════════════════════════════════════════════════

// Words that are NOT medicine names — if the LLM hallucinates these, filter them out
const NON_MEDICINE_TERMS = new Set([
  // Common words
  "water", "food", "milk", "tea", "coffee", "sugar", "salt", "bread", "rice",
  // Dosage forms (these describe the form, not the medicine)
  "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps",
  "syrup", "syrups", "syp", "injection", "injections", "inj", "drops", "drop",
  "cream", "creams", "ointment", "ointments", "spray", "sprays", "puff", "puffs",
  "sachet", "sachets", "teaspoon", "teaspoonful", "tablespoon",
  // Frequency / timing terms
  "daily", "twice", "thrice", "times", "once", "week", "weeks", "day", "days",
  "month", "months", "morning", "afternoon", "evening", "night", "bedtime",
  "before", "after", "with", "without", "empty", "stomach", "meal", "meals",
  // Instructions
  "take", "apply", "use", "continue", "stop", "follow", "review", "consult",
  "doctor", "physician", "clinic", "hospital", "pharmacy",
  // Symptoms / body parts
  "fever", "pain", "cough", "cold", "headache", "stomach", "throat", "chest",
  // Generic descriptors
  "medicine", "medication", "drug", "drugs", "pill", "pills",
]);

function sanitizeMedicines(medicines) {
  if (!Array.isArray(medicines)) return [];
  const seen = new Set();
  return medicines.filter((m) => {
    if (!m || !m.name) return false;
    const name = String(m.name).trim();
    if (name.length < 2) return false;
    if (!/[a-zA-Z]/.test(name)) return false; // must contain at least one letter
    const lower = name.toLowerCase();
    if (NON_MEDICINE_TERMS.has(lower)) return false;
    // Deduplicate (case-insensitive)
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function sanitizeResults(results) {
  if (!Array.isArray(results)) return [];
  const seen = new Set();
  return results.filter((r) => {
    if (!r || !r.test_name) return false;
    const name = String(r.test_name).trim();
    if (name.length < 2) return false;
    if (!/[a-zA-Z]/.test(name)) return false;
    const lower = name.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// DATE NORMALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalizes a date string from an LLM extraction into ISO YYYY-MM-DD.
 * Handles "March 15, 2024", "15/03/2024", "2024-03-15", "15-03-24", etc.
 * Returns null if the date cannot be parsed.
 */
export function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim();
  if (!s) return null;

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Try native Date parse (handles "March 15, 2024", "2024/03/15", ISO with time)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Numeric DD/MM/YYYY or MM/DD/YYYY (ambiguous — default to DD/MM for medical docs)
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    const ai = parseInt(a), bi = parseInt(b);
    if (ai > 12 && bi <= 12) return `${y}-${String(bi).padStart(2, "0")}-${String(ai).padStart(2, "0")}`; // DD/MM
    if (bi > 12 && ai <= 12) return `${y}-${String(ai).padStart(2, "0")}-${String(bi).padStart(2, "0")}`; // MM/DD
    // Ambiguous — assume DD/MM (common in prescriptions outside the US)
    return `${y}-${String(bi).padStart(2, "0")}-${String(ai).padStart(2, "0")}`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// COURSE COMPLETION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Parses a duration string ("7 days", "1 week", "2 months", "ongoing") into days.
 */
export function parseDurationDays(durationStr, category) {
  const d = (durationStr || "").toLowerCase();
  const match = d.match(/(\d+)\s*(day|week|month)/i);
  if (match) {
    const n = parseInt(match[1]);
    if (match[2].toLowerCase().startsWith("week")) return n * 7;
    if (match[2].toLowerCase().startsWith("month")) return n * 30;
    return n;
  }
  if (d.includes("ongoing") || d.includes("chronic") || d.includes("continue") || d.includes("lifelong")) return 90;
  if (category === "antibiotic") return 7;
  if (category === "chronic") return 90;
  return 7;
}

/**
 * Determines whether a prescription's medication course has already ended.
 * Returns false if the prescription has any ongoing/chronic medicine, or if the
 * prescription date is missing/invalid, or if the furthest end date is still in the future.
 */
export function isPrescriptionCourseCompleted(prescription) {
  if (!prescription || !prescription.prescription_date) return false;
  const startDate = new Date(prescription.prescription_date);
  if (isNaN(startDate.getTime())) return false;
  const medicines = prescription.medicines || [];
  if (medicines.length === 0) return false;

  // Chronic / ongoing medications never "complete"
  const hasOngoing = medicines.some((m) => {
    const d = (m.duration || "").toLowerCase();
    return d.includes("ongoing") || d.includes("chronic") || d.includes("continue") || d.includes("lifelong");
  });
  if (hasOngoing) return false;

  let maxEnd = new Date(startDate);
  for (const med of medicines) {
    const days = parseDurationDays(med.duration, med.category);
    const end = new Date(startDate);
    end.setDate(end.getDate() + days);
    if (end > maxEnd) maxEnd = end;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  maxEnd.setHours(0, 0, 0, 0);
  return maxEnd < today;
}

// ═══════════════════════════════════════════════════════════════
// FULL PIPELINES
// ═══════════════════════════════════════════════════════════════

export async function processPrescription(fileUrls) {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  // Stage 1: Validate
  const validation = await validateMedicalImage(urls);
  if (!validation.is_valid) {
    throw new ExtractionError("not_medical", validation.reason || "This doesn't appear to be a medical document.", {
      document_type: validation.document_type,
      confidence: validation.confidence,
    });
  }

  // Stage 2: Extract
  const raw = await extractPrescriptionData(urls);

  // Stage 3: Sanitize
  const medicines = sanitizeMedicines(raw.medicines || []);
  if (medicines.length === 0) {
    throw new ExtractionError("no_medicines", "Could not detect any medicines in this image. Please ensure the prescription is clearly visible and well-lit, then try again.");
  }

  // Stage 4: Normalize dates
  const prescription_date = normalizeDate(raw.prescription_date);

  return { ...raw, medicines, prescription_date };
}

export async function processHealthReport(fileUrls) {
  const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
  // Stage 1: Validate
  const validation = await validateMedicalImage(urls);
  if (!validation.is_valid) {
    throw new ExtractionError("not_medical", validation.reason || "This doesn't appear to be a medical document.", {
      document_type: validation.document_type,
      confidence: validation.confidence,
    });
  }

  // Stage 2: Extract
  const raw = await extractReportData(urls);

  // Stage 3: Sanitize
  const results = sanitizeResults(raw.results || []);
  if (results.length === 0 && !raw.summary) {
    throw new ExtractionError("no_results", "Could not extract any test results from this document. Please ensure the report is clearly visible and try again.");
  }

  // Stage 4: Normalize dates
  const report_date = normalizeDate(raw.report_date);

  return { ...raw, results, report_date };
}

// ═══════════════════════════════════════════════════════════════
// DRUG INTERACTION CHECK
// ═══════════════════════════════════════════════════════════════

export async function checkDrugInteractions(medicines) {
  if (!medicines || medicines.length < 2) return [];

  const medicineNames = medicines.map((m) => m.name).filter(Boolean).join(", ");

  const result = await InvokeLLM({
    prompt: `You are a clinical pharmacist specializing in drug-drug interactions. Analyze these medications for clinically significant interactions: ${medicineNames}

For each interaction found (moderate or severe only — skip mild interactions), provide:
- drug_a: first drug name (exactly as provided)
- drug_b: second drug name (exactly as provided)
- severity: "moderate" or "severe"
- description: one clear sentence in plain English explaining the risk and what to watch for

GUIDELINES:
- Only report interactions that are clinically meaningful and well-documented.
- Skip minor interactions (e.g., additive drowsiness between two antihistamines).
- Focus on: increased toxicity, decreased efficacy, serotonin syndrome, QT prolongation, bleeding risk, hepatotoxicity, nephrotoxicity, hypoglycemia/hyperglycemia, potassium abnormalities, CYP enzyme interactions.
- If no moderate or severe interactions exist, return an empty array.
- Do NOT hallucinate interactions. Only report interactions you are confident are real.

Return JSON with an "interactions" array.`,
    response_json_schema: {
      type: "object",
      properties: {
        interactions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              drug_a: { type: "string" },
              drug_b: { type: "string" },
              severity: { type: "string", enum: ["moderate", "severe"] },
              description: { type: "string" },
            },
            required: ["drug_a", "drug_b", "severity", "description"],
          },
        },
      },
      required: ["interactions"],
    },
  });

  return result?.interactions || [];
}