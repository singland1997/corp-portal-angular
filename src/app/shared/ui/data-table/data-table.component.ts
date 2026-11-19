import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { LocaleService } from '@core/i18n/locale.service';

import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';

import {
  PortalRow,
  TableAction,
  TableActionEvent,
  TableColumn,
  TableQuery,
  TableRow,
  TableField,
  TableHeader,
} from './data-table.models';
import { queryClientRows } from './data-table.query';

let nextTableId = 0;

/**
 * ตารางกลางของทั้งแอป: ค้นหา, เรียง, แบ่งหน้า, เลือกหลายแถว และปุ่มต่อแถว
 *
 * - ปกติค้นหา/เรียง/แบ่งหน้าในเครื่อง (`data-table.query.ts`)
 * - `serverSide=true` ไม่กรองเอง แต่ส่ง `queryChange` ให้หน้าเรียก API แทน
 * - ใส่ตัวกรองเพิ่มด้วย `<div table-filters>` และปุ่มสำหรับแถวที่เลือกด้วย `table-bulk-actions`
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-data-table',
  host: { class: 'block min-w-0' },
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TableModule,
    PaginatorModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    CheckboxModule,
    TooltipModule,
    StatusBadgeComponent,
    FeedbackStateComponent,
  ],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<TRow extends TableRow = PortalRow> implements OnInit {
  readonly i18n = inject(LocaleService);
  readonly id = `portal-table-${++nextTableId}`;

  readonly rows = input.required<TRow[]>();
  readonly columns = input.required<TableColumn<TRow>[]>();
  readonly label = input.required<string>();
  readonly actions = input<TableAction[]>([]);
  readonly searchable = input(true);
  readonly searchPlaceholder = input('');
  readonly selectable = input(false);
  readonly loading = input(false);
  readonly error = input('');
  readonly serverSide = input(false);
  readonly totalRecords = input(0);
  readonly cellTemplate = input<TemplateRef<{ $implicit: TRow; column: TableColumn<TRow> }> | null>(
    null,
  );
  readonly selectedIds = model<string[]>([]);
  readonly rowAction = output<TableActionEvent<TRow>>();
  readonly queryChange = output<TableQuery>();
  readonly retry = output<void>();

  readonly search = signal('');
  readonly first = signal(0);
  readonly pageSizeOptions = [10, 25, 50];
  readonly pageSize = signal(this.pageSizeOptions[0]);
  readonly sortField = signal<TableField<TRow> | null>(null);
  readonly sortOrder = signal<1 | -1>(1);

  readonly headerColumns = computed<TableHeader<TRow>[]>(() =>
    this.columns().map((column) => {
      const header: TableHeader<TRow> = {
        ...column,
        sortDirection: column.sortable ? 'none' : null,
        sortIcon: 'pi pi-sort-alt',
      };

      if (column.sortable && this.sortField() === column.field) {
        const ascending = this.sortOrder() === 1;
        header.sortDirection = ascending ? 'ascending' : 'descending';
        header.sortIcon = ascending ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down';
      }

      return header;
    }),
  );
  /** Fixed layout once a column sets a width: the same widths on every page. */
  readonly tableClass = computed(() =>
    !this.visibleRows().length
      ? 'w-full'
      : this.columns().some((column) => column.width)
        ? 'min-w-[640px] table-fixed'
        : 'min-w-[640px]',
  );

  /** Classes of one body cell: alignment, truncation in a fixed layout, and the sign colour. */
  cellClass(column: TableColumn<TRow>, row: TRow): string {
    const classes = ['whitespace-nowrap', 'text-sm'];
    if (column.align === 'end') classes.push('text-right', 'tabular-nums');
    if (this.columns().some((c) => c.width)) classes.push('overflow-hidden', 'text-ellipsis');
    if (column.type === 'signed') {
      const tone = signTone(row[column.field]);
      if (tone) classes.push(tone === 'positive' ? 'text-emerald-700' : 'text-red-700');
    }
    return classes.join(' ');
  }

  readonly columnCount = computed(
    () => this.columns().length + Number(this.selectable()) + Number(this.actions().length > 0),
  );
  readonly filteredRows = computed(() => {
    if (this.serverSide()) {
      return this.rows();
    }
    return queryClientRows(this.rows(), this.columns(), {
      search: this.search(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
    });
  });
  readonly count = computed(() =>
    this.serverSide() ? this.totalRecords() : this.filteredRows().length,
  );
  readonly visibleRows = computed(() =>
    this.serverSide()
      ? this.rows()
      : this.filteredRows().slice(this.first(), this.first() + this.pageSize()),
  );
  readonly allSelected = computed(
    () =>
      this.visibleRows().length > 0 &&
      this.visibleRows().every((row) => this.selectedIds().includes(row.id)),
  );
  readonly partiallySelected = computed(
    () =>
      !this.allSelected() && this.visibleRows().some((row) => this.selectedIds().includes(row.id)),
  );

  constructor() {
    effect(() => {
      // กรองหรือข้อมูลเปลี่ยนจนหน้าปัจจุบันว่าง → กลับไปหน้าแรก
      if (!this.serverSide() && this.first() >= this.count() && this.first() !== 0) {
        this.first.set(0);
      }
    });
  }

  ngOnInit(): void {
    if (this.serverSide()) {
      this.emitQuery();
    }
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.reset();
  }

  reset(): void {
    this.first.set(0);
    this.selectedIds.set([]);
    this.emitQuery();
  }

  sort(column: TableColumn<TRow>): void {
    if (!column.sortable) {
      return;
    }
    this.sortOrder.set(this.sortField() === column.field && this.sortOrder() === 1 ? -1 : 1);
    this.sortField.set(column.field);
    this.first.set(0);
    this.emitQuery();
  }

  paginate(event: PaginatorState): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSizeOptions[0]);
    this.emitQuery();
  }

  select(id: string, checked: boolean): void {
    this.selectedIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id),
    );
  }

  selectVisible(checked: boolean): void {
    const visible = new Set(this.visibleRows().map((row) => row.id));
    this.selectedIds.update((ids) =>
      checked ? [...new Set([...ids, ...visible])] : ids.filter((id) => !visible.has(id)),
    );
  }

  private emitQuery(): void {
    this.queryChange.emit({
      page: Math.floor(this.first() / this.pageSize()) + 1,
      pageSize: this.pageSize(),
      search: this.search(),
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
    });
  }
}

/** Sign of a change: a number, or text that starts with "+" / "−" / "-" (e.g. "+200 MB"). */
export function signTone(value: unknown): 'positive' | 'negative' | null {
  if (typeof value === 'number') return value > 0 ? 'positive' : value < 0 ? 'negative' : null;
  if (typeof value !== 'string') return null;
  const first = value.trim().charAt(0);
  return first === '+' ? 'positive' : first === '−' || first === '-' ? 'negative' : null;
}
