const SSN = /\b\d{3}-?\d{2}-?\d{4}\b/g;

export function maskSsn(text: string): string {
  return text.replace(SSN, "XXX-XX-XXXX");
}

/** Recursively mask every string inside a JSON-like value. */
export function maskDeep<T>(value: T): T {
  if (typeof value === "string") return maskSsn(value) as T;
  if (Array.isArray(value)) return value.map(maskDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, maskDeep(v)]),
    ) as T;
  }
  return value;
}
