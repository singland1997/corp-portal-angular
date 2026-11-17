/**
 * 1 ช่องใน CSV: ใส่เครื่องหมายคำพูดเสมอ และกันสูตร Excel (ข้อความที่ขึ้นต้นด้วย = + - @)
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const raw = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** รวมหัวตารางและแถวเป็นข้อความ CSV (มี BOM เพื่อให้ Excel อ่านภาษาไทยได้) */
export function toCsv(headings: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headings, ...rows].map((row) => row.map(csvCell).join(','));
  return '﻿' + lines.join('\r\n');
}

/** ให้ browser ดาวน์โหลดข้อความเป็นไฟล์ CSV */
export function downloadCsv(document: Document, fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
