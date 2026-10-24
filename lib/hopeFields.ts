// Maps HOPE Check's answers onto the official City of Detroit 2026 HOPE application's form fields.
// Field names are the PDF's own AcroForm names, including its typos ("Principle", "Decendents").
// Pure: no pdf-lib here, so the UI can preview the fill without loading the PDF library.
import { parseAddress } from "./address";

export const HOPE_PDF_PATH = "/forms/2026-hope-application.pdf";

// 0-based page indexes in the official PDF.
export const PAGE = {
  form2368: [12, 13],
  partnerLetter: [14, 15],
  form4988Applicant: 16, // its name box is the shared "Petitioner's Name" field
  form4988Extra: [18, 19, 20], // spare copies; their name box is not a field, so we stamp it
};
// Where the "I, ____" box sits on a 4988 page (matches the Petitioner's Name widget on page 17).
export const NAME_BOX_4988 = { x: 56, y: 559, size: 11 };

export type ApplicationAdult = {
  name: string;
  employer: string | null;
  sources: { label: string; amount: number }[]; // one per income document
  needs4988: boolean;
};

export type ApplicationData = {
  phone: string;
  email: string;
  address: string; // free text, split into the form's boxes
  parcelNumber: string;
  adults: ApplicationAdult[]; // adults[0] is the petitioner
  liquidAssets: number | null;
  preMissing: boolean;
};

export type FillPlan = {
  text: Record<string, string>;
  applicant4988: boolean;
  extra4988Names: string[]; // stamped onto the spare 4988 pages, in order
  over4988Capacity: string[]; // adults needing a 4988 beyond the spare pages
  include2368: boolean;
};

const dollars = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];

/** Pure mapping from app data to the PDF's fields. */
export function planFill(d: ApplicationData): FillPlan {
  const text: Record<string, string> = {};
  const set = (k: string, v: string | null | undefined) => {
    if (v && v.trim()) text[k] = v.trim();
  };
  const [petitioner, ...others] = d.adults;
  const addr = parseAddress(d.address);

  // Shared fields: these appear on several pages and fill all of them.
  set("Petitioner's Name", petitioner?.name);
  set("Daytime Phone Number", d.phone);
  set("Email", d.email);
  set("Property Address of Principal Residence", addr.street);
  set("Principal Residence City", addr.city);
  set("Principal Residence State", addr.state);
  set("Principle Residence ZIP Code", addr.zip);
  set("Property Parcel Identification Number", d.parcelNumber);

  // Part 5: employment (the petitioner's)
  set("Name of employer", petitioner?.employer);

  // Part 6: income sources. Three rows; anything beyond the second goes in the third.
  const sources = d.adults.flatMap((a) => a.sources.map((s) => ({ label: `${a.name}: ${s.label}`, amount: s.amount })));
  const rows = sources.length > 3
    ? [...sources.slice(0, 2), {
        label: sources.slice(2).map((s) => `${s.label} ${dollars(s.amount)}`).join("; "),
        amount: sources.slice(2).reduce((t, s) => t + s.amount, 0),
      }]
    : sources;
  rows.forEach((r, i) => {
    set(`${ORDINALS[i]} source of income`, r.label);
    set(`${ORDINALS[i]} income. Amount. Indicate whether monthly or annual`, `${dollars(r.amount)} annual`);
  });

  // Part 7: savings. We only know the household total.
  if (d.liquidAssets !== null) {
    set("First item. Name of financial institution or investments", "Total, all accounts");
    set("First item. Amount on deposit", dollars(d.liquidAssets));
    set("First item. Name on account", "Household");
  }

  // Part 10: household occupants. Row 1 is the petitioner ("SELF"; the name is the shared field).
  const income = (a: ApplicationAdult) => a.sources.reduce((t, s) => t + s.amount, 0);
  if (petitioner) {
    set("First household occupant. Place of employment", petitioner.employer);
    set("First household occupant. Financial contribution to family income", dollars(income(petitioner)));
  }
  others.slice(0, 7).forEach((a, i) => {
    const row = ORDINALS[i + 1];
    set(`${row} household occupant. First and last name`, a.name);
    set(`${row} household occupant. Place of employment`, a.employer);
    set(`${row} household occupant. Financial contribution to family income`, dollars(income(a)));
  });

  // Form 2368 (only kept when the bill shows less than 100% PRE)
  if (d.preMissing) {
    set("Local Unit", "City of Detroit");
    set("County", "Wayne");
    set("Percentage", "100");
  }

  const extras = others.filter((a) => a.needs4988).map((a) => a.name);
  return {
    text,
    applicant4988: !!petitioner?.needs4988,
    extra4988Names: extras.slice(0, PAGE.form4988Extra.length),
    over4988Capacity: extras.slice(PAGE.form4988Extra.length),
    include2368: d.preMissing,
  };
}
