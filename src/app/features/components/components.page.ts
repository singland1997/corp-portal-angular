import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { LocaleService } from '@core/i18n/locale.service';
import { PORTAL_COLORS } from '@core/theme/portal-colors';

import { PORTAL_STATUSES } from '@shared/models/portal-status';
import { CardComponent } from '@shared/ui/card/card.component';
import { ConfirmDialogComponent } from '@shared/ui/confirm-dialog/confirm-dialog.component';
import { FeedbackStateComponent } from '@shared/ui/feedback-state/feedback-state.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cp-components-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    CardComponent,
    PageHeaderComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    FeedbackStateComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './components.page.html',
})
export class ComponentsPage {
  readonly i18n = inject(LocaleService);
  readonly confirmOpen = signal(false);
  readonly confirmed = signal(false);
  readonly submitted = signal(false);
  readonly saved = signal(false);
  readonly state = signal<'empty' | 'loading' | 'error'>('empty');
  readonly stateOptions = computed(() =>
    (['empty', 'loading', 'error'] as const).map((value) => ({ value, label: this.i18n.t(value) })),
  );
  readonly statuses = PORTAL_STATUSES;
  readonly colors = [
    { name: 'Primary', hex: PORTAL_COLORS.primary },
    { name: 'Hover', hex: PORTAL_COLORS.primaryHover },
    { name: 'Soft', hex: PORTAL_COLORS.primarySoft },
    { name: 'Background', hex: PORTAL_COLORS.canvas },
    { name: 'Text', hex: PORTAL_COLORS.text },
    { name: 'Border', hex: PORTAL_COLORS.border },
  ];
  readonly roleOptions = computed(() => [
    { label: this.i18n.t('administrator'), value: 'admin' },
    { label: this.i18n.t('users'), value: 'user' },
  ]);
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    role: new FormControl('admin', { nonNullable: true }),
  });

  confirmAction(): void {
    this.confirmOpen.set(false);
    this.confirmed.set(true);
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.saved.set(this.form.valid);
  }
}
