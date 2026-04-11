/**
 * Item listing fields: title (with legacy `name`), tags/keywords. Shop search helpers below.
 */

/** Primary heading; prefers `title`, falls back to legacy `name`. */
export function getItemTitle(item) {
  const t = String(item?.title ?? "").trim();
  if (t) return t;
  return String(item?.name ?? "").trim();
}

/** Tags for display: `tags[]` and/or legacy `keywords[]` (deduped). */
export function getItemTagList(item) {
  const out = [];
  const seen = new Set();
  for (const key of ["tags", "keywords"]) {
    const raw = item?.[key];
    const arr = Array.isArray(raw) ? raw : [];
    for (const x of arr) {
      const s = String(x ?? "").trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

/** Parse comma / hash / newline separated input into a clean string array. */
export function parseTagsInput(text) {
  return String(text ?? "")
    .split(/[,#\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function lowerHaystack(parts) {
  return parts
    .flat()
    .filter((x) => x != null && String(x).trim() !== "")
    .map((x) => String(x).toLowerCase())
    .join(" ");
}

export function getShopSearchHaystack(shop) {
  const tagList = Array.isArray(shop?.tags)
    ? shop.tags.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];
  return lowerHaystack([
    shop?.shopName,
    shop?.location,
    shop?.description,
    shop?.ownerName,
    shop?.phone,
    ...tagList,
    shop?.category,
  ]);
}

export function shopMatchesSearch(shop, rawQuery) {
  const tokens = String(rawQuery ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = getShopSearchHaystack(shop);
  return tokens.every((t) => hay.includes(t));
}
