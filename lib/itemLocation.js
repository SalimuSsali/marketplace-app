/**
 * Marketplace item location: structured object on `items.location`.
 * Legacy listings may still use a plain string on `location`.
 */

export const DEFAULT_ITEM_LOCATION = Object.freeze({
  country: "Uganda",
  district: "Bushenyi",
  town: "Ishaka",
  village: "",
});

/**
 * @param {unknown} loc
 * @returns {loc is { country?: unknown, district?: unknown, town?: unknown, village?: unknown }}
 */
function isStructuredLocation(loc) {
  return loc != null && typeof loc === "object" && !Array.isArray(loc);
}

function trimPart(v) {
  return String(v ?? "").trim();
}

/**
 * Plain-text line for UI and search (comma-separated). Empty if nothing set.
 * @param {unknown} raw — `item.location` or a location value
 */
export function getItemLocationSearchText(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (!isStructuredLocation(raw)) return "";
  const parts = [
    trimPart(raw.country),
    trimPart(raw.district),
    trimPart(raw.town),
    trimPart(raw.village),
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Firestore payload fragment: `{ location: { country, district, town, village } }`.
 * Empty parts for country/district/town fall back to defaults (village may stay empty).
 */
export function buildStructuredLocationForFirestore({
  country,
  district,
  town,
  village,
}) {
  const c = trimPart(country) || DEFAULT_ITEM_LOCATION.country;
  const d = trimPart(district) || DEFAULT_ITEM_LOCATION.district;
  const t = trimPart(town) || DEFAULT_ITEM_LOCATION.town;
  const v = trimPart(village);
  return {
    location: {
      country: c,
      district: d,
      town: t,
      village: v,
    },
  };
}

/** Default structured location for shop-posted items (no extra form fields). */
export function defaultItemLocationForCreate() {
  return {
    location: {
      country: DEFAULT_ITEM_LOCATION.country,
      district: DEFAULT_ITEM_LOCATION.district,
      town: DEFAULT_ITEM_LOCATION.town,
      village: DEFAULT_ITEM_LOCATION.village,
    },
  };
}
