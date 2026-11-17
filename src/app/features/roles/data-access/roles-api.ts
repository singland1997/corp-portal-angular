import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '@core/api/api-client';
import { arrayOf, objectOf, parseResponse, text } from '@core/api/response-validation';
import { RoleDefinition } from '../roles.models';

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly api = inject(ApiClient);
  list() {
    return this.api.get<unknown>('/roles').pipe(
      map(
        (value) =>
          parseResponse<{ items: RoleDefinition[] }>(
            value,
            objectOf({
              items: arrayOf(
                objectOf({ id: text, name: text, description: text, permissions: arrayOf(text) }),
              ),
            }),
            'roles',
          ).items,
      ),
    );
  }
}
