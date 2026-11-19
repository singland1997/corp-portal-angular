export interface TableRow {
  id: string;
}

/** Default shape for consumers that do not supply a feature-specific row model. */
export interface PortalRow extends TableRow {
  [key: string]: string | number;
}

export type TableField<TRow extends TableRow> = Extract<keyof TRow, string>;

export interface TableColumn<TRow extends TableRow = PortalRow> {
  field: TableField<TRow>;
  header: string;
  sortable?: boolean;
  /** `signed`: a change shown with its sign; positive green, negative red (the sign stays the cue). */
  type?: 'text' | 'status' | 'signed';
  /** With any width set, the table uses a fixed layout so columns do not move between pages. */
  width?: string;
  /** `end` right-aligns numbers so digits line up. */
  align?: 'start' | 'end';
}

export interface TableHeader<TRow extends TableRow> extends TableColumn<TRow> {
  sortDirection: 'ascending' | 'descending' | 'none' | null;
  sortIcon: string;
}
export interface TableAction {
  id: string;
  label: string;
  icon: string;
}
export interface TableActionEvent<TRow extends TableRow = PortalRow> {
  action: string;
  row: TRow;
}
/** One-based page index, suitable for mapping to your backend's contract. */
export interface TableQuery {
  page: number;
  pageSize: number;
  search: string;
  sortField: string | null;
  sortOrder: 1 | -1;
}
