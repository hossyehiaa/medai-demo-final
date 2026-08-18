# medAI — Clinical Decision Support Web Application

A world-class clinical decision support interface powered by a Retrieval-Augmented Generation (RAG) pipeline grounded in USPSTF depression and suicide risk screening guidelines (June 2023).

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, **framer-motion**, and **OpenRouter** LLMs.

---

## Features

### Clinical Safety (Faithfully Ported from [MEDAI](https://github.com/hossyehiaa/MEDAI))

- **6-language crisis detection** (EN, ES, FR, ZH, VI, AR) with dual-mode handling
- **22-drug dosing gate** — refuses medication dosing queries with zero LLM calls
- **Confidence gate** (threshold 0.76) — rejects low-confidence out-of-scope queries
- **Prompt injection detection** — blocks adversarial inputs
- **988 Suicide & Crisis Lifeline** referral for acute distress
- **Professional disclaimer** appended to every response

### RAG Pipeline

- **728 clinical chunks** from USPSTF guidelines (Evidence Review, Clinician Summary)
- **Hybrid retrieval**: TF-IDF cosine similarity + BM25 + keyword overlap
- **Section priors boost** (Recommendation: 1.3x, Clinical Considerations: 1.2x)
- **Perinatal & older adults query boosts**
- **Diversity selection** (max 1 chunk per document)
- **6-section schema**: Recommendation, Population, Screening Tool, Harms, Evidence, Source

### LLM Generation

- **OpenRouter** with model cascade: DeepSeek V3 → Llama-3.3-70B → Qwen3-235B → Mock fallback
- **Streaming responses** via Server-Sent Events (SSE)
- **Citation verification** — every quote checked against retrieved context
- **Anti-hallucination prompt** with 9 grounding rules

### UI & Animations

- **Aurora background** — 3 drifting gradient blobs (teal/blue/violet)
- **Glassmorphism surfaces** — backdrop-blur-xl with subtle borders
- **Citation pills** — expandable with pop-in animation and shimmer hover
- **Safety badges** — pulsing red for crisis, color-coded by status
- **Staggered hero reveal** — headline, subtitle, query chips animate in sequence
- **Streaming caret** — blinking teal caret follows last token
- **Theme toggle** — smooth cross-fade between light/dark mode
- **Chat history** — localStorage-persisted with animated sidebar
- **Reduced motion** support — all animations respect prefers-reduced-motion
- **Mobile responsive** — optimized for 375px, 768px, 1440px

---

## Quick Start

```bash
git clone https://github.com/hossyehiaa/medai-demo-final.git
cd medai-demo-final
npm install
echo "OPENROUTER_API_KEY=your_key_here" > .env.local
npm run dev
```

---

## Architecture

```
src/
├── app/
│   ├── api/chat/route.ts    # SSE streaming API endpoint
│   ├── layout.tsx           # Shell: nav, fonts, theme, aurora
│   ├── page.tsx             # Chat UI: hero, messages, input
│   └── globals.css          # Design system + custom animations
├── components/
│   ├── AuroraBackground.tsx  # A1: drifting gradient blobs
│   ├── ChatMessage.tsx       # A5-A11: message rendering
│   ├── CitationPill.tsx      # A9: expandable citation
│   ├── SafetyBadge.tsx       # A10: status-aware badge
│   ├── TypingIndicator.tsx   # A6: bouncing dots
│   ├── SuggestedQueries.tsx  # A3-A4: staggered query chips
│   ├── HistorySidebar.tsx    # A16: chat history
│   ├── ScrollToLatest.tsx    # A12: floating scroll button
│   ├── ThemeToggle.tsx       # A13: light/dark cross-fade
│   ├── SendButton.tsx        # A14: micro-interactions
│   └── StreamCaret.tsx       # A7: blinking caret
├── lib/
│   ├── safety-gates.ts       # Crisis, dosing, confidence, injection
│   ├── retrieval.ts          # TF-IDF + BM25 hybrid search
│   ├── llm-client.ts         # OpenRouter streaming client
│   ├── prompt-builder.ts     # System prompt + 6-section schema
│   ├── rag-pipeline.ts       # Full pipeline orchestrator
│   └── stream-chat.ts        # SSE client-side parser
└── public/
    └── chunks.json           # 728 pre-computed clinical chunks
```

---

## Safety Gates

| Gate | Trigger | Response | LLM Call? |
|------|---------|----------|-----------|
| CRISIS_REFUSAL | Personal distress / suicidal ideation | 988 Lifeline referral | No |
| CRISIS_RESOURCE | Informational suicide screening query | Proceed + tag touchpoint | Yes |
| DOSING | Medication dosing query (22 drugs) | Consult a licensed prescriber | No |
| LOW_CONFIDENCE | Retrieval confidence < 0.76 | Insufficient evidence | No |
| INJECTION | Prompt injection pattern | Blocked by safety filters | No |

---

## Design System

| Token | Value |
|-------|-------|
| Primary | Teal #0D9488 → #0F766E |
| Accent | Blue #3B82F6 |
| Surface | Glassmorphism: bg-white/70 backdrop-blur-xl |
| Display Font | Geist Sans |
| Mono Font | Geist Mono |
| Motion | framer-motion, spring (stiffness:120, damping:14) |

---

Built for safer clinical decision support.
