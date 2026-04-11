/** Word count for plain text (whitespace-separated tokens). */
export function descriptionWordCount(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
