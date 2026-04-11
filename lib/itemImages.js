/**
 * Listings may store `imageUrls` (array) and/or legacy `imageUrl` (string).
 * Same shape is used for items, shops, and services.
 */

export const MAX_ITEM_IMAGES = 10;

/**
 * @param {Record<string, unknown> | null | undefined} item
 * @returns {string[]}
 */
export function getItemImageUrls(item) {
  const raw = item?.imageUrls;
  if (Array.isArray(raw)) {
    const list = raw
      .filter((u) => typeof u === "string")
      .map((u) => u.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }
  const single = item?.imageUrl;
  if (typeof single === "string" && single.trim()) return [single.trim()];
  return [];
}

/**
 * @param {Record<string, unknown> | null | undefined} item
 * @returns {string}
 */
export function getItemPrimaryImageUrl(item) {
  const urls = getItemImageUrls(item);
  return urls[0] ?? "";
}

/**
 * @param {string[]} urls
 * @returns {{ imageUrl: string, imageUrls: string[] }}
 */
export function imageFieldsForFirestore(urls) {
  const clean = urls.map((u) => String(u).trim()).filter(Boolean);
  const primary = clean[0] ?? "";
  return {
    imageUrl: primary,
    imageUrls: clean,
  };
}

/**
 * @param {File} file
 * @returns {Promise<string>} public URL
 */
export async function uploadImageFileToR2(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/r2-upload", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error?.message
        ? String(data.error.message)
        : `Upload failed (HTTP ${res.status}).`,
    );
  }
  if (!data?.url) throw new Error("Upload did not return a URL.");
  return String(data.url);
}
