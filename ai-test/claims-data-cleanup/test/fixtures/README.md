# Test fixtures

These files were written **by hand, before the code**. They are the independent source of truth for the golden tests. Never regenerate them from the code under test.

| File | Purpose |
|---|---|
| `all-issues.dirty.csv` | 61 messy rows that trigger every issue code and every row-level edge case |
| `all-issues.expected-clean.csv` | The hand-derived clean CSV (59 rows: rows 5 and 57 are removed exact duplicates) |
| `all-issues.expected-report.json` | The hand-computed data quality report for the clean CSV |
| `input/*.csv` | Input-format cases: empty, header-only, missing/extra/duplicate columns, wrong row width, reordered columns, BOM + CRLF |

## Rows in `all-issues.dirty.csv`

Row numbers are 1-based data rows (the header is not counted).

| Row | Purpose | Expected codes |
|---|---|---|
| 1–4 | Clean rows: OUTPATIENT/THB ×2, INPATIENT/VND, MATERNITY/THB | — |
| 5 | Exact copy of row 1 (US1 scenario 1) | removed: `DUPLICATE_ROW` |
| 6, 7 | `JOHN DOE`, `john doe` (scenario 2) | `NAME_CASING_FIXED` |
| 8 | `John Doe` already title case | — |
| 9, 10, 11 | `outpatient`, `Outpateint`, `OP` (scenario 3) | `CLAIM_TYPE_NORMALIZED` |
| 12 | `IP` → INPATIENT | `CLAIM_TYPE_NORMALIZED` |
| 13 | `Out-Patient` (punctuation stripped for the lookup) | `CLAIM_TYPE_NORMALIZED` |
| 14, 15 | `Surgery`, literal `NULL` (A-5) | `CLAIM_TYPE_UNRECOGNIZED` |
| 16 | Empty claim type | `MISSING_CLAIM_TYPE` |
| 17–20 | Diagnosis empty, `N/A`, `n/a`, `" n/A "` (scenario 4) | `MISSING_DIAGNOSIS` |
| 21 | Diagnosis `flu` | `DIAGNOSIS_CASING_FIXED` |
| 22 | Amount `15000` | — |
| 23 | Amount `"15,000"` (scenario 5) | `AMOUNT_REFORMATTED` |
| 24 | Amount `0` | `AMOUNT_ZERO` |
| 25 | Amount `-500` | `AMOUNT_NEGATIVE` |
| 26 | Amount `"-15,000"` | `AMOUNT_REFORMATTED\|AMOUNT_NEGATIVE` |
| 27–30 | Amounts `abc`, `"1,23"`, `1.2.3`, `15000.505` | `AMOUNT_UNPARSEABLE` |
| 31 | Empty amount | `MISSING_AMOUNT` |
| 32, 33 | Currency `thb`, `Baht` (scenario 6) | `CURRENCY_NORMALIZED` |
| 34 | Currency `vnd` | `CURRENCY_NORMALIZED` |
| 35 | Currency `USD` | `CURRENCY_UNRECOGNIZED` |
| 36 | Empty currency | `MISSING_CURRENCY` |
| 37, 38, 39 | Dates `15/03/2024`, `"March 15, 2024"`, `"march 15, 2024"` (scenario 7) | `DATE_REFORMATTED` |
| 40 | Date `03/04/2024` → `2024-04-03` (day/month/year) | `DATE_REFORMATTED` |
| 41, 42 | Dates `31/02/2024` (impossible), `Mar 15 2024` (unsupported) | `DATE_INVALID` |
| 43 | Empty date | `MISSING_DATE` |
| 44, 45, 46 | Status `approved`, `in review`, `In-Review` | `STATUS_NORMALIZED` |
| 47 | Status `CLOSED` | `STATUS_UNRECOGNIZED` |
| 48 | Empty status | `MISSING_STATUS` |
| 49 | Negative amount + `thb` + `N/A` diagnosis (scenario 8) | `MISSING_DIAGNOSIS\|AMOUNT_NEGATIVE\|CURRENCY_NORMALIZED` |
| 50 | Eight issues in one row | `MISSING_POLICY_ID\|NAME_CASING_FIXED\|CLAIM_TYPE_NORMALIZED\|DIAGNOSIS_CASING_FIXED\|AMOUNT_REFORMATTED\|CURRENCY_NORMALIZED\|DATE_REFORMATTED\|STATUS_NORMALIZED` |
| 51 | Seven issues in one row | `NAME_CASING_FIXED\|CLAIM_TYPE_UNRECOGNIZED\|MISSING_DIAGNOSIS\|AMOUNT_ZERO\|CURRENCY_UNRECOGNIZED\|DATE_INVALID\|STATUS_UNRECOGNIZED` |
| 52 | Near-copy of row 53 with `JOHN DOE` (Q1: kept) | `CONFLICTING_CLAIM_ID\|NAME_CASING_FIXED` |
| 53 | Same claim with `John Doe` | `CONFLICTING_CLAIM_ID` |
| 54, 55 | Same `claim_id`, different amount (FR-008) | `CONFLICTING_CLAIM_ID` |
| 56 | Empty `claim_id` | `MISSING_CLAIM_ID` |
| 57 | Exact copy of row 56 (empty `claim_id` still deduplicates) | removed: `DUPLICATE_ROW` |
| 58 | Empty `claim_id`, different content (not a conflict) | `MISSING_CLAIM_ID` |
| 59 | Extra spaces only (`"  Somchai   Prasert "`, `" Flu "`, `" THB"`, `"  CLM-00059 "`) | — |
| 60 | Empty `policy_id` | `MISSING_POLICY_ID` |
| 61 | Member name `N/A` (`N/A` works in any column) | `MISSING_MEMBER_NAME` |

Diagnosis counts were arranged so the report has ties: Asthma and Migraine tie on 10, and Dengue Fever and Gastritis tie on 6 for 5th place. Alphabetical order puts Dengue Fever in the top 5 and Gastritis out. DENTAL has no rows, so it shows zero counts and `null` averages.

## Spec edge cases → coverage

| # | Edge case (spec.md) | Covered by |
|---|---|---|
| 1 | Several issues in one row | rows 26, 49, 50, 51 |
| 2 | Rows that only match after cleanup | rows 52, 53 |
| 3 | Same `claim_id`, different content | rows 54, 55 |
| 4 | Missing `claim_id` | rows 56, 57, 58 |
| 5 | Ambiguous slash dates | row 40 |
| 6 | Impossible dates or text that is not a date | rows 41, 42 |
| 7 | Blank, non-numeric, or multi-decimal amounts | rows 27–31 |
| 8 | Unrecognized claim type, currency, or status | rows 14, 15, 35, 47, 51 |
| 9 | Extra spaces | rows 20, 59 |
| 10 | Status casing and separators | rows 45, 46 |
| 11 | A claim type with no valid amounts in one currency | DENTAL, MATERNITY/VND and the other empty pairs in the expected report |
| 12 | Fewer than 5 diagnoses | `src/report/report-builder.spec.ts` (T057) |
| 13 | Empty or header-only input | `input/empty.csv`, `input/header-only.csv` (T024, T032, T038) |
| 14 | Missing or extra columns | `input/missing-columns.csv`, `input/extra-column.csv`, `input/duplicate-column.csv` (T024, T032, T038) |

## How the expected report was worked out

Counts come from the `issues` and value columns of `all-issues.expected-clean.csv` (59 kept rows):

- **Rows**: 61 before, 2 duplicates removed (rows 5 and 57), 59 after. 52 kept rows have at least one issue. Five have more than one: rows 26, 49, 50, 51 and 52.
- **Claims by type**: OUTPATIENT 49, INPATIENT 5 (rows 3, 12, 34, 54, 55), DENTAL 0, MATERNITY 1 (row 4), and `NULL` 4 (rows 14, 15, 16, 51).
- **Claims by status**: APPROVED 34, REJECTED 5, PENDING 13, IN_REVIEW 4, and `NULL` 3 (rows 47, 48, 51).

Averages use only rows with a valid positive amount and a known currency. Rows 24–31, 49 and 51 have invalid amounts, and rows 35 and 36 have no usable currency.

| Claim type / currency | Rows | Sum | Average |
|---|---|---|---|
| OUTPATIENT / THB | 38: rows 1, 2, 6–11, 13, 17–23, 32, 33, 37–48, 50, 52, 53, 56, 58–61 | 1,500 + 2,500 + 3×1,000 + 3×2,000 + 3,000 + 5×1,200 + 2×15,000 + 2×1,800 + 7×2,200 + 5×900 + 15,000 + 2×1,100 + 1,300 + 1,400 + 1,600 + 2×1,700 = 100,400 | 100,400 / 38 = 2,642.105… → **2,642.11** |
| INPATIENT / VND | 5: rows 3, 12, 34, 54, 55 | 12,000,000 + 8,000,000 + 9,000,000 + 20,000,000 + 25,000,000 = 74,000,000 | **14,800,000.00** |
| MATERNITY / THB | 1: row 4 | 45,000 | **45,000.00** |
| `NULL` / THB | 3: rows 14, 15, 16 | 3 × 3,000 | **3,000.00** |
| every other pair | 0 | — | `null` |

**Top diagnoses**: Flu 13, Asthma 10, Migraine 10, Bronchitis 7, Dengue Fever 6, Gastritis 6, Normal Delivery 1. Ties are ordered A–Z, so Gastritis drops out of the top 5.
