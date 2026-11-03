import { cleanClaims } from './cleaning/cleaner';
import { parseClaimsCsv } from './csv/claims-csv-reader';
import { serializeCleanCsv } from './csv/csv-writer';
import { renderReportMarkdown } from './report/markdown-renderer';
import { buildReport } from './report/report-builder';
import type { CleanupResult, DataQualityReport } from './shared/types';

export interface CleanupRun {
  result: CleanupResult;
  cleanCsv: string;
  report: DataQualityReport;
  reportMarkdown: string;
}

export function serializeReportJson(report: DataQualityReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function runCleanup(csvText: string, sourceFile: string): CleanupRun {
  const result = cleanClaims(parseClaimsCsv(csvText));
  const report = buildReport(result, sourceFile);
  return {
    result,
    cleanCsv: serializeCleanCsv(result),
    report,
    reportMarkdown: renderReportMarkdown(report),
  };
}
