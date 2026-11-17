import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { corporateResource } from '@core/api/corporate-resource';
import { apiErrorMessage } from '@core/api/api-error';
import { TranslationKey } from '@core/i18n/translation.models';
import { PoolDraft, PoolError, QuotaDraft, quotaError } from '../pooling.models';
import { POOLING_REPOSITORY } from './pooling.repository';

@Injectable()
export class PoolingDataService {
  private readonly repository = inject(POOLING_REPOSITORY);
  private readonly context = inject(CorporateContext);
  readonly resource = corporateResource((id) => this.repository.load(id));
  readonly pools = computed(() => this.resource.data()?.pools ?? []);
  readonly members = computed(() => this.resource.data()?.members ?? []);
  readonly transactions = computed(() => this.resource.data()?.transactions ?? []);
  readonly busy = signal(false);
  readonly mutationError = signal<TranslationKey | null>(null);
  validatePool(draft: PoolDraft, id?: string): PoolError | null {
    const name = draft.name.trim();
    if (!name || name.length > 80) return 'nameRequired';
    if (draft.corporate !== this.context.current()?.name) return 'invalidCorporate';
    if (!['active', 'inactive'].includes(draft.status)) return 'invalidStatus';
    if (this.pools().some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()))
      return 'duplicateName';
    if (id && !this.pools().some((p) => p.id === id)) return 'poolMissing';
    return null;
  }
  async savePool(draft: PoolDraft, id?: string): Promise<PoolError | null> {
    const error = this.validatePool(draft, id);
    if (error) return error;
    await this.mutate((corporateId) => this.repository.save(corporateId, draft, id));
    return null;
  }
  async adjustQuota(id: string, draft: QuotaDraft): Promise<PoolError | null> {
    const pool = this.pools().find((p) => p.id === id);
    if (!pool) return 'poolMissing';
    const error = quotaError(pool, draft);
    if (error) return error;
    await this.mutate((corporateId) => this.repository.adjust(corporateId, id, draft));
    return null;
  }
  private async mutate(operation: (id: string) => Observable<void>): Promise<void> {
    const id = this.context.current()?.id;
    if (!id || this.busy()) throw new Error('Mutation not available');
    this.busy.set(true);
    this.mutationError.set(null);
    try {
      await firstValueFrom(operation(id));
      if (id === this.context.current()?.id) this.resource.reload();
    } catch (error) {
      if (id === this.context.current()?.id) this.mutationError.set(apiErrorMessage(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }
}
