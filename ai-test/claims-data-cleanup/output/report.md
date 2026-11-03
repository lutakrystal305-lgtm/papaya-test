# Data Quality Report

Source: `claims_dirty.csv`

## Row counts

| Metric | Rows |
| --- | --- |
| Rows before cleaning | 500 |
| Duplicates removed | 8 |
| Rows after cleaning | 492 |

## Issues found

| Code | Column | Severity | Rows |
| --- | --- | --- | --- |
| `CONFLICTING_CLAIM_ID` | claim_id | invalid | 6 |
| `MISSING_CLAIM_ID` | claim_id | invalid | 4 |
| `MISSING_POLICY_ID` | policy_id | invalid | 5 |
| `MISSING_MEMBER_NAME` | member_name | invalid | 0 |
| `NAME_CASING_FIXED` | member_name | fixed | 15 |
| `MISSING_CLAIM_TYPE` | claim_type | invalid | 0 |
| `CLAIM_TYPE_NORMALIZED` | claim_type | fixed | 12 |
| `CLAIM_TYPE_UNRECOGNIZED` | claim_type | invalid | 0 |
| `MISSING_DIAGNOSIS` | diagnosis | invalid | 15 |
| `DIAGNOSIS_CASING_FIXED` | diagnosis | fixed | 0 |
| `MISSING_AMOUNT` | submitted_amount | invalid | 0 |
| `AMOUNT_REFORMATTED` | submitted_amount | fixed | 6 |
| `AMOUNT_ZERO` | submitted_amount | invalid | 5 |
| `AMOUNT_NEGATIVE` | submitted_amount | invalid | 4 |
| `AMOUNT_UNPARSEABLE` | submitted_amount | invalid | 0 |
| `MISSING_CURRENCY` | currency | invalid | 0 |
| `CURRENCY_NORMALIZED` | currency | fixed | 13 |
| `CURRENCY_UNRECOGNIZED` | currency | invalid | 0 |
| `MISSING_DATE` | submitted_date | invalid | 0 |
| `DATE_REFORMATTED` | submitted_date | fixed | 14 |
| `DATE_INVALID` | submitted_date | invalid | 0 |
| `MISSING_STATUS` | status | invalid | 0 |
| `STATUS_NORMALIZED` | status | fixed | 0 |
| `STATUS_UNRECOGNIZED` | status | invalid | 0 |

- Rows with at least one issue: **78**
- Rows with more than one issue: **15**

## Claims by type

| Claim type | Claims |
| --- | --- |
| OUTPATIENT | 114 |
| INPATIENT | 110 |
| DENTAL | 133 |
| MATERNITY | 135 |

## Claims by status

| Status | Claims |
| --- | --- |
| APPROVED | 109 |
| REJECTED | 127 |
| PENDING | 135 |
| IN_REVIEW | 121 |

## Average amount by claim type

| Claim type | Currency | Rows | Average |
| --- | --- | --- | --- |
| OUTPATIENT | THB | 68 | 95,147.16 |
| OUTPATIENT | VND | 44 | 26,824,477.27 |
| INPATIENT | THB | 69 | 94,164.58 |
| INPATIENT | VND | 38 | 20,228,815.79 |
| DENTAL | THB | 75 | 107,482.35 |
| DENTAL | VND | 56 | 23,250,357.14 |
| MATERNITY | THB | 70 | 101,200.66 |
| MATERNITY | VND | 63 | 27,050,809.52 |

## Top 5 diagnoses

| Rank | Diagnosis | Claims |
| --- | --- | --- |
| 1 | Gastritis | 40 |
| 2 | Hypertension | 38 |
| 3 | Asthma | 36 |
| 4 | Dengue Fever | 36 |
| 5 | Bronchitis | 35 |
