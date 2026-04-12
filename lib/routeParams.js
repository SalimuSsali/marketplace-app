/**
 * Safe extraction of dynamic segment params from `useParams()` (Next.js App Router).
 */

/**
 * @param {Record<string, string | string[] | undefined> | null | undefined} params
 * @param {string} key
 * @returns {string}
 */
export function getSegmentParam(params, key = "id") {
  const raw = params?.[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return "";
}

/**
 * Reject obviously invalid Firestore document IDs (path injection, empty).
 * @param {string} id
 */
export function isPlausibleFirestoreDocId(id) {
  if (typeof id !== "string") return false;
  const t = id.trim();
  if (t.length === 0 || t.length > 1500) return false;
  if (t === "." || t === "..") return false;
  if (t.includes("/") || t.includes("\\") || t.includes("\0")) return false;
  return true;
}

/**
 * @param {Record<string, string | string[] | undefined> | null | undefined} params
 * @param {string} key
 * @returns {string} usable id or "" if missing / invalid
 */
export function getFirestoreDocIdFromParams(params, key = "id") {
  const raw = getSegmentParam(params, key);
  return isPlausibleFirestoreDocId(raw) ? raw.trim() : "";
}
