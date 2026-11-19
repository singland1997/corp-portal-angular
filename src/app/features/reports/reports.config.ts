import { ReportsMessageKey } from './reports.messages';

export type ReportAudience = 'platform' | 'corporate';

/**
 * วิธีแสดงค่าในช่อง
 * - number   ตัวเลขมีคอมมา
 * - data     MB → หน่วยที่อ่านง่าย (GB/TB)
 * - date     YYYY-MM-DD → วันที่ตามภาษา
 * - datetime วันเวลาตามเวลาประเทศไทย
 * - label    แปลค่า เช่น active → "ใช้งาน"
 */
export type CellFormat = 'text' | 'number' | 'data' | 'date' | 'datetime' | 'label';

export interface ReportColumn {
  field: string;
  header: ReportsMessageKey;
  format?: CellFormat;
}

export interface ReportDefinition {
  id: string;
  title: ReportsMessageKey;
  description: ReportsMessageKey;
  audience: ReportAudience;
  /** กรองตามช่วงวันที่ได้หรือไม่ (ถ้าไม่ได้ = ตัวเลข ณ ปัจจุบัน) */
  dated: boolean;
  columns: ReportColumn[];
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: 'package-status',
    title: 'packageStatus',
    description: 'packageStatusHint',
    audience: 'platform',
    dated: false,
    columns: [
      { field: 'package', header: 'package' },
      { field: 'corporate', header: 'corporate' },
      { field: 'sims', header: 'sims', format: 'number' },
      { field: 'activeSims', header: 'activeSims', format: 'number' },
      { field: 'suspendedSims', header: 'suspendedSims', format: 'number' },
      { field: 'status', header: 'status', format: 'label' },
    ],
  },
  {
    id: 'sim-status',
    title: 'simStatus',
    description: 'simStatusHint',
    audience: 'platform',
    dated: false,
    columns: [
      { field: 'corporate', header: 'corporate' },
      { field: 'lot', header: 'lot' },
      { field: 'total', header: 'total', format: 'number' },
      { field: 'active', header: 'active', format: 'number' },
      { field: 'inactive', header: 'inactive', format: 'number' },
      { field: 'suspended', header: 'suspended', format: 'number' },
    ],
  },
  {
    id: 'user-activity',
    title: 'userActivity',
    description: 'userActivityHint',
    audience: 'platform',
    dated: true,
    columns: [
      { field: 'date', header: 'dateTime', format: 'datetime' },
      { field: 'user', header: 'user' },
      { field: 'email', header: 'email' },
      { field: 'corporate', header: 'corporate' },
      { field: 'action', header: 'action' },
      { field: 'result', header: 'result', format: 'label' },
    ],
  },

  {
    id: 'usage-summary',
    title: 'usageSummary',
    description: 'usageSummaryHint',
    audience: 'corporate',
    dated: true,
    columns: [
      { field: 'date', header: 'date', format: 'date' },
      { field: 'voiceMinutes', header: 'voiceMinutes', format: 'number' },
      { field: 'dataMb', header: 'data', format: 'data' },
      { field: 'sms', header: 'sms', format: 'number' },
    ],
  },
  {
    id: 'usage-detail',
    title: 'usageDetail',
    description: 'usageDetailHint',
    audience: 'corporate',
    dated: true,
    columns: [
      { field: 'date', header: 'date', format: 'date' },
      { field: 'mobile', header: 'mobile' },
      { field: 'owner', header: 'owner' },
      { field: 'voiceMinutes', header: 'voiceMinutes', format: 'number' },
      { field: 'dataMb', header: 'data', format: 'data' },
      { field: 'sms', header: 'sms', format: 'number' },
    ],
  },
  {
    id: 'sim-activity',
    title: 'simActivity',
    description: 'simActivityHint',
    audience: 'corporate',
    dated: true,
    columns: [
      { field: 'date', header: 'dateTime', format: 'datetime' },
      { field: 'mobile', header: 'mobile' },
      { field: 'activity', header: 'activity' },
      { field: 'status', header: 'status', format: 'label' },
      { field: 'performedBy', header: 'performedBy' },
    ],
  },
  {
    id: 'packages',
    title: 'packages',
    description: 'packagesHint',
    audience: 'corporate',
    dated: false,
    columns: [
      { field: 'package', header: 'package' },
      { field: 'sims', header: 'sims', format: 'number' },
      { field: 'activeSims', header: 'activeSims', format: 'number' },
      { field: 'dataGb', header: 'dataAllowance', format: 'number' },
      { field: 'voiceMinutes', header: 'voiceMinutes', format: 'number' },
      { field: 'sms', header: 'sms', format: 'number' },
      { field: 'monthlyFeeThb', header: 'monthlyFee', format: 'number' },
    ],
  },
];
