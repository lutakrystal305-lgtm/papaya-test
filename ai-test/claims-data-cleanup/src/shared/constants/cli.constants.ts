export const DEFAULT_SEED = 42;
export const MAX_SEED = 4294967295;

export const DEFAULT_DIRTY_CSV = 'data/claims_dirty.csv';
export const DEFAULT_ISSUE_LOG = 'data/claims_dirty.issues.json';
export const DEFAULT_CLEAN_CSV = 'output/claims_clean.csv';
export const DEFAULT_REPORT_MD = 'output/report.md';
export const DEFAULT_REPORT_JSON = 'output/report.json';

export const EXIT_OK = 0;
export const EXIT_DATA_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;

export const USAGE_TEXT = `Usage:
  yarn generate [--seed <int>] [--out <path>] [--log <path>]
  yarn clean    [--in <path>] [--out <path>] [--report <path>] [--report-json <path>]
  yarn all      [--seed <int>] [--in <path>] [--log <path>] [--out <path>] [--report <path>] [--report-json <path>]

Commands:
  generate   Generate the dirty claims CSV and its issue log
  clean      Clean a claims CSV and write the clean CSV and the data quality report
  all        Run generate, then clean

Options:
  --seed <int>          Generator seed, 0-${MAX_SEED} (default ${DEFAULT_SEED})
  --out <path>          generate: dirty CSV (default ${DEFAULT_DIRTY_CSV})
                        clean/all: clean CSV (default ${DEFAULT_CLEAN_CSV})
  --log <path>          Issue log (default ${DEFAULT_ISSUE_LOG})
  --in <path>           Input CSV; for all, also where the dirty CSV is written (default ${DEFAULT_DIRTY_CSV})
  --report <path>       Markdown report (default ${DEFAULT_REPORT_MD})
  --report-json <path>  JSON report (default ${DEFAULT_REPORT_JSON})
  -h, --help            Show this help
`;
