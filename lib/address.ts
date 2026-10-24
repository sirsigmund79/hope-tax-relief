export type Address = { street: string; city: string; state: string; zip: string };

/** Best-effort split of a free-text Detroit address into the form's street / city / state / ZIP boxes. */
export function parseAddress(raw: string): Address {
  let rest = raw.trim().replace(/\s+/g, " ");
  // A ZIP only counts at the end, after something else (so "12000 Grand River" keeps its house number).
  const zipMatch = rest.match(/^(.+?)[, ]+(\d{5}(?:-\d{4})?)$/);
  const zip = zipMatch?.[2] ?? "";
  if (zipMatch) rest = zipMatch[1];
  let state = "MI";
  const st = rest.match(/[, ]+(MI|Mich\.?|Michigan)\.?$/i);
  if (st) rest = rest.slice(0, st.index);
  else if (/[, ]+[A-Z]{2}$/.test(rest)) {
    state = rest.slice(-2);
    rest = rest.slice(0, -2).replace(/[, ]+$/, "");
  }
  let city = "Detroit";
  const parts = rest.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    city = parts.pop()!;
    rest = parts.join(", ");
  } else {
    const m = rest.match(/^(.*?)\s+(Detroit)$/i);
    if (m) rest = m[1];
  }
  return { street: rest.replace(/[, ]+$/, ""), city, state: state.toUpperCase(), zip };
}
