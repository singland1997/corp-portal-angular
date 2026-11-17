import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { APP_ENVIRONMENT } from '@core/config/app-environment.token';
import { version } from '../../../../../package.json';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-app-version',
  templateUrl: './app-version.component.html',
})
export class AppVersionComponent {
  readonly version = version;
  readonly environmentName = inject(APP_ENVIRONMENT).name;
}
