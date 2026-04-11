/**
 * Text-based "nearby" matching (no GPS). Matches item `location` strings against a user
 * needle using substring overlap. Sorting ranks stronger / more specific matches first.
 */

export function itemLocationMatchesNeedle(itemLocation, needle) {
  const loc = String(itemLocation ?? "").trim().toLowerCase();
  const n = String(needle ?? "").trim().toLowerCase();
  if (!loc || !n) return false;
  return loc.includes(n) || n.includes(loc);
}

/** Higher score = better match for sorting (same needle for all compared items). */
export function locationMatchScore(itemLocation, needle) {
  const loc = String(itemLocation ?? "").trim().toLowerCase();
  const n = String(needle ?? "").trim().toLowerCase();
  if (!n || !itemLocationMatchesNeedle(itemLocation, needle)) return -1;

  let score = 0;
  if (loc === n) score += 100_000;
  if (loc.startsWith(n)) score += 50_000;
  else if (n.startsWith(loc) && loc.length >= 2) score += 45_000;

  const idx = loc.indexOf(n);
  if (idx >= 0) score += 25_000 - Math.min(idx, 24_999);
  else if (n.includes(loc)) score += 12_000 + Math.min(loc.length * 80, 8000);

  const words = n.split(/\s+/).filter((w) => w.length > 1);
  for (const w of words) {
    if (loc.includes(w)) score += 1500;
  }
  return score;
}

export function filterAndSortItemsByNearby(items, needle) {
  const n = String(needle ?? "").trim();
  if (!n) return [...items];
  const filtered = items.filter((item) =>
    itemLocationMatchesNeedle(item.location, n),
  );
  return filtered.sort(
    (a, b) =>
      locationMatchScore(b.location, n) - locationMatchScore(a.location, n),
  );
}

export function sortItemsByLocationMatch(items, needle) {
  const n = String(needle ?? "").trim();
  if (!n) return [...items];
  return [...items].sort(
    (a, b) =>
      locationMatchScore(b.location, n) - locationMatchScore(a.location, n),
  );
}
