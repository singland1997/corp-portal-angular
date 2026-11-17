import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes every cell, starts with a BOM and guards spreadsheet formulas', () => {
    const csv = toCsv(['Name', 'Amount'], [['=SUM(A1)', 1200]]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual(['"Name","Amount"', '"\'=SUM(A1)","1200"']);
  });
});
