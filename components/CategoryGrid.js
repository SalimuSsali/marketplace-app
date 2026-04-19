"use client";

import { CATEGORIES, DEFAULT_CATEGORY_ID, normalizeCategoryId } from "../lib/categories";

/**
 * Mobile-first icon-card grid for category selection.
 * @param {{
 *  selectedId?: string,
 *  onSelect?: (id: string) => void,
 *  columns?: 2 | 3,
 *  size?: "md" | "lg",
 *  label?: string,
 *  helpText?: string,
 *  disabled?: boolean,
 * }} props
 */
export function CategoryGrid({
  selectedId = DEFAULT_CATEGORY_ID,
  onSelect,
  columns = 2,
  size = "lg",
  label = "Category",
  helpText = "Optional — helps people browse. Search still checks all items.",
  disabled = false,
}) {
  const active = normalizeCategoryId(selectedId);
  const gridCols = columns === 3 ? "grid-cols-3" : "grid-cols-2";
  const iconClass =
    size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl";
  const labelClass =
    size === "lg" ? "text-sm sm:text-base" : "text-xs sm:text-sm";

  return (
    <section aria-label={label}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">{label}</h2>
        <button
          type="button"
          onClick={() => (disabled ? null : onSelect?.(DEFAULT_CATEGORY_ID))}
          disabled={disabled}
          className="text-xs font-semibold text-emerald-800 underline decoration-emerald-600/50 underline-offset-2"
        >
          All items
        </button>
      </div>
      {helpText ? (
        <p className="mt-1 text-xs text-neutral-600">{helpText}</p>
      ) : null}

      <div className={`mt-3 grid ${gridCols} gap-3 sm:grid-cols-4`}>
        {CATEGORIES.map((c) => {
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => (disabled ? null : onSelect?.(c.id))}
              aria-pressed={isActive}
              disabled={disabled}
              className={[
                "flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                disabled ? "cursor-not-allowed opacity-60" : "",
                isActive
                  ? "border-emerald-300 bg-emerald-50 shadow-sm"
                  : "border-gray-200 bg-white hover:bg-gray-50",
              ].join(" ")}
            >
              <div className={iconClass} aria-hidden>
                {c.icon}
              </div>
              <div className={`font-semibold text-neutral-900 ${labelClass}`}>
                {c.label}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

