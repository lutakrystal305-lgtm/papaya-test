export const TOTAL_ROWS = 500;
export const BASE_ROWS = 489;
export const SINGLE_ISSUE_ROWS = 60;
export const MULTI_ISSUE_ROWS = 12;
export const MIN_VARIANTS_PER_MULTI_ROW = 2;
export const MAX_VARIANTS_PER_MULTI_ROW = 3;
export const EXACT_DUPLICATES = 8;
export const NEAR_COPIES = 3;

export const ISSUE_ROWS_MIN = 75;
export const ISSUE_ROWS_MAX = 100;
export const MIN_MULTI_ISSUE_ROWS = 5;

export const GENERATION_YEAR = 2024;
export const THB_SHARE = 0.6;
export const THB_AMOUNT_MIN = 500;
export const THB_AMOUNT_MAX = 200_000;
export const VND_AMOUNT_STEP = 1_000;
export const VND_AMOUNT_MIN = 100_000;
export const VND_AMOUNT_MAX = 50_000_000;
export const COMMA_AMOUNT_MIN = 1_000;

export const CLAIM_ID_PREFIX = 'CLM-';
export const CLAIM_ID_DIGITS = 5;

/** Title-case names with no hyphens, apostrophes or "Mc" prefixes, so simple title case leaves them unchanged (A-6). */
export const MEMBER_NAMES: readonly string[] = [
  'Somchai Prasert',
  'Malee Sukjai',
  'Anan Chaiyaporn',
  'Pim Rattana',
  'Kittisak Wongsa',
  'Nattaya Srisuk',
  'Chai Wong',
  'Siriporn Thong',
  'Wichai Boonmee',
  'Ratana Kaewmanee',
  'Somsak Phanit',
  'Kanya Intharat',
  'Thanakorn Saelim',
  'Duangjai Panya',
  'Prasit Chanthong',
  'Nok Siripong',
  'Arthit Kongkaew',
  'Busaba Lertsiri',
  'Ekkachai Muangmai',
  'Jintana Rakdee',
  'Nguyen Van An',
  'Tran Thi Mai',
  'Le Van Kiet',
  'Pham Thi Bao',
  'Hoang Van Duc',
  'Vo Thi Lan',
  'Dang Van Hung',
  'Bui Thi Hoa',
  'Do Van Minh',
  'Ngo Thi Linh',
  'Duong Van Phuc',
  'Ly Thi Thu',
  'Truong Van Nam',
  'Dinh Thi Huong',
  'Mai Van Long',
  'Ho Thi Ngoc',
  'Phan Van Tuan',
  'Vu Thi Hanh',
  'Cao Van Khanh',
  'Lam Thi Yen',
];

export const DIAGNOSES: readonly string[] = [
  'Flu',
  'Dengue Fever',
  'Gastritis',
  'Migraine',
  'Asthma',
  'Bronchitis',
  'Pneumonia',
  'Hypertension',
  'Diabetes',
  'Food Poisoning',
  'Back Pain',
  'Sinusitis',
  'Conjunctivitis',
  'Tooth Decay',
  'Pregnancy Checkup',
];

const POLICY_COUNT = 30;
const FIRST_POLICY = 101;

export const POLICY_IDS: readonly string[] = Array.from(
  { length: POLICY_COUNT },
  (_, i) => `POL-${FIRST_POLICY + i}`,
);
