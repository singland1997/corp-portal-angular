import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CorporateDataService } from '../corporate/data-access/corporate-data.service';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { PORTAL_STATUSES } from '@shared/models/portal-status';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { formatDataSize } from '@shared/utils/data-size';
import { MobileNumber } from '../corporate/corporate.models';

type SimRow = MobileNumber & { usage: string };

@Component({
  selector: 'cp-sim-page',
  providers: [CorporateDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DialogModule,
    SelectModule,
    CardComponent,
    DataTableComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './sim.page.html',
})
export class SimPage {
  readonly i18n = inject(LocaleService);
  readonly data = inject(CorporateDataService);
  private readonly corporate = inject(CorporateContext);
  readonly resource = this.data.resource;
  readonly status = this.data.status;
  readonly selected = signal<SimRow | null>(null);
  readonly statusOptions = computed(() => [
    { label: this.i18n.t('allStatuses'), value: 'all' },
    ...PORTAL_STATUSES.map((value) => ({ label: this.i18n.t(value), value })),
    { label: this.i18n.t('unknown'), value: 'unknown' },
  ]);
  readonly rows = computed<SimRow[]>(() =>
    this.data
      .numbers()
      .map((row) => ({ ...row, usage: formatDataSize(row.usageMb, this.i18n.locale(), 'GB') })),
  );
  readonly columns = computed<TableColumn<SimRow>[]>(() => [
    { field: 'mobile', header: this.i18n.t('mobile'), sortable: true },
    { field: 'iccid', header: 'ICCID' },
    { field: 'lot', header: this.i18n.t('lot'), sortable: true },
    { field: 'owner', header: this.i18n.t('owner'), sortable: true },
    { field: 'package', header: this.i18n.t('package'), sortable: true },
    { field: 'usage', header: this.i18n.t('totalUsage') },
    { field: 'status', header: this.i18n.t('status'), type: 'status', sortable: true },
  ]);
  readonly actions = computed(() => [
    { id: 'details', label: this.i18n.t('details'), icon: 'pi pi-eye' },
  ]);

  constructor() {
    effect(() => {
      this.corporate.current()?.id;
      untracked(() => {
        this.status.set('all');
        this.selected.set(null);
      });
    });
  }

  openDetails(event: TableActionEvent<SimRow>): void {
    if (event.action === 'details') this.selected.set(event.row);
  }
}
