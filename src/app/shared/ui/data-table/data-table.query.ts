import { TableRow, TableColumn, TableField } from './data-table.models';

interface ClientTableQuery<TRow extends TableRow> {
  search: string;
  sortField: TableField<TRow> | null;
  sortOrder: 1 | -1;
}

/** Client-only transformation. API results must bypass this function. */
export function queryClientRows<TRow extends TableRow>(
  rows: readonly TRow[],
  columns: readonly TableColumn<TRow>[],
  query: ClientTableQuery<TRow>,
): TRow[] {
  const searchTerm = query.search.trim().toLocaleLowerCase();
  const matchingRows = rows.filter(
    (row) =>
      !searchTerm ||
      columns.some((column) =>
        String(row[column.field] ?? '')
          .toLocaleLowerCase()
          .includes(searchTerm),
      ),
  );

  const sortField = query.sortField;
  if (!sortField) {
    return matchingRows;
  }

  return matchingRows.sort((leftRow, rightRow) => {
    const leftValue = leftRow[sortField];
    const rightValue = rightRow[sortField];
    const comparison =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
            numeric: true,
          });

    return comparison * query.sortOrder;
  });
}
