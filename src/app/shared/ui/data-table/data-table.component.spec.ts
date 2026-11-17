import { TestBed } from '@angular/core/testing';

import { DataTableComponent } from './data-table.component';
import { TableQuery } from './data-table.models';

interface PersonRow {
  id: string;
  name: string;
}

describe('DataTableComponent', () => {
  async function create(serverSide = false) {
    await TestBed.configureTestingModule({ imports: [DataTableComponent] }).compileComponents();
    const fixture = TestBed.createComponent<DataTableComponent<PersonRow>>(DataTableComponent);
    fixture.componentRef.setInput('label', 'Numbers');
    fixture.componentRef.setInput('columns', [{ field: 'name', header: 'Name', sortable: true }]);
    fixture.componentRef.setInput(
      'rows',
      Array.from({ length: 24 }, (_, i) => ({ id: `${i + 1}`, name: `Person ${i + 1}` })),
    );
    fixture.componentRef.setInput('serverSide', serverSide);
    fixture.componentRef.setInput('totalRecords', 1248);
    return fixture;
  }

  it('resets pagination and selection when searching', async () => {
    const fixture = await create();
    const table = fixture.componentInstance;
    fixture.detectChanges();
    table.paginate({ first: 20, rows: 10 });
    table.select('21', true);
    table.setSearch('Person 24');
    fixture.detectChanges();
    expect(table.first()).toBe(0);
    expect(table.selectedIds()).toEqual([]);
    expect(table.visibleRows().map((row) => row.id)).toEqual(['24']);
  });
  it('sorts numeric labels naturally and reverses direction', async () => {
    const fixture = await create();
    const table = fixture.componentInstance;
    fixture.detectChanges();
    const column = table.columns()[0];
    table.sort(column);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('th[aria-sort]').getAttribute('aria-sort')).toBe(
      'ascending',
    );
    expect(table.visibleRows()[1].name).toBe('Person 2');
    table.sort(column);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('th[aria-sort]').getAttribute('aria-sort')).toBe(
      'descending',
    );
    expect(table.visibleRows()[0].name).toBe('Person 24');
  });
  it('selects visible rows only and retains selection across pages', async () => {
    const fixture = await create();
    const table = fixture.componentInstance;
    fixture.detectChanges();
    table.selectVisible(true);
    expect(table.selectedIds()).toHaveLength(10);
    table.paginate({ first: 10, rows: 10 });
    expect(table.allSelected()).toBe(false);
    table.select('11', true);
    expect(table.partiallySelected()).toBe(true);
    table.selectVisible(false);
    expect(table.selectedIds()).toHaveLength(10);
  });
  it('clamps client pagination when the dataset shrinks', async () => {
    const fixture = await create();
    const table = fixture.componentInstance;
    fixture.detectChanges();
    table.paginate({ first: 20, rows: 10 });
    fixture.componentRef.setInput('rows', [{ id: '1', name: 'Only remaining row' }]);
    fixture.detectChanges();
    expect(table.first()).toBe(0);
    expect(table.visibleRows()).toHaveLength(1);
  });
  it('emits a server query without slicing or filtering the supplied page', async () => {
    const fixture = await create(true);
    const table = fixture.componentInstance;
    const queries: TableQuery[] = [];
    table.queryChange.subscribe((query) => queries.push(query));
    fixture.componentRef.setInput('rows', [{ id: '42', name: 'API result' }]);
    fixture.detectChanges();
    expect(queries[0].page).toBe(1);
    table.setSearch('server term');
    table.paginate({ first: 20, rows: 10 });
    expect(queries.at(-1)).toEqual({
      page: 3,
      pageSize: 10,
      search: 'server term',
      sortField: null,
      sortOrder: 1,
    });
    expect(table.count()).toBe(1248);
    expect(table.visibleRows()[0].id).toBe('42');
  });
  it('renders errors and emits retry instead of presenting stale rows', async () => {
    const fixture = await create();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.componentRef.setInput('error', 'Network unavailable');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Network unavailable');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    fixture.nativeElement.querySelector('cp-feedback-state button').click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
