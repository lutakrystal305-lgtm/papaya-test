# Policy Benefits Calculator

Solution to [AI Challenge 06 — Policy Benefits Calculator](https://github.com/papaya-insurtech/pumpkin/blob/main/Hiring/AI_Engineering_Challenges/AI_Challenge_06.md).

Given a policy definition (JSON) and a list of medical expenses, the calculator works out the covered amount for each expense and explains it in plain language. Then it prints the balance remaining on each benefit. It handles:

- annual and lifetime limits;
- per-visit, per-event and per-day sub-limits;
- yearly sub-limits and visit counts;
- percentage copays (with an optional cap) and fixed copays;
- deductibles;
- waiting periods;
- exclusions.

It is a **NestJS 11** application with one calculation module and three ways to use it:

| Entry point | Use |
|---|---|
| CLI: `yarn calc` | Reads JSON files, then writes `results.json` + `report.md` and prints the report |
| HTTP: `POST /calculations`, `POST /calculations/report` | Same calculation as a local REST API (JSON or Markdown) |
| Library: `calculateBenefits()` | Pure function: no framework DI, no I/O |

## Quick start

Requires Node.js ≥ 20 and Yarn 1 (npm is not used).

```bash
yarn install --frozen-lockfile

# 20-expense sample → out/sample/{results.json,report.md}, and the report is printed
yarn calc --policy data/policy.sample.json --expenses data/expenses.sample.json --out out/sample

# All tests (unit + e2e)
yarn test && yarn test:e2e
```

Compare the output with the hand-calculated expected output:

```bash
diff -r out/sample expected/sample   # no output = identical
```

## CLI

```text
yarn calc --policy <policy.json> --expenses <expenses.json> [--out <dir>] [--quiet]
```

| Option | Default | Meaning |
|---|---|---|
| `-p, --policy` | required | policy JSON file |
| `-e, --expenses` | required | expenses JSON array |
| `-o, --out` | `./out` | output directory (created if it doesn't exist) |
| `-q, --quiet` | off | don't print the report to stdout |

Exit codes:

| Code | Meaning |
|---|---|
| `0` | success (denied expenses are still a success) |
| `1` | invalid policy, `expenses` is not an array, or a file isn't valid JSON. Every error is printed to stderr, one per line |
| `2` | missing `--policy`/`--expenses`, or a file that can't be read or written (commander's own parse errors, such as an unknown option, exit with `1`) |

After `yarn build`, `yarn calc:prod …` runs the compiled CLI.

## HTTP API

```bash
yarn start:dev            # PORT defaults to 3000 (see .env.example)

curl -s -X POST localhost:3000/calculations \
  -H 'content-type: application/json' \
  -d "{\"policy\": $(cat data/policy.sample.json), \"expenses\": $(cat data/expenses.sample.json)}"

curl -s -X POST localhost:3000/calculations/report -H 'content-type: application/json' \
  -d "{\"policy\": $(cat data/policy.sample.json), \"expenses\": $(cat data/expenses.sample.json)}"
```

- `200` returns the calculation output (JSON) or the Markdown report (`text/markdown`).
- `400` returns `{ "statusCode": 400, "message": "Invalid policy", "errors": [ … every error … ] }`.
- An invalid individual expense **does not** fail the request: it comes back as `DENIED` with the validation reason.
- Every response carries an `x-request-id` header. The ID is taken from the request or generated, and pino logs it on every log line.
- `GET /health` is a liveness check.

## Library

```ts
import { calculateBenefits, renderMarkdownReport } from './src';

const output = calculateBenefits(policyJson, expensesJson); // { results, summary }
const markdown = renderMarkdownReport(output);
```

`calculateBenefits` throws `PolicyValidationError` (with `.errors`, listing every problem) or `InputFormatError`. NestJS apps can import `CalculationsModule` and inject `CalculationsService`, whose `calculate(policy, expenses)` returns `{ output, report }`.

## Input format

The JSON Schemas in [`contracts/`](contracts/) are the reference: `policy.schema.json`, `expenses.schema.json`, `calculation-output.schema.json`. The policy format is based on Challenge 05, with these changes:

| Field | Meaning |
|---|---|
| `annual_limit` **or** `lifetime_limit` | exactly one per benefit type |
| `waiting_period_days` | counted from `plan.effective_date` |
| `deductible` | per benefit type, per policy year |
| `copay` | `{ percentage, max_per_visit? }` or `{ fixed_per_visit }`. A sub-benefit `copay` overrides the benefit's copay |
| sub-benefit limits | `limit_per_visit`, `limit_per_event`, `limit_per_day` (+ `max_days`), `limit_per_year`, `visits_per_year` |
| `exclusions[]` | `{ label, terms[] }`. A term matches when it appears in the diagnosis, ignoring case |

Unknown fields (for example Challenge 05's `policyholder` or `network`) are ignored.

An expense has `expense_id`, `date`, `benefit_type`, `sub_benefit`, `amount`, `diagnosis`, `provider`, and an optional `days` (default 1, used only by per-day benefits). Each amount may be at most 100,000,000,000 and `days` at most 366. Larger values are denied for that expense only.

## How an expense is processed

Expenses are sorted by **date, then `expense_id`**, so earlier claims use up the limits first. Each expense then goes through these steps. The first denial stops processing, and only the first denial reason is reported.

1. **Validation**: an invalid item is `DENIED` with the specific field errors. The rest of the run continues.
2. **Benefit lookup**: matched on the (benefit type, sub-benefit) pair.
3. **Policy period**: the date must fall between `effective_date` and `expiry_date`.
4. **Exclusions**.
5. **Waiting period**: the reason includes the date it ends and the days remaining.
6. **Availability**: visits, then days, then the yearly sub-limit, then the benefit-type limit. If any is used up, the expense is `DENIED` **before** the deductible step, so a denied claim never uses up the deductible.
7. **Per-visit / per-event / per-day cap**.
8. **Deductible**: if it absorbs the whole amount, the expense is `DENIED` ("applied to deductible") and only the deductible balance changes.
9. **Copay**: worked out on the amount after the deductible, before any remaining-limit cap.
10. **Remaining limits**: covered = the smallest of the amount after copay, the remaining yearly sub-limit, and the remaining benefit-type limit. The reason names the limit that applied and the amount above it.

Decision: `COVERED` if covered = submitted, `DENIED` if covered = 0, otherwise `PARTIALLY_COVERED`. `member_pays` always equals submitted − covered. Money is calculated in whole satang (integer minor units) with half-up rounding, so totals add up exactly.

Example reasons:

```text
Deductible applied: 1,000 THB (0 THB deductible remaining). 20% copay applied: 300 THB. Covered: 1,200 THB. Member pays: 1,300 THB.
20% copay applied, capped at 500 THB per visit: 500 THB. Covered amount limited by remaining Diagnostic Tests annual sub-limit (2,500 THB); 2,000 THB above limit. Covered: 2,500 THB. Member pays: 2,500 THB.
Denied: DENTAL waiting period of 90 days ends 2024-03-31 (50 days remaining).
Denied: Doctor Visit visit limit exhausted (5 of 5 visits used).
```

## Sample data and expected results

| File | Content |
|---|---|
| `data/policy.sample.json`, `data/expenses.sample.json` | Corporate policy and 20 expenses covering every rule (full, copay, waiting, exclusion, used-up limit, partial due to remaining limit, deductible, caps) |
| `data/policy.alt.json`, `data/expenses.alt.json` | A differently shaped individual policy (VISION, CRITICAL_ILLNESS, benefit-level fixed copay) to show reuse |
| `expected/{sample,alt}/results.json`, `report.md` | Expected output. The amounts were **calculated by hand before implementation** ([worksheet](../../../specs/001-policy-benefits-calculator/sample-scenario.md)). The reason texts were reviewed against that worksheet |
| `test-results/` | Recorded output of `yarn test:record` (unit + e2e results, coverage summary) |

Sample totals: submitted 124,000 · covered 90,600 · member pays 33,400 · 3 covered / 11 partially covered / 6 denied.

## Tests

| Command | What |
|---|---|
| `yarn test` | Unit tests (value objects, policy validation, ledger, every rule step, calculator, summary, parser, renderer, handler, library) |
| `yarn test:e2e` | HTTP, CLI, golden files (byte-for-byte), order independence (10 seeded shuffles), JSON Schema contracts |
| `yarn test:cov` | Coverage with gates: `Money`, `IsoDate` and `CopayRule` 100% branches; the `calculations` module ≥ 80% lines |
| `yarn test:record` | Writes `test-results/` |
| `yarn lint:check && yarn format:check && yarn build` | Quality gates: functions ≤ 40 lines, complexity < 10, no `any`, no `console` |

## Project layout

Standard NestJS module directory layout: one feature module, `calculations`, with no CQRS or DDD layers.

```text
src/
├── main.ts, app.module.ts           HTTP bootstrap (pino logger, global ValidationPipe)
├── cli.ts, cli/                     nest-commander `calc` command + file I/O
├── index.ts                         library API
├── config/, health/                 logger settings, GET /health
└── calculations/
    ├── calculations.module.ts
    ├── calculations.controller.ts   POST /calculations, POST /calculations/report
    ├── calculations.service.ts      parse → calculate → map → render
    ├── calculation-exception.filter.ts   validation errors → 400
    ├── input-parser.service.ts      class-validator DTOs → policy + expenses
    ├── report-renderer.service.ts   Markdown report
    ├── output.mapper.ts             snake_case JSON output
    ├── calculations.constants.ts, calculations.errors.ts
    ├── dto/                         class-validator request, policy and expense DTOs
    ├── interfaces/                  policy, expense, result and output types
    ├── policy/                      PolicyFactory: cross-field policy rules
    ├── calculator/                  BenefitsCalculator, BenefitLedger, rule steps, reasons, summary
    └── utils/                       Money, IsoDate, CopayRule, validation-error helpers
```

## Assumptions

- All expenses in one run belong to **one member**. Balances start full and only last for that run.
- Waiting periods count from the policy effective date (no per-member enrollment date).
- Lifetime limits start fully available.
- Amounts are in the policy currency only. There is no currency conversion.
- Exclusions match on diagnosis text only. Network and pre-authorization rules are out of scope.
- Copay is taken first, then the result is capped at the remaining limit. For example, 8,000 THB with a 20% copay and 5,000 THB left gives 5,000 covered and 3,000 paid by the member.
- An expense fully absorbed by the deductible is reported as `DENIED`, and its reason explains it.
- Duplicate `expense_id`s: the first occurrence in processing order is calculated and later ones are `DENIED`.
- The HTTP API is for local evaluation and has no authentication.

## Timeline estimate

| Phase | Estimate |
|---|---|
| Analysis, spec, clarifications, hand-calculated worksheet | 0.5 h |
| Calculation engine (money/date helpers, ledger, rules, reasons, summary), test-first | 1.5 h |
| NestJS module (validation, service, HTTP, CLI, library) | 1 h |
| Sample data, expected outputs, golden/contract/determinism tests, README | 1 h |
| **Total** | **≈ 4 h** |
