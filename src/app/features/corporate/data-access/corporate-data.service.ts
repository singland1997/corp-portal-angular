import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { readResource } from '@core/api/read-resource';
import { INITIAL_QUERY, pageParams, sameTableQuery } from '@core/api/pagination';
import { TableQuery } from '@shared/ui/data-table/data-table.models';
import { apiErrorMessage } from '@core/api/api-error';
import { TranslationKey } from '@core/i18n/translation.models';
import { CommandResult, emptyCounts, NumberAction } from '../corporate.models';
import { CORPORATE_REPOSITORY } from './corporate.repository';

@Injectable()
export class CorporateDataService {
  private readonly repository = inject(CORPORATE_REPOSITORY);
  private readonly context = inject(CorporateContext);
  readonly query = signal<TableQuery>(INITIAL_QUERY, { equal: sameTableQuery });
  readonly status = signal('all');
  readonly lot = signal<string | null>(null);
  readonly resource = readResource(
    () => {
      const id = this.context.current()?.id;
      if (!id) return null;
      return {
        id,
        params: {
          ...pageParams(this.query(), 'mobile'),
          ...(this.status() === 'all' ? {} : { status: this.status() }),
          ...(this.lot() === null ? {} : { lot: this.lot()! }),
        },
      };
    },
    ({ id, params }) => this.repository.page(id, params),
  );
  readonly numbers = computed(() => this.resource.data()?.items ?? []);
  readonly total = computed(() => this.resource.data()?.total ?? 0);
  readonly lots = computed(
    () =>
      this.resource.data()?.lots.map((item) => ({
        lot: item.lot,
        productName: item.productName ?? null,
        quotaType: item.quotaType ?? null,
        ...item.counts,
      })) ?? [],
  );
  readonly counts = computed(() => this.resource.data()?.counts ?? emptyCounts());
  readonly busy = signal(false);
  readonly mutationError = signal<TranslationKey | null>(null);

  /** Statuses in the table change only after the next CRM sync; results come from the API. */
  async runCommand(action: NumberAction, ids: readonly string[]): Promise<CommandResult[]> {
    const corporateId = this.context.current()?.id;
    if (!corporateId || this.busy()) throw new Error('Mutation not available');
    this.busy.set(true);
    this.mutationError.set(null);
    try {
      return await firstValueFrom(this.repository.command(corporateId, action, ids));
    } catch (error) {
      if (corporateId === this.context.current()?.id)
        this.mutationError.set(apiErrorMessage(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }
}
