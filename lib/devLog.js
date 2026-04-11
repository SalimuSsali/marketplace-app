/** Console logging only in development; keeps production bundles quiet. */
export function devError(...args) {
  if (process.env.NODE_ENV === "development") {
    console.error(...args);
  }
}
