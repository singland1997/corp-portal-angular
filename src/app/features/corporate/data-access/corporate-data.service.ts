import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { corporateResource } from '@core/api/corporate-resource';
import { apiErrorMessage } from '@core/api/api-error';
import { TranslationKey } from '@core/i18n/translation.models';
import { CommandResult, emptyCounts, NumberAction } from '../corporate.models';
import { CORPORATE_REPOSITORY } from './corporate.repository';

@Injectable()
export class CorporateDataService {
  private readonly repository = inject(CORPORATE_REPOSITORY);
  private readonly context = inject(CorporateContext);
  readonly resource = corporateResource((id) => this.repository.load(id));
  readonly numbers = computed(() => this.resource.data()?.numbers ?? []);
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
