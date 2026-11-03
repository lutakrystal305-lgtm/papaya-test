# Claims Data Cleanup & Report

A solution to [AI Challenge 02 — Claims Data Cleanup & Report](https://github.com/papaya-insurtech/pumpkin/blob/main/Hiring/AI_Engineering_Challenges/AI_Challenge_02.md).

It is a small TypeScript command-line app that:

1. **generates** 500 insurance claims with known, intentional data quality issues (`data/claims_dirty.csv`), plus a log of every issue it injected;
2. **cleans** that file into a consistent dataset (`output/claims_clean.csv`), flagging every problem it finds;
3. **reports** on data quality (`output/report.md` and `output/report.json`).

The generated dirty CSV, the clean CSV, both reports and the recorded test results are committed, as the challenge asks.

## Quick start

Requirements: Node.js 20 or later and Yarn 1.

```bash
yarn install
yarn all        # generate → clean → report, and print the report
```

Running `yarn all` again with the default seed reproduces the committed files byte for byte, so `git status` stays clean.

## Commands

| Command | What it does | Options (defaults) |
|---|---|---|
| `yarn generate` | Writes the dirty CSV and its issue log, then prints a one-line summary | `--seed 42`, `--out data/claims_dirty.csv`, `--log data/claims_dirty.issues.json` |
| `yarn clean` | Cleans a CSV, writes the clean CSV and both reports, and prints the Markdown report | `--in data/claims_dirty.csv`, `--out output/claims_clean.csv`, `--report output/report.md`, `--report-json output/report.json` |
| `yarn all` | `generate` then `clean`; `--in` is both where the dirty CSV is written and what is cleaned | all of the above except `generate --out` |

`yarn <command> --help` prints the usage. Paths are relative to the current folder. Missing folders are created.

**Exit codes**:
- `0`: success.
- `1`: input or data error, for example a missing file, missing or extra columns, or a row with the wrong number of values. Nothing is written in that case.
- `2`: usage error, for example an unknown command or option, or an invalid seed.

You can also use the core from code, without the CLI. It is a set of pure functions with no file or process access:

```ts
import { generateClaims, runCleanup } from './src';

const { csv } = generateClaims({ seed: 42 });
const { cleanCsv, report, reportMarkdown } = runCleanup(csv, 'claims.csv');
```

## Output files

| File | Contents |
|---|---|
| `data/claims_dirty.csv` | 500 claims with the 9 challenge columns. 86 rows (17.2%) have at least one issue |
| `data/claims_dirty.issues.json` | The generator's record of which issues it put in which rows. The cleanup never reads it. The tests use it to prove that every issue is found |
| `output/claims_clean.csv` | The 9 columns, cleaned, plus an `issues` column listing each row's issue codes |
| `output/report.md` | The data quality report, for people to read |
| `output/report.json` | The same figures as JSON (`contracts/report.schema.json`) |
| `test-results/` | Recorded Jest results and the coverage summary |

## How the data is cleaned

Missing or unusable values become the literal text **`NULL`**, the same in every column.

For each row, in this order:

1. **Exact duplicates are removed first.** A row is a duplicate only if all 9 raw values are identical, character for character, to an earlier row. The first row is kept. Rows that only match after cleanup, such as `JOHN DOE` vs `John Doe`, are **kept**.
2. Every value is **trimmed**, and repeated spaces are collapsed. That alone is never an issue.
3. Empty values, `N/A` and `n/a` (in any case) become `NULL` and are flagged `MISSING_<COLUMN>`.
4. Each column is then normalized:

   | Column | Rule |
   |---|---|
   | `claim_id`, `policy_id` | Trimmed only. The format is not checked |
   | `member_name`, `diagnosis` | Title case: the first letter of each word uppercase, the rest lowercase |
   | `claim_type` | Lowercased, non-letters removed, then looked up in the claim-type map. Unknown values become `NULL` |
   | `submitted_amount` | Thousand separators are removed (`"15,000"` → `15000`). Zero and negative amounts are **kept as written and flagged**. Text that is not a number becomes `NULL` |
   | `currency` | Lowercased, then looked up in the currency map. Unknown values become `NULL` |
   | `submitted_date` | `YYYY-MM-DD`, `DD/MM/YYYY` (slash dates are always day/month/year) and `Month D, YYYY` (full English month name) become ISO `YYYY-MM-DD`. Impossible or unreadable dates become `NULL` |
   | `status` | Uppercased, with spaces and hyphens replaced by `_`. Must be `APPROVED`, `REJECTED`, `PENDING` or `IN_REVIEW`; anything else becomes `NULL` |
5. Rows that share a non-`NULL` `claim_id` but have different content are all **kept and flagged** `CONFLICTING_CLAIM_ID`.
6. The row's codes are sorted in catalogue order and joined with `|` in the `issues` column.

A row with several problems gets every fix and every code.

### Maps

| Claim type | Accepted spellings (after lowercasing and removing non-letters) |
|---|---|
| `OUTPATIENT` | `outpatient`, `outpateint`, `outpatinet`, `op`, `opd` |
| `INPATIENT` | `inpatient`, `inpateint`, `ip`, `ipd` |
| `DENTAL` | `dental`, `dent` |
| `MATERNITY` | `maternity`, `maternty`, `mat` |

| Currency | Accepted spellings (lowercased) |
|---|---|
| `THB` | `thb`, `baht`, `฿` |
| `VND` | `vnd`, `dong`, `đồng`, `₫` |

### Issue codes

Severity `fixed` means the value was standardized and can be used. `invalid` means it was replaced with `NULL` or needs review. `removed` means the row was dropped.

| Code | Column | Severity | Raised when |
|---|---|---|---|
| `DUPLICATE_ROW` | row | removed | All 9 raw values match an earlier row. Appears only in the issue log and in the duplicate count |
| `CONFLICTING_CLAIM_ID` | claim_id | invalid | The claim ID is shared with another kept row |
| `MISSING_CLAIM_ID` | claim_id | invalid | Empty or `N/A` |
| `MISSING_POLICY_ID` | policy_id | invalid | Empty or `N/A` |
| `MISSING_MEMBER_NAME` | member_name | invalid | Empty or `N/A` |
| `NAME_CASING_FIXED` | member_name | fixed | Title case changed the name |
| `MISSING_CLAIM_TYPE` | claim_type | invalid | Empty or `N/A` |
| `CLAIM_TYPE_NORMALIZED` | claim_type | fixed | The map changed the value |
| `CLAIM_TYPE_UNRECOGNIZED` | claim_type | invalid | Not in the map |
| `MISSING_DIAGNOSIS` | diagnosis | invalid | Empty or `N/A` |
| `DIAGNOSIS_CASING_FIXED` | diagnosis | fixed | Title case changed the diagnosis |
| `MISSING_AMOUNT` | submitted_amount | invalid | Empty or `N/A` |
| `AMOUNT_REFORMATTED` | submitted_amount | fixed | Thousand separators were removed |
| `AMOUNT_ZERO` | submitted_amount | invalid | The amount is 0 |
| `AMOUNT_NEGATIVE` | submitted_amount | invalid | The amount is below 0 |
| `AMOUNT_UNPARSEABLE` | submitted_amount | invalid | Not a number with at most 2 decimals and correctly grouped separators |
| `MISSING_CURRENCY` | currency | invalid | Empty or `N/A` |
| `CURRENCY_NORMALIZED` | currency | fixed | The map changed the value |
| `CURRENCY_UNRECOGNIZED` | currency | invalid | Not in the map |
| `MISSING_DATE` | submitted_date | invalid | Empty or `N/A` |
| `DATE_REFORMATTED` | submitted_date | fixed | A valid date that was not in ISO form |
| `DATE_INVALID` | submitted_date | invalid | Unsupported format, or the date does not exist (for example `31/02/2024`) |
| `MISSING_STATUS` | status | invalid | Empty or `N/A` |
| `STATUS_NORMALIZED` | status | fixed | Casing or separators changed a valid status |
| `STATUS_UNRECOGNIZED` | status | invalid | Not a valid status |

## The report

The report shows:
- rows before and after cleaning, and duplicates removed (*before − duplicates = after*);
- the number of rows with each issue code, including codes with zero rows;
- how many rows had at least one issue, and how many had more than one;
- claims by type and by status, with a `NULL` row when it occurs;
- the average amount by claim type, **per currency**;
- the top 5 diagnoses.

THB and VND are never averaged together, because no exchange rate is assumed. Averages use only rows with a valid positive amount and a known currency, and they are calculated in exact integer hundredths, rounded half up.

The top 5 diagnoses leave out `NULL`. Ties are ordered alphabetically.

## How the dirty data is generated

The generator is seeded (mulberry32, default seed `42`) and never uses the clock or `Math.random`, so the same seed always gives the same file. Issues are **placed by plan**, not at random, so every seed meets the challenge's targets:

| Part | Rows |
|---|---|
| Clean base claims (`CLM-00001` …) | 489 |
| Rows with one issue: the first 21 cover each challenge variant once | 60 |
| Rows with 2–3 issues in different columns, including one with a negative amount, `thb` and `N/A` | 12 |
| Exact duplicate copies, each placed after its original | 8 |
| Near-copies: same claim ID with one formatting change (uppercase name, slash date, lowercase currency) | 3 |
| **Total** | **500**, of which 86 (17.2%) have issues and 15 have several |

The 21 injected variants are:
- a missing claim ID or policy ID;
- `JOHN DOE` / `john doe` casing;
- the claim types `outpatient`, `Outpateint`, `OP`, `inpatient`, `IP` and `dental`;
- empty, `N/A` and `n/a` diagnoses;
- negative, zero and `"15,000"`-style amounts;
- the currencies `thb`, `Baht` and `vnd`;
- `15/03/2024` and `March 15, 2024` dates.

After generating, the generator checks its own output (500 rows, 8 duplicates, 75–100 rows with issues, at least 5 with several, every variant present) and stops with exit code 1 if any check fails.

## How correctness is proven

```bash
yarn test         # 398 tests
yarn test:cov     # plus coverage gates
```

- **Hand-written fixture.** Before any code was written, `test/fixtures/all-issues.dirty.csv` (61 rows) was written by hand. It triggers every issue code and every edge case. Its expected clean CSV and report were also worked out by hand, and the code must match them exactly. `test/fixtures/README.md` maps each row to its purpose.
- **Issue log.** For 5 seeds, the cleanup must report exactly the issues the generator logged: every logged issue found, and nothing extra on clean rows.
- **Conformance.** Every non-`NULL` value in the clean CSV matches its column's single format. Every report figure matches a recount made from the clean CSV text alone.
- **Reproducibility.** A fresh `yarn all` must reproduce the committed files byte for byte.
- **Unit tests** cover every normalizer branch (100% branch coverage is enforced), the PRNG, the CLI options, and the exit codes.

## Assumptions

- **Invalid amounts are flagged and kept**, not removed. Only exact duplicates are removed, so no claim disappears silently.
- **Duplicates are exact raw matches**, as the challenge says. Near-matches are kept and flagged as conflicting claim IDs, not merged.
- **Claim types** are `OUTPATIENT`, `INPATIENT`, `DENTAL` and `MATERNITY`. The challenge names only `OUTPATIENT`.
- **Currencies** are `THB` and `VND`. No conversion is done, so averages are per currency.
- **The literal text `NULL` in the input** is treated as a value, not as missing. It becomes an unrecognized value where a fixed set applies, so a cleaned file is not mistaken for clean input.
- **Duplicates are compared on parsed CSV values**, so a value written with and without quotes is the same value.
- **Headers** are matched ignoring case and surrounding spaces, and may come in any order. The output always uses the standard order.
- **Claim and policy ID formats** are not checked, because the challenge lists no format issues for them.
- **Amounts** use `.` as the decimal point, with at most 2 decimals and correctly grouped thousand separators.
- **Title case is simple**: `Mary-Jane` becomes `Mary-jane`, and `McDonald` becomes `Mcdonald`. The generated names avoid such cases.
- **Diagnosis spelling variants**, such as `Influenza` and `Flu`, are not merged.

## Project layout

```text
src/
  cli.ts              entry point (the only place that touches process)
  index.ts            public library API
  cli/                argument parsing, commands, safe file writes (temporary file, then rename)
  cleaning/           normalizers (one per column), duplicate removal, claim-ID conflicts, row cleaner
  csv/                CSV reading with header and width checks; CSV writing
  report/             report builder, integer amount math, Markdown renderer
  generator/          PRNG, base records, the 21 issue variants, allocation, self-check
  shared/             constants (columns, issue catalogue, maps), types, errors
test/                 fixtures, golden, issue-log, conformance, reproducibility and CLI tests
contracts/            JSON schemas for the issue log and the JSON report
```

Quality gates:
- `yarn typecheck`, `yarn lint:check` and `yarn format:check`;
- ESLint enforces functions of at most 40 lines, complexity below 10, no `any` and no `console`;
- the pure core may not import `fs`, `path` or `process`.

## Timeline

| Step | Estimate |
|---|---|
| Specify, clarify, plan, tasks (AI-assisted) | 0.5 h |
| Project setup and quality gates | 0.25 h |
| Hand-written fixture and expected outputs (test-first) | 0.5 h |
| Normalizers, duplicate removal and cleaner | 0.75 h |
| Generator with self-check | 0.5 h |
| Report (JSON and Markdown) and CLI | 0.5 h |
| Generated-data tests, committed outputs, recorded results, README | 0.5 h |
| **Total** | **≈ 3.5 h** |

This is slightly over the challenge's 2–3 h guide, because the expected outputs were written by hand before the code and quality gates were added.

## Using AI tools

The work followed a spec-driven workflow with an AI coding assistant (GitHub Copilot):

1. The challenge was turned into a specification.
2. Five ambiguous decisions were clarified: the duplicate rule, invalid amounts, the app's shape, multi-currency averages, and the null marker.
3. A plan, data model and contracts were written, then 94 test-first tasks.
4. The tasks were implemented, with tests written and seen to fail before each piece of code.

The AI drafted code and tests. The independent checks are the hand-written fixtures, the issue-log comparison and the conformance recount, and they are what make the results trustworthy.
