import { InjectionToken } from '@angular/core';

import { AppEnvironment } from '@env/environment.model';

/** Inject into data-access services instead of importing environment files in pages. */
export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');
