/**
 * Retrieval — TF-IDF cosine similarity + BM25 hybrid vector search for clinical chunks.
 *
 * Loads chunks from public/chunks.json. Implements:
 * - TF-IDF vectorization for query and chunks
 * - BM25 scoring for lexical matching
 * - Keyword overlap bonus
 * - Cosine similarity scoring (hybrid)
 * - Section priors boost (same as MEDAI)
 * - Perinatal/older-adults boost
 * - Top-K=3 results with confidence scores
 * - Diversity: max 1 chunk per document
 */

import { getSourceDisplayName } from './safety-gates';

export interface Chunk {
  chunk_id: number;
  text: string;
  document_name: string;
  section_name: string;
  page: number;
  start_page: number;
  end_page: number;
  metadata?: {
    source?: string;
    section?: string;
  };
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
  confidence: number;
  boostedScore: number;
  sectionPrior: number;
  perinatalBoosted: boolean;
  olderAdultsBoosted: boolean;
  displayName: string;
}

// ── Configuration (ported from MEDAI settings.py) ──────────────────
const TOP_K_FINAL = 3;
const CONFIDENCE_THRESHOLD = 0.76;

const SECTION_PRIORS: Record<string, number> = {
  "Recommendation": 1.30,
  "Clinical Considerations": 1.20,
  "Practice Considerations": 1.15,
  "General": 1.10,
  "Table": 0.85,
  "Recommendations of Others": 0.70,
  "References": 0.40,
  "Bibliography": 0.30,
  "Metadata": 0.30,
};

const PERINATAL_QUERY_KEYWORDS = ["pregnant", "postpartum", "perinatal", "epds", "edinburgh"];
const PERINATAL_CHUNK_KEYWORDS = ["EPDS", "Edinburgh", "postpartum", "perinatal"];
const PERINATAL_BOOST = 1.25;

const OLDER_ADULTS_QUERY_KEYWORDS = ["over 65", "older adults", "geriatric", "elderly", "seniors", "gds"];
const OLDER_ADULTS_CHUNK_KEYWORDS = ["GDS", "Geriatric Depression Scale", "older adults", "65 years", "geriatric", "elderly"];
const OLDER_ADULTS_BOOST = 1.10;

// ── Tokenizer ──────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// ── Hybrid Search Engine (TF-IDF + BM25 + Keyword Overlap) ────────

class HybridSearchEngine {
  private chunks: Chunk[];
  private chunkTokens: string[][];
  private avgDocLen: number;
  private df: Map<string, number> = new Map();
  private vocab: string[];
  private idf: Map<string, number> = new Map();
  private chunkTF: Map<string, number>[];
  private chunkVectors: Float64Array[] = [];
  private N: number;

  // BM25 parameters
  private k1 = 1.5;
  private b = 0.75;

  constructor(chunks: Chunk[]) {
    this.chunks = chunks;
    this.N = chunks.length;
    this.chunkTokens = chunks.map((c) => tokenize(c.text));
    this.avgDocLen = this.chunkTokens.reduce((sum, t) => sum + t.length, 0) / (this.N || 1);
    this.chunkTF = this.chunkTokens.map((tokens) => this.termFrequency(tokens));

    // Compute document frequency
    for (const tokens of this.chunkTokens) {
      const unique = new Set(tokens);
      for (const token of unique) {
        this.df.set(token, (this.df.get(token) || 0) + 1);
      }
    }

    // Build vocabulary (terms appearing in at least 2 documents)
    this.vocab = Array.from(this.df.entries())
      .filter(([, count]) => count >= 2)
      .map(([term]) => term)
      .sort();

    // Compute IDF with BM25-style smoothing
    for (const term of this.vocab) {
      const dfCount = this.df.get(term) || 1;
      this.idf.set(term, Math.log((this.N - dfCount + 0.5) / (dfCount + 0.5) + 1));
    }

    // Pre-compute chunk TF-IDF vectors
    for (let i = 0; i < chunks.length; i++) {
      this.chunkVectors.push(this.vectorize(this.chunkTF[i]));
    }
  }

  private termFrequency(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    return tf;
  }

  private vectorize(tf: Map<string, number>): Float64Array {
    const vec = new Float64Array(this.vocab.length);
    for (let j = 0; j < this.vocab.length; j++) {
      const term = this.vocab[j];
      const tfVal = tf.get(term) || 0;
      const idfVal = this.idf.get(term) || 0;
      // Use 1 + log(tf) for better normalization
      vec[j] = (tfVal > 0 ? (1 + Math.log(tfVal)) : 0) * idfVal;
    }
    return vec;
  }

  private cosineSimilarity(a: Float64Array, b: Float64Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private bm25Score(queryTokens: string[], chunkIndex: number): number {
    const chunkTf = this.chunkTF[chunkIndex];
    const docLen = this.chunkTokens[chunkIndex].length;
    let score = 0;

    for (const token of queryTokens) {
      const tf = chunkTf.get(token) || 0;
      if (tf === 0) continue;
      const idf = this.idf.get(token);
      if (!idf) continue;
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLen));
      score += idf * (numerator / denominator);
    }

    return score;
  }

  private keywordOverlap(queryTokens: string[], chunkIndex: number): number {
    const chunkSet = new Set(this.chunkTokens[chunkIndex]);
    const querySet = new Set(queryTokens);
    let overlap = 0;
    for (const token of querySet) {
      if (chunkSet.has(token)) overlap++;
    }
    return querySet.size > 0 ? overlap / querySet.size : 0;
  }

  search(query: string, topK: number): { index: number; score: number; confidence: number }[] {
    const queryTokens = tokenize(query);
    const queryTf = this.termFrequency(queryTokens);
    const queryVec = this.vectorize(queryTf);

    const scores: { index: number; score: number; confidence: number }[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      // 1. TF-IDF cosine similarity
      const cosineScore = this.cosineSimilarity(queryVec, this.chunkVectors[i]);

      // 2. BM25 score (normalized)
      const bm25Raw = this.bm25Score(queryTokens, i);
      const bm25Score = bm25Raw / (1 + bm25Raw); // Sigmoid-like normalization to [0,1)

      // 3. Keyword overlap
      const kwOverlap = this.keywordOverlap(queryTokens, i);

      // 4. Hybrid score: weighted combination
      // Cosine captures semantic similarity, BM25 captures lexical relevance, KW overlap is direct match
      const hybridScore = 0.35 * cosineScore + 0.40 * bm25Score + 0.25 * kwOverlap;

      // 5. Confidence calibration: map to [0,1] range with better distribution
      // Use sigmoid to boost scores in the meaningful range
      const calibratedConfidence = 1 / (1 + Math.exp(-8 * (hybridScore - 0.3)));

      scores.push({
        index: i,
        score: hybridScore,
        confidence: calibratedConfidence,
      });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK * 5); // Get more candidates for diversity selection
  }

  getChunk(index: number): Chunk {
    return this.chunks[index];
  }
}

// ── Cached engine ──────────────────────────────────────────────────

let engine: HybridSearchEngine | null = null;
let chunksCache: Chunk[] | null = null;

async function loadChunks(): Promise<Chunk[]> {
  if (chunksCache) return chunksCache;

  try {
    const fs = await import('fs');
    const path = await import('path');
    const chunksPath = path.join(process.cwd(), 'public', 'chunks.json');
    const raw = fs.readFileSync(chunksPath, 'utf-8');
    chunksCache = JSON.parse(raw);
    return chunksCache!;
  } catch {
    const resp = await fetch(new URL('/chunks.json', 'http://localhost:3000'));
    chunksCache = await resp.json();
    return chunksCache!;
  }
}

async function getEngine(): Promise<HybridSearchEngine> {
  if (engine) return engine;
  const chunks = await loadChunks();
  engine = new HybridSearchEngine(chunks);
  return engine;
}

// ── Population boost helpers ───────────────────────────────────────

function isPerinatalQuery(query: string): boolean {
  const qLower = query.toLowerCase();
  return PERINATAL_QUERY_KEYWORDS.some((kw) => qLower.includes(kw.toLowerCase()));
}

function chunkMatchesPerinatal(chunk: Chunk): boolean {
  const text = chunk.text.toLowerCase();
  return PERINATAL_CHUNK_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function isOlderAdultsQuery(query: string): boolean {
  const qLower = query.toLowerCase();
  return OLDER_ADULTS_QUERY_KEYWORDS.some((kw) => qLower.includes(kw.toLowerCase()));
}

function chunkMatchesOlderAdults(chunk: Chunk): boolean {
  const text = chunk.text.toLowerCase();
  const hasPop = OLDER_ADULTS_CHUNK_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
  const hasScreening = ["screen", "screening", "depression", "depressive", "mdd"].some((term) => text.includes(term));
  return hasPop && hasScreening;
}

// ── Main retrieval function ────────────────────────────────────────

export async function retrieve(query: string): Promise<{
  results: RetrievalResult[];
  avgConfidence: number;
  top1Confidence: number;
  isInScope: boolean;
  confidenceThreshold: number;
  isPerinatalQuery: boolean;
  isOlderAdultsQuery: boolean;
  diversityWarning: boolean;
  uniqueDocumentsCount: number;
}> {
  const eng = await getEngine();

  // Step 1: Get candidate scores
  const candidates = eng.search(query, TOP_K_FINAL);

  const isPerinatal = isPerinatalQuery(query);
  const isOlderAdults = isOlderAdultsQuery(query);

  // Step 2: Apply boosts and build results
  const scoredResults: RetrievalResult[] = candidates.map(({ index, score, confidence: rawConfidence }) => {
    const chunk = eng.getChunk(index);
    const displayName = getSourceDisplayName(chunk.document_name);

    let confidence = rawConfidence;
    let perinatalBoosted = false;
    let olderAdultsBoosted = false;

    // Perinatal boost
    if (isPerinatal && chunkMatchesPerinatal(chunk)) {
      confidence = Math.min(confidence * PERINATAL_BOOST, 1.0);
      perinatalBoosted = true;
    }

    // Older Adults boost
    if (isOlderAdults && chunkMatchesOlderAdults(chunk)) {
      confidence = Math.min(confidence * OLDER_ADULTS_BOOST, 1.0);
      olderAdultsBoosted = true;
    }

    // Section prior boost
    const section = chunk.section_name;
    const textLower = chunk.text.toLowerCase();

    let prior = SECTION_PRIORS[section] ?? 1.0;

    // Demote AAFP recommendation table header pattern
    if (textLower.includes("| condition |") && textLower.includes("| organization") && textLower.includes("| recommendation")) {
      prior = 0.40;
    } else if (
      section === "General" &&
      ["percent", "screening rate", "namcs", "2014", "statistics", "prevalence", "percent of adults"].some((k) => textLower.includes(k))
    ) {
      prior = 0.50;
    }

    const boostedScore = confidence * prior;

    return {
      chunk,
      score,
      confidence,
      boostedScore,
      sectionPrior: Math.round(prior * 10000) / 10000,
      perinatalBoosted,
      olderAdultsBoosted,
      displayName,
    };
  });

  // Sort by boosted score descending
  scoredResults.sort((a, b) => b.boostedScore - a.boostedScore);

  // Step 3: Greedy diversity selection — max 1 per document in top-K
  const finalResults: RetrievalResult[] = [];
  const droppedDuplicates: RetrievalResult[] = [];
  const seenDocs = new Set<string>();

  for (const cand of scoredResults) {
    const docName = cand.chunk.document_name;
    if (!seenDocs.has(docName)) {
      seenDocs.add(docName);
      finalResults.push(cand);
      if (finalResults.length === TOP_K_FINAL) break;
    } else {
      droppedDuplicates.push(cand);
    }
  }

  // Fallback: fill remaining slots from dropped duplicates
  if (finalResults.length < TOP_K_FINAL && droppedDuplicates.length > 0) {
    for (const cand of droppedDuplicates) {
      if (cand.confidence >= 0.3 || finalResults.length === 0) {
        finalResults.push(cand);
        if (finalResults.length === TOP_K_FINAL) break;
      }
    }
  }

  // If still under top-K, backfill
  if (finalResults.length < TOP_K_FINAL) {
    for (const cand of scoredResults) {
      if (!finalResults.includes(cand)) {
        finalResults.push(cand);
        if (finalResults.length === TOP_K_FINAL) break;
      }
    }
  }

  // Compute confidence summary
  const confidences = finalResults.map((r) => r.confidence);
  const avgConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 10000) / 10000
    : 0;
  const top1Confidence = finalResults.length > 0 ? finalResults[0].confidence : 0;
  const uniqueDocsCount = new Set(finalResults.map((r) => r.chunk.document_name)).size;
  const hasDiversityWarning = uniqueDocsCount < Math.min(2, finalResults.length);

  return {
    results: finalResults,
    avgConfidence,
    top1Confidence,
    isInScope: top1Confidence >= CONFIDENCE_THRESHOLD,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    isPerinatalQuery: isPerinatal,
    isOlderAdultsQuery: isOlderAdults,
    diversityWarning: hasDiversityWarning,
    uniqueDocumentsCount: uniqueDocsCount,
  };
}
