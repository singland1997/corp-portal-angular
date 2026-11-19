import { inject, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CommandResult, CorporateSnapshot, NumberAction, NumberPage } from '../corporate.models';
import { CorporateApiRepository } from './corporate-api.repository';

export interface CorporateRepository {
  load(corporateId: string): Observable<CorporateSnapshot>;
  page(corporateId: string, params: Record<string, string | number>): Observable<NumberPage>;

  /** Send suspend/resume to the provisioning API; returns one result per number. */
  command(
    corporateId: string,
    action: NumberAction,
    ids: readonly string[],
  ): Observable<CommandResult[]>;
}

export const CORPORATE_REPOSITORY = new InjectionToken<CorporateRepository>('CorporateRepository', {
  providedIn: 'root',
  factory: () => inject(CorporateApiRepository),
});
