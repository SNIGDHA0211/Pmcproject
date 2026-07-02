import type { FrequencyChartClientReportData } from '../types';
import type { CsvReportSection } from './csvReport';
import { downloadSectionsExcel } from './projectReportExcel';

function buildFrequencyChartSections(data: FrequencyChartClientReportData): CsvReportSection[] {
  const s = data.summary;
  return [
    {
      title: `${data.projectName} — Frequency Chart Summary`,
      headers: ['Metric', 'Value'],
      rows: [
        ['View', data.view],
        ['Period', `${data.fromDate} to ${data.toDate}`],
        ['Tests Required', s.testsRequired],
        ['Tests Conducted', s.testsConducted],
        ['Shortfall', s.shortfall],
        ['Tests Passed', s.testsPassed],
        ['Tests Failed', s.testsFailed],
        ['Quality Performance (%)', s.qualityPerformance],
        ['Pass Rate (%)', s.passRate],
        ['Fail Rate (%)', s.failRate],
      ],
    },
    {
      title: 'Material Testing Records',
      headers: [
        'Sr.',
        'Item Description',
        'Type of Test',
        'Frequency',
        'Unit',
        'Qty Prev. Bill',
        'Qty This Bill',
        'Total Qty',
        'Req. Tests Upto Date',
        'Field Lab Prev.',
        'Field Lab This',
        '3rd Party Prev.',
        '3rd Party This',
        'Total Conducted',
        'Activity',
        'Contractor',
        'Remarks',
      ],
      rows: data.rows.map((row) => [
        row.srNo,
        row.itemDescription,
        row.typeOfTest,
        row.frequencyOfTest ?? '',
        row.unit,
        row.qtyPreviousBill,
        row.qtyThisBill,
        row.totalQty ?? '',
        row.requiredTestsUptoDate ?? '',
        row.fieldLabPreviousBill,
        row.fieldLabThisBill,
        row.thirdPartyPreviousBill,
        row.thirdPartyThisBill,
        row.totalTestsConducted ?? '',
        row.activityName ?? '',
        row.contractorName ?? '',
        row.remarks ?? '',
      ]),
    },
  ];
}

export async function downloadFrequencyChartExcel(
  data: FrequencyChartClientReportData,
  filename: string
): Promise<void> {
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  await downloadSectionsExcel(buildFrequencyChartSections(data), safeName, 'Frequency Chart');
}

export function triggerExcelBlobDownload(blob: Blob, filename: string): void {
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: safeName,
  });
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  link.remove();
}
