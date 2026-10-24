# Question protocol: 2026 HOPE application

Every input the official 2026 HOPE application PDF asks for (Form 5737, Form 2368, Form 4988, statement page),
why it's needed, and **how HOPE Check gets it with the least typing**. Written per GOV.UK
[Structuring forms](https://www.gov.uk/service-manual/design/form-structure): list everything you need first, then decide how to ask.

How we get each answer, cheapest first:

| Method | Meaning |
|---|---|
| **Fixed** | Same for every Detroit applicant; never asked |
| **Derived** | Computed from another answer (asked once, used in several places) |
| **Photo** | Read from a document the person already has to bring |
| **Ask** | One question, one page |
| **Branch** | A yes/no that skips the follow-up questions when the answer is no; "no" writes N/A on the form |
| **Person** | Only the applicant can do it (signatures, dates signed, SSN digits); left blank on purpose |

## Check if you can apply (asked first)

These decide eligibility, so they come before anything else; people who can't apply find out on page 1 or 2.

| Question | Why | Method | Used for |
|---|---|---|---|
| Do you own and live in this home? | Must own and occupy (guidelines §1) | Ask (stop page if no) | Part 3 both boxes; Form 2368 line 11a |
| How many people live in your home? | Income limits depend on household size | Ask | Income table; minors' proof-of-residency item |
| More than $12,000 in savings and assets? | Asset cap (guidelines §3) | Ask (warning page if yes) | Early verdict; replaced by itemized accounts later |
| Household income band | Tier (100/75/50/25/10%) | Ask: choose a band built from the 2026 table | Early estimate; replaced by documents later |
| 20% income loss or tax foreclosure? | Only the 10% tier needs this | Branch: asked only for the 10% band | 10% tier |
| Yearly property tax bill | Savings estimate | Photo (tax bill) or Ask; skippable | Before → after estimate |

## Form 5737

| Part / field | Why | Method | Notes |
|---|---|---|---|
| 1 Petitioner's name | Identifies applicant | Ask (pre-filled from tax bill owner) | Shared field: fills 5 pages |
| 1 Daytime phone, email | Board of Review contact | Ask (one "contact" page) | Email also on statement page |
| 1 Age of petitioner | Required | Ask (same page as name) | |
| 1 Marital status | Required | Ask (radios) | |
| 1 Age of spouse | Required if married | Derived from the person marked "Spouse" | N/A if not married |
| 1 Number of legal dependents | Required | Derived: people under 18 | Approximation; person can edit in PDF |
| 1 Address, city, state, ZIP | Property | Photo (tax bill) → confirm | City/State default Detroit, MI |
| 2 Parcel ID | Property | Photo (tax bill) → confirm | Also fills 2368, statement page |
| 2 Mortgage company, unpaid balance, monthly payment | Required | Branch "mortgage or land contract?" → Photo (mortgage statement) → confirm | N/A if no mortgage |
| 2 Length of time at residence | Required | Ask move-in month/year once | Also Form 2368 line 11 date |
| 2 Property description | Legal description | Person | Not reliably on the bill; left blank |
| 3 I own / used as my homestead | Affirmation | Derived from "own and live in?" = yes | Person affirmed it in the app |
| 4 Other property (2 rows) | Assets | Branch "own other property?" → list | N/A if none |
| 5 Employer name and address | Required | Photo (W-2 box c) | N/A if no wage income; contact person and phone left blank |
| 6 Income sources (3 rows) | Income | Photo (W-2 box 1, SSA-1099 box 5, paystub YTD) | Extra sources folded into row 3 |
| 7 Accounts (3 rows): institution, amount, rate, name | Asset cap | Branch "bank accounts?" → Photo (statement) or Ask | N/A if none |
| 8 Life insurance (3 rows) | Assets | Branch → list | N/A if none |
| 9 Vehicles (2 rows) | Assets | Branch → list | N/A if none |
| 10 Household occupants (8 rows): name, age, relationship, employer, contribution | Household composition | Ask once per person (name, age, relationship); employer and contribution Derived from their documents | Children: no contribution |
| 11 Personal debt (8 rows) | Ability to pay | Branch "any debts?" → list | N/A if none |
| 12 Monthly expenses (11 + 6 other) | Ability to pay | Ask (one page, all categories) | Blanks become N/A, as the form asks |
| 13 Reviewed policy and guidelines | Required | Ask (checkbox on the check-answers page, after showing the limits) | |
| 14 Legal designee | Only if someone applies for you | Branch | N/A if none |
| 15 Printed name | Required | Derived from petitioner's name | Shared field |
| 15 Signature, date | Legal | Person | |

## Form 4988 (one per adult not required to file a tax return)

| Field | Method |
|---|---|
| Which adults need one | Branch per adult: "Did they file a 2025 tax return?" (default guessed from their documents) |
| Name, address | Derived; extra copies have no name field, so the name is printed on the page |
| Signature, date | Person |

## Form 2368 (only when the tax bill shows PRE under 100%)

| Field | Method |
|---|---|
| Parcel, address, owner name, phone | Derived (shared fields) |
| Local unit (City), county (Wayne), city box | Fixed |
| Line 11 date owned and occupied; 11a principal residence | Derived (move-in date; "own and live in" = yes) |
| Line 12 percentage | Fixed: 100 |
| Lines 13, 16, 18: exemptions or tax residency elsewhere | Branch: one question; "no" ticks No on all three |
| Lines 6 and 9: last four of SSN | **Person**: never collected by HOPE Check |
| Co-owner, mailing address | Person |

## Statement page

| Field | Method |
|---|---|
| Phone, email, name, address, parcel | Derived (shared fields) |
| Statement | Ask (optional, last section) |
| Community partner | Fixed: "Self Prepared" (the PDF's default) |

## What we never collect

Social Security numbers (full or last four), bank account numbers, signatures. Photos stay in the browser and
are only sent to the document reader for extraction; nothing is stored on a server.
