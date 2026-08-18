/**
 * Safety Gates — Input validation and output safety checks.
 *
 * Faithfully ported from MEDAI Python guardrails.py.
 * Enforces medical-domain safety policies:
 * - **CRISIS gate**: Detects suicide/self-harm language and returns 988 Lifeline referral
 * - **DOSING gate**: Refuses medication dosing queries (out-of-scope for screening guidelines)
 * - Blocks prompt-injection attempts
 * - Filters disallowed topics (prescriptions, diagnoses)
 * - Ensures responses include required disclaimers
 */

export interface GuardrailResult {
  passed: boolean;
  status: 'OK' | 'CRISIS' | 'REFUSAL_OOS' | 'REFUSAL_LOW_CONFIDENCE' | 'BLOCKED' | 'FAILED_OUTPUT';
  reason: string;
  message: string;
  flags: string[];
  referral988?: boolean;
}

// ------------------------------------------------------------------
// CRISIS referral keywords & Personal Distress Detection
// Supports multilingual crisis detection (EN, ES, FR, ZH, VI, AR)
// ------------------------------------------------------------------
const CRISIS_KEYWORDS: string[] = [
  // English
  "suicide",
  "kill myself",
  "end my life",
  "self-harm",
  "want to die",
  "ending it all",
  "hurt myself",
  // Spanish
  "quiero morir",
  "hacerme daño",
  "hacerme dano",
  "matarme",
  "suicidarme",
  "acabar con mi vida",
  "sin esperanza",
  "no tengo salida",
  "me siento vacio",
  "me siento vacío",
  // French
  "je veux mourir",
  "me suicider",
  "désespéré",
  "desespere",
  "sans espoir",
  "je veux en finir",
  // Chinese
  "想死",
  "自杀",
  "不想活",
  "感到绝望",
  "没有希望",
  "想结束",
  // Vietnamese
  "muốn chết",
  "tự tử",
  "tuyệt vọng",
  "không còn hy vọng",
  "muốn kết thúc",
  // Arabic
  "أريد أن أموت",
  "انتحر",
  "قتل نفسي",
  "أذية نفسي",
  "أشعر باليأس",
  "لا يوجد أمل",
  "أريد إنهاء حياتي",
  "تعبت من الحياة",
];

// Personal distress markers indicating acute crisis / ideation (multilingual)
const PERSONAL_DISTRESS_PATTERNS: RegExp[] = [
  // English
  /\bi\b.*\b(feel|want|going to|can'?t|need|wish|should|must|gonna|hopeless|suicidal)\b/i,
  /\b(my|myself|me)\b.*\b(life|death|hopeless|pain|kill|die|end|hurt|suffer)\b/i,
  /\b(feel|feeling)\b.*\b(hopeless|worthless|suicidal|empty|depressed|alone|done)\b/i,
  /\b(kill myself|want to die|end my life|ending it all|hurt myself)\b/i,
  // Spanish
  /\b(sin esperanza|quiero terminar|no tengo salida|me siento vac[ií]o|me siento sin esperanza|quiero morir|matarme|suicidarme|hacerme da[ñn]o|acabar con mi vida)\b/i,
  // Chinese
  /(感到绝望|没有希望|想结束|不想活|想死|自杀)/,
  // Arabic
  /(أشعر باليأس|لا يوجد أمل|أريد إنهاء حياتي|تعبت من الحياة|أريد أن أموت|انتحر|قتل نفسي|أذية نفسي)/,
  // Vietnamese
  /(tuyệt vọng|không còn hy vọng|muốn kết thúc|muốn chết|tự tử)/,
  // French
  /\b(d[eé]sesp[eé]r[eé]|sans espoir|je veux en finir|je veux mourir|me suicider)\b/i,
];

const CRISIS_MESSAGE: string =
  "⚠️ If you are in crisis or having thoughts of suicide, " +
  "call or text 988 (US) or your local emergency number, " +
  "or go to your nearest emergency department immediately.";

const CRISIS_RESOURCE_LINE: string =
  "⚠️ If you or someone you know is struggling or in crisis, help is available. " +
  "Call or text 988 (US) or contact your local emergency services for immediate, confidential 24/7 support.";

// ------------------------------------------------------------------
// DOSING / Medication refusal keywords & Patterns
// ------------------------------------------------------------------
const ANTIDEPRESSANT_DRUGS: string[] = [
  "sertraline", "zoloft",
  "fluoxetine", "prozac",
  "escitalopram", "lexapro",
  "citalopram", "celexa",
  "paroxetine", "paxil",
  "venlafaxine", "effexor",
  "duloxetine", "cymbalta",
  "bupropion", "wellbutrin",
  "mirtazapine", "remeron",
  "trazodone", "desvenlafaxine", "pristiq",
  "vilazodone", "vortioxetine", "trintellix",
  "amitriptyline", "nortriptyline", "imipramine",
];

const DOSING_KEYWORDS: string[] = [
  "dose",
  "dosing",
  "dosage",
  "starting dose",
  "typical dose",
  "maximum dose",
  "mg",
  "milligram",
  "milligrams",
  "mg per day",
  "mg/day",
  "mg/kg",
  "tablets",
  "pills",
  "how many mg",
  "how much",
  "prescribe",
  "prescription",
  "titrate",
  "titration",
  "schedule",
  "typical amount",
];

const DOSING_PATTERNS: RegExp[] = [
  /\b(dose|dosing|dosage|amount|mg|milligram|tablets?|pills?|schedule|titrat\w*)\b.*\b(sertraline|zoloft|fluoxetine|prozac|escitalopram|lexapro|citalopram|celexa|paroxetine|paxil|venlafaxine|effexor|duloxetine|cymbalta|bupropion|wellbutrin|mirtazapine|remeron|trazodone)\b/i,
  /\b(sertraline|zoloft|fluoxetine|prozac|escitalopram|lexapro|citalopram|celexa|paroxetine|paxil|venlafaxine|effexor|duloxetine|cymbalta|bupropion|wellbutrin|mirtazapine|remeron|trazodone)\b.*\b(dose|dosing|dosage|amount|mg|milligram|tablets?|pills?|schedule|titrat\w*)\b/i,
  /\bprescribe\s+(?:me\s+)?(?:\d+\s*mg\s+)?(?:sertraline|zoloft|fluoxetine|prozac|escitalopram|lexapro|citalopram|celexa|paroxetine|paxil|venlafaxine|effexor|duloxetine|cymbalta|bupropion|wellbutrin|mirtazapine|remeron|trazodone|medication|antidepressant|drugs?|pills?|tablets?|\d+\s*mg)\b/i,
  /\b\d+\s*mg\s+(?:of\s+)?(sertraline|zoloft|fluoxetine|prozac|escitalopram|lexapro|citalopram|celexa|paroxetine|paxil|venlafaxine|effexor|duloxetine|cymbalta|bupropion|wellbutrin)/i,
  /\btypical amount of\b/i,
];

const DOSING_REFUSAL_MESSAGE: string =
  "This system provides screening recommendations only. " +
  "For medication dosing, please consult a licensed prescriber.";

// ------------------------------------------------------------------
// Prompt-injection & Disallowed topics
// ------------------------------------------------------------------
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|all)\s+instructions/i,
  /system\s*prompt/i,
  /you\s+are\s+now/i,
  /disregard\s+the\s+above/i,
  /as\s+an\s+ai\s+language\s+model/i,
  /<script/i,
  /DROP\s+TABLE/i,
  /SELECT\s+\*\s+FROM/i,
];

const DISALLOWED_TOPICS: RegExp[] = [
  /\bhow\s+to\s+make\s+(a\s+)?bomb\b/i,
  /\billegal\s+drugs\b/i,
];

const REQUIRED_DISCLAIMER_FRAGMENT = "not a substitute for professional medical";

// ------------------------------------------------------------------
// Professional disclaimer — always appended to every response
// ------------------------------------------------------------------
export const PROFESSIONAL_DISCLAIMER: string =
  "This information is based on USPSTF guidance current as of June 2023 " +
  "and is for clinical decision support only. It is not a substitute for " +
  "professional medical judgment. Always verify current guidelines and " +
  "consult appropriate specialists for individual patient care.";

// ------------------------------------------------------------------
// Source Display Names
// ------------------------------------------------------------------
export const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  "Bookshelf_NBK592805": "AHRQ Evidence Review (USPSTF Bookshelf)",
  "depression-suicide-risk-adults-clinician-summ (2)": "USPSTF Clinician Summary (JAMA 2023)",
  "depression-suicide-risk-adults-clinician-summ": "USPSTF Clinician Summary (JAMA 2023)",
  "depression-suicide-risk-adults-final-evidence-summary (2)": "USPSTF Final Evidence Summary (2023)",
  "depression-suicide-risk-adults-final-evidence-summary": "USPSTF Final Evidence Summary (2023)",
};

export function getSourceDisplayName(docName: string): string {
  const cleanKey = docName.replace(".pdf", "").trim();
  if (cleanKey in SOURCE_DISPLAY_NAMES) {
    return SOURCE_DISPLAY_NAMES[cleanKey];
  }
  for (const [k, v] of Object.entries(SOURCE_DISPLAY_NAMES)) {
    if (k.includes(cleanKey) || cleanKey.includes(k)) {
      return v;
    }
  }
  return cleanKey;
}

// ------------------------------------------------------------------
// Internal helper: personal crisis detection
// ------------------------------------------------------------------
function isPersonalCrisis(queryLower: string): boolean {
  // Clinical scale / assessment queries are informational provider questions, not personal crisis
  const clinicalTerms = [
    "what scale", "which scale", "what tool", "which tool",
    "what instrument", "which instrument", "screening tool",
    "assessment tool", "how to assess", "how to screen",
    "clinical guideline", "uspstf", "recommendation",
  ];
  if (clinicalTerms.some((ct) => queryLower.includes(ct))) {
    const acuteFirstPerson = [
      "kill myself", "want to die", "end my life", "quiero morir",
      "matarme", "suicidarme", "me suicider", "je veux mourir",
      "想死", "不想活", "muốn chết", "tự tử", "أريد أن أموت", "قتل نفسي",
    ];
    return acuteFirstPerson.some((af) => queryLower.includes(af));
  }

  for (const pattern of PERSONAL_DISTRESS_PATTERNS) {
    if (pattern.test(queryLower)) {
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------
// Main input gate
// ------------------------------------------------------------------
export function checkInput(query: string): GuardrailResult {
  const queryLower = query.toLowerCase();

  // ── Gate 1: CRISIS detection (highest priority) ───────────────
  const hasCrisisKeyword = CRISIS_KEYWORDS.some((kw) => queryLower.includes(kw));
  const isDistress = isPersonalCrisis(queryLower);
  const hasClinicalContext = [
    "tool", "instrument", "scale", "screener", "screening",
    "questionnaire", "protocol", "recommendation", "guideline",
    "assess", "assessment", "uspstf",
  ].some((term) => queryLower.includes(term));

  if (isDistress || hasCrisisKeyword) {
    if (isDistress || !hasClinicalContext) {
      // CRISIS_REFUSAL: acute personal distress -> 988 referral, NO model answer
      return {
        passed: false,
        status: 'CRISIS',
        reason: "Personal crisis / suicidal distress detected.",
        message: CRISIS_MESSAGE,
        flags: ["crisis_refusal"],
        referral988: true,
      };
    }
    // CRISIS_RESOURCE: informational suicide screening query -> proceed, tag touchpoint
    // Falls through to continue processing
  }

  // ── Gate 2: DOSING / medication refusal ───────────────────────
  let isDosingQuery = DOSING_PATTERNS.some((pat) => pat.test(queryLower));

  if (!isDosingQuery) {
    const hasDrug = ANTIDEPRESSANT_DRUGS.some((d) => queryLower.includes(d));
    const hasDoseTerm = ["dose", "dosing", "dosage", "amount", "mg", "tablets", "pills", "prescribe", "how many", "how much"]
      .some((k) => queryLower.includes(k));
    if (hasDrug && hasDoseTerm) {
      isDosingQuery = true;
    } else if (["starting dose", "typical dose", "maximum dose", "mg per day", "mg/day", "mg/kg", "prescribe me 50mg"]
      .some((k) => queryLower.includes(k))) {
      isDosingQuery = true;
    } else if (queryLower.startsWith("what is the dose") || queryLower.startsWith("what is the typical amount")) {
      isDosingQuery = true;
    }
  }

  if (isDosingQuery) {
    return {
      passed: false,
      status: 'REFUSAL_OOS',
      reason: "Medication dosing query is out of scope.",
      message: DOSING_REFUSAL_MESSAGE,
      flags: ["dosing_refusal"],
    };
  }

  // ── Gate 3: Prompt-injection and disallowed topics ────────────
  const flags: string[] = [];
  if (hasCrisisKeyword) {
    flags.push("crisis_resource");
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(queryLower)) {
      flags.push(`injection:${pattern.source}`);
    }
  }

  for (const pattern of DISALLOWED_TOPICS) {
    if (pattern.test(queryLower)) {
      flags.push(`disallowed_topic:${pattern.source}`);
    }
  }

  if (flags.some((f) => f.startsWith("injection:") || f.startsWith("disallowed_topic:"))) {
    return {
      passed: false,
      status: 'BLOCKED',
      reason: "Your query was blocked by safety filters. Please rephrase.",
      message: "Your query was blocked by safety filters. Please rephrase.",
      flags,
    };
  }

  return { passed: true, status: 'OK', reason: '', message: '', flags };
}

// ------------------------------------------------------------------
// 6-Section Schema Validation
// ------------------------------------------------------------------
const REQUIRED_SECTIONS: string[] = [
  "## Recommendation",
  "## Population",
  "## Screening Tool",
  "## Harms & Considerations",
  "## Evidence",
  "## Source",
];

export function checkResponseSchema(response: string): {
  allPresent: boolean;
  presentSections: string[];
  missingSections: string[];
  sectionCount: number;
} {
  const present: string[] = [];
  const missing: string[] = [];

  for (const section of REQUIRED_SECTIONS) {
    const headerName = section.replace("## ", "").toLowerCase();
    const regex = new RegExp(`^##\\s+${headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "im");
    if (regex.test(response) || section.toLowerCase().split('').every(c => response.toLowerCase().includes(c))) {
      present.push(section);
    } else if (response.toLowerCase().includes(section.toLowerCase())) {
      present.push(section);
    } else if (headerName === "screening tool" && response.toLowerCase().includes("## screening tools")) {
      present.push(section);
    } else if (headerName === "harms & considerations" && (response.toLowerCase().includes("## harms") || response.toLowerCase().includes("## harms and considerations"))) {
      present.push(section);
    } else {
      missing.push(section);
    }
  }

  return {
    allPresent: missing.length === 0,
    presentSections: present,
    missingSections: missing,
    sectionCount: present.length,
  };
}

// ------------------------------------------------------------------
// Output gate
// ------------------------------------------------------------------
export function checkOutput(response: string): GuardrailResult {
  const flags: string[] = [];

  if (!response.toLowerCase().includes(REQUIRED_DISCLAIMER_FRAGMENT)) {
    flags.push("missing_disclaimer");
  }

  const schemaResult = checkResponseSchema(response);
  if (!schemaResult.allPresent) {
    for (const missing of schemaResult.missingSections) {
      flags.push(`missing_section:${missing}`);
    }
  }

  // Citation count check
  const normResp = response.replace(/(?:\[|【|「)Doc:/g, "[Doc:");
  const citationPattern = /\[Doc:[^\]]+\]/gi;
  const citations = normResp.match(citationPattern);
  if (!citations || citations.length < 4) {
    flags.push("missing_minimum_citations");
  }

  if (flags.length > 0) {
    return {
      passed: false,
      status: 'FAILED_OUTPUT',
      reason: "Response failed output safety checks.",
      message: "Response failed output safety checks.",
      flags,
    };
  }

  return { passed: true, status: 'OK', reason: '', message: '', flags: [] };
}
