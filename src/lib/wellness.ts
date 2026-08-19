// Wellness Notes — Tavily-powered supportive (NON-medical) content.
// Falls back to curated resources + DuckDuckGo if TAVILY_API_KEY is missing.

export interface WellnessNote {
  source: string;
  url: string;
  quote: string;
}

const THEME_RULES: Array<{ test: RegExp; theme: string }> = [
  { test: /pregnan|postpartum|perinatal|maternal/i, theme: "perinatal emotional wellness and self-care" },
  { test: /older adult|elderly|senior|geriatric|over 65/i, theme: "emotional wellbeing for older adults" },
  { test: /anxi/i, theme: "anxiety coping strategies and grounding techniques" },
  { test: /stress|burnout/i, theme: "stress reduction and self-care techniques" },
  { test: /depress|sad|low mood|hopeless/i, theme: "depression coping strategies and emotional support" },
  { test: /screen|phq|epds|gds|mental health/i, theme: "mental health self-care tips" },
];

function extractThemes(query: string): string[] {
  const themes: string[] = [];
  for (const rule of THEME_RULES) {
    if (rule.test.test(query)) themes.push(rule.theme);
    if (themes.length >= 2) break;
  }
  if (themes.length === 0) themes.push("emotional wellness and self-care tips");
  return themes.slice(0, 2);
}

const FALLBACK_NOTES: WellnessNote[] = [
  {
    source: "SAMHSA National Helpline",
    url: "https://www.samhsa.gov/find-help/national-helpline",
    quote:
      "SAMHSA's National Helpline is a free, confidential, 24/7, 365-day-a-year treatment referral and information service for individuals and families facing mental and/or substance use disorders.",
  },
  {
    source: "NIMH — Caring for Your Mental Health",
    url: "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    quote:
      "Self-care means taking the time to do things that help you live well and improve both your physical health and mental health. Even small acts of self-care in your daily life can have a big impact.",
  },
];

async function tavilySearch(theme: string): Promise<WellnessNote | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${theme} supportive coping resources (non-medical)`,
        search_depth: "basic",
        max_results: 3,
        exclude_domains: ["reddit.com", "quora.com", "pinterest.com"],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data.results || [])[0];
    if (!first?.url) return null;
    return {
      source: first.title || "Wellness Resource",
      url: first.url,
      quote: String(first.content || "").slice(0, 220).trim() + "…",
    };
  } catch {
    return null;
  }
}

async function duckDuckGoSearch(theme: string): Promise<WellnessNote | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(theme)}&format=json&no_html=1&skip_disambig=1`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.AbstractText && data.AbstractURL) {
      return {
        source: data.Heading || "Wellness Resource",
        url: data.AbstractURL,
        quote: String(data.AbstractText).slice(0, 220).trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchWellnessNotes(query: string): Promise<WellnessNote[]> {
  const themes = extractThemes(query);
  const notes: WellnessNote[] = [];

  for (const theme of themes) {
    let note = await tavilySearch(theme);
    if (!note) note = await duckDuckGoSearch(theme);
    if (note) notes.push(note);
    if (notes.length >= 2) break;
  }

  // Guaranteed at least one supportive resource
  if (notes.length === 0) notes.push(FALLBACK_NOTES[0]);
  return notes.slice(0, 2);
}
