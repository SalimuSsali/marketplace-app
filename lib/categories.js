/**
 * Categories are a UI filtering layer only.
 * Implementation detail: for items we store the chosen category as a normal tag
 * to avoid changing the Firestore item document shape.
 */

export const CATEGORY_TAG_PREFIX = "cat:";

/** @type {{ id: string, label: string, icon: string, tag: string | null }[]} */
export const CATEGORIES = [
  { id: "phones", label: "Phones", icon: "📱", tag: `${CATEGORY_TAG_PREFIX}phones` },
  { id: "computers", label: "Computers", icon: "💻", tag: `${CATEGORY_TAG_PREFIX}computers` },
  { id: "home-office", label: "Home & Office", icon: "🏠", tag: `${CATEGORY_TAG_PREFIX}home-office` },
  { id: "electronics", label: "Electronics", icon: "⚡", tag: `${CATEGORY_TAG_PREFIX}electronics` },
  { id: "womens-fashion", label: "Women’s Fashion", icon: "👗", tag: `${CATEGORY_TAG_PREFIX}womens-fashion` },
  { id: "mens-fashion", label: "Men’s Fashion", icon: "👔", tag: `${CATEGORY_TAG_PREFIX}mens-fashion` },
  { id: "books", label: "Books", icon: "📚", tag: `${CATEGORY_TAG_PREFIX}books` },
  { id: "food", label: "Food", icon: "🍔", tag: `${CATEGORY_TAG_PREFIX}food` },
  // "All" category: does not add a tag and matches everything.
  { id: "all", label: "All Items", icon: "🧺", tag: null },
];

export const DEFAULT_CATEGORY_ID = "all";

/** @param {string | null | undefined} id */
export function normalizeCategoryId(id) {
  const raw = String(id ?? "").trim();
  if (!raw) return DEFAULT_CATEGORY_ID;
  return CATEGORIES.some((c) => c.id === raw) ? raw : DEFAULT_CATEGORY_ID;
}

/** @param {string} categoryId */
export function categoryById(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** @param {string} categoryId */
export function categoryTagForId(categoryId) {
  const c = categoryById(categoryId);
  return c?.tag ?? null;
}

/**
 * @param {unknown} item
 * @returns {string} category id
 */
export function getItemCategoryId(item) {
  const tags = /** @type {unknown[]} */ (item?.tags);
  if (!Array.isArray(tags)) return DEFAULT_CATEGORY_ID;
  const found = tags.find(
    (t) => typeof t === "string" && t.toLowerCase().startsWith(CATEGORY_TAG_PREFIX)
  );
  if (typeof found !== "string") return DEFAULT_CATEGORY_ID;
  const id = found.slice(CATEGORY_TAG_PREFIX.length).trim();
  // stored format is cat:<id>; our ids match the suffix
  return normalizeCategoryId(id);
}

/**
 * Category filter layer only. Does not affect search index/ranking.
 * @param {unknown} item
 * @param {string} selectedCategoryId
 */
export function itemMatchesCategory(item, selectedCategoryId) {
  const id = normalizeCategoryId(selectedCategoryId);
  if (id === DEFAULT_CATEGORY_ID) return true;
  return getItemCategoryId(item) === id;
}

/**
 * Adds the category tag to an existing tag array (deduped).
 * If category is "all", tags are returned unchanged.
 * @param {string[]} tags
 * @param {string} categoryId
 */
export function applyCategoryToTags(tags, categoryId) {
  const next = Array.isArray(tags) ? [...tags] : [];
  const tag = categoryTagForId(categoryId);
  if (!tag) return next;
  if (next.some((t) => String(t).toLowerCase() === tag.toLowerCase())) return next;
  next.push(tag);
  return next;
}

