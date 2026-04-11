"use client";

import { highlightSegments } from "../lib/globalSearch";

/**
 * Renders `text` with `terms` matched as <mark> (case-insensitive substring).
 */
export function SearchHighlightText({ text, terms, className = "" }) {
  const parts = highlightSegments(text, terms);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark
            key={i}
            className="rounded bg-amber-200/90 px-0.5 font-inherit text-inherit"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}
