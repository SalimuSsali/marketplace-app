/**
 * Global ranked item search: token dictionary, edit-distance spell correction,
 * weighted scoring (title > tags > description), fuzzy word matches.
 *
 * Future: For huge datasets or full-text needs, swap `rankItemSearch` for a server
 * or hosted index (Algolia, Typesense, Firestore extension) while keeping the same
 * UI contract (debounced query → ranked items + corrected query string).
 */

import { getItemTagList, getItemTitle } from "./itemFields";
import { getItemLocationSearchText } from "./itemLocation";

export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_DEBOUNCE_MS = 300;

/** Alphanumeric tokens, lowercased (handles unicode letters loosely via \p{L} if needed; keep ASCII+nums for speed). */
export function tokenize(text) {
  const s = String(text ?? "").toLowerCase();
  const out = s.match(/[a-z0-9]+/g);
  return out || [];
}

/** Levenshtein edit distance (two-row DP, O(mn)). */
export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prevDiag = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prevDiag + cost);
      prevDiag = tmp;
    }
  }
  return row[n];
}

function addToIndex(word, dictionary, wordsByLength) {
  if (!word || word.length < 2) return;
  dictionary.add(word);
  const L = word.length;
  if (!wordsByLength.has(L)) wordsByLength.set(L, []);
  wordsByLength.get(L).push(word);
}

/**
 * Dictionary of tokens from all items (title, description, tags, location) for spell correction.
 */
export function buildGlobalSearchIndex(items) {
  const dictionary = new Set();
  const wordsByLength = new Map();

  for (const item of items) {
    for (const t of tokenize(getItemTitle(item))) addToIndex(t, dictionary, wordsByLength);
    for (const t of tokenize(String(item.description ?? "")))
      addToIndex(t, dictionary, wordsByLength);
    for (const tag of getItemTagList(item)) {
      for (const t of tokenize(tag)) addToIndex(t, dictionary, wordsByLength);
    }
    for (const t of tokenize(getItemLocationSearchText(item)))
      addToIndex(t, dictionary, wordsByLength);
  }

  return { dictionary, wordsByLength };
}

function findBestCorrection(word, dictionary, wordsByLength) {
  if (dictionary.has(word)) return word;
  const wl = word.length;
  const maxDist = wl <= 2 ? 1 : wl <= 4 ? 1 : 2;
  let best = null;
  let bestD = Infinity;
  for (let len = Math.max(1, wl - maxDist); len <= wl + maxDist; len++) {
    const candidates = wordsByLength.get(len);
    if (!candidates) continue;
    for (const c of candidates) {
      const d = levenshtein(word, c);
      if (d <= maxDist && d < bestD) {
        bestD = d;
        best = c;
        if (d === 0) return c;
      }
    }
  }
  return best || word;
}

/**
 * Split query into words; correct each against dictionary if no exact hit.
 */
export function correctQuery(rawQuery, index) {
  const words = String(rawQuery ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) {
    return {
      correctedWords: [],
      correctedQuery: "",
      wasChanged: false,
      originalQuery: String(rawQuery ?? "").trim(),
    };
  }
  let wasChanged = false;
  const correctedWords = words.map((w) => {
    const c = findBestCorrection(w, index.dictionary, index.wordsByLength);
    if (c !== w) wasChanged = true;
    return c;
  });
  return {
    correctedWords,
    correctedQuery: correctedWords.join(" "),
    wasChanged,
    originalQuery: String(rawQuery ?? "").trim(),
  };
}

function bestFuzzyInWords(token, words, maxDist, baseScore) {
  let best = 0;
  for (const w of words) {
    if (Math.abs(w.length - token.length) > maxDist + 1) continue;
    const d = levenshtein(token, w);
    if (d <= maxDist) best = Math.max(best, baseScore - d * 12);
  }
  return best;
}

const TITLE_SUB = 120;
const TITLE_FUZZY = 80;
const TAG_SUB = 72;
const TAG_FUZZY = 48;
const DESC_SUB = 36;
const DESC_FUZZY = 22;

/**
 * Relevance score for one item vs search tokens (already corrected).
 */
export function computeItemSearchScore(item, tokens) {
  const title = getItemTitle(item);
  const titleLower = title.toLowerCase();
  const titleWords = tokenize(title);
  const desc = String(item.description ?? "");
  const descLower = desc.toLowerCase();
  const descWords = tokenize(desc);
  const tagStr = getItemTagList(item).join(" ").toLowerCase();
  const tagWords = tokenize(tagStr);

  let score = 0;
  for (const token of tokens) {
    if (titleLower.includes(token)) score += TITLE_SUB;
    score += bestFuzzyInWords(token, titleWords, 1, TITLE_FUZZY);

    if (tagStr.includes(token)) score += TAG_SUB;
    score += bestFuzzyInWords(token, tagWords, 1, TAG_FUZZY);

    if (descLower.includes(token)) score += DESC_SUB;
    score += bestFuzzyInWords(token, descWords, 1, DESC_FUZZY);
  }
  return score;
}

/**
 * Ranked search: spell-correct query, score items, sort desc, cap limit.
 */
export function rankItemSearch(items, rawQuery, index, options = {}) {
  const limit = options.limit ?? SEARCH_DEFAULT_LIMIT;
  const q = String(rawQuery ?? "").trim();
  if (!q || !index) {
    return {
      results: [],
      correctedQuery: "",
      wasChanged: false,
      originalQuery: q,
      highlightTerms: [],
    };
  }

  const { correctedWords, correctedQuery, wasChanged, originalQuery } =
    correctQuery(q, index);
  if (correctedWords.length === 0) {
    return {
      results: [],
      correctedQuery: "",
      wasChanged: false,
      originalQuery: q,
      highlightTerms: [],
    };
  }

  const ranked = [];
  for (const item of items) {
    const score = computeItemSearchScore(item, correctedWords);
    if (score > 0) ranked.push({ item, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, limit);

  const origTokens = tokenize(q);
  const highlightTerms = [
    ...new Set([...correctedWords, ...origTokens].filter((t) => t.length >= 2)),
  ];

  return {
    results: top,
    correctedQuery,
    wasChanged,
    originalQuery,
    highlightTerms,
  };
}

/**
 * Non-empty segments for <mark> wrapping in UI.
 */
export function highlightSegments(text, terms) {
  const t = String(text ?? "");
  if (!t) return [{ text: "", highlight: false }];
  const lower = t.toLowerCase();
  const termList = [
    ...new Set(
      (terms || [])
        .filter(Boolean)
        .map((x) => String(x).toLowerCase())
        .filter((x) => x.length >= 2),
    ),
  ].sort((a, b) => b.length - a.length);

  const ranges = [];
  for (const term of termList) {
    let i = 0;
    while (i < lower.length) {
      const j = lower.indexOf(term, i);
      if (j === -1) break;
      ranges.push([j, j + term.length]);
      i = j + 1;
    }
  }
  if (ranges.length === 0) return [{ text: t, highlight: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r[0] > last[1]) merged.push([r[0], r[1]]);
    else last[1] = Math.max(last[1], r[1]);
  }

  const out = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a > cursor) out.push({ text: t.slice(cursor, a), highlight: false });
    out.push({ text: t.slice(a, b), highlight: true });
    cursor = b;
  }
  if (cursor < t.length) out.push({ text: t.slice(cursor), highlight: false });
  return out;
}

/** Display price (Firestore may store number or legacy string). */
export function formatItemPrice(item) {
  const p = item?.price;
  if (p == null || p === "") return "—";
  if (typeof p === "number" && !Number.isNaN(p)) return String(p);
  const n = Number(p);
  return Number.isNaN(n) ? String(p) : String(n);
}
