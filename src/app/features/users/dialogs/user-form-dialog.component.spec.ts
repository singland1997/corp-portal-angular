import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CorporateContext } from '@core/corporate/corporate-context.service';
import { LocaleService } from '@core/i18n/locale.service';
import { testSession } from '../../../../testing/auth.fixture';
import { UsersApi } from '../data-access/users-api';
import { UserRow } from '../users.models';
import { UsersPage } from '../users.page';
import { usersEn, usersTh } from '../users.messages';
import { UserFormDialogComponent } from './user-form-dialog.component';

const corporates = testSession(true).user.corporates;
const owner: UserRow = {
  id: 'sales-one',
  name: 'Sales One',
  email: 'one@example.test',
  userType: 'platform',
  role: 'sales',
  status: 'inactive',
  corporateId: null,
  corporateName: null,
  corporates: [corporates[0]],
};

describe('Sales corporate assignments', () => {
  const locale = signal<'en' | 'th'>('en');
  let api: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    locale.set('en');
    api = {
      list: vi.fn().mockReturnValue(of([owner])),
      create: vi.fn().mockReturnValue(of({ ...owner, inviteToken: 'test', inviteExpiresAt: 123 })),
      update: vi.fn().mockReturnValue(of(owner)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersApi, useValue: api },
        { provide: LocaleService, useValue: { locale } },
        {
          provide: CorporateContext,
          useValue: {
            current: () => corporates[0],
            options: () => corporates.map((c) => ({ value: c.id, label: c.name })),
          },
        },
      ],
    });
    TestBed.overrideComponent(UserFormDialogComponent, { set: { template: '', imports: [] } });
    TestBed.overrideComponent(UsersPage, { set: { template: '', imports: [] } });
  });

  function open(user?: UserRow) {
    const fixture = TestBed.createComponent(UserFormDialogComponent);
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('users', [owner]);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    Object.assign(form.draft, {
      userType: 'platform',
      role: 'sales',
      fullName: 'Sales',
      email: 'new@example.test',
    });
    return form;
  }

  it('disables another sales owner even when inactive, but preserves the current owner selections', () => {
    const create = open();
    expect(create.salesCorporateOptions()[0].disabled).toBe(true);
    expect(create.salesCorporateOptions()[0].label).toContain('Sales One');
    expect(create.salesCorporateOptions()[1].disabled).toBe(false);
    const edit = open(owner);
    expect(edit.draft.corporateIds).toEqual(['A']);
    expect(edit.salesCorporateOptions()[0].disabled).toBe(false);
  });

  it('requires selection and blocks an organization owned by someone else before posting', async () => {
    const form = open();
    await form.submit();
    expect(form.error()).toBe(usersEn.salesCorporateRequired);
    form.draft.corporateIds = ['A'];
    await form.submit();
    expect(form.error()).toBe(usersEn.corporateAssigned);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('sends only selected corporate IDs when creating and editing sales', async () => {
    const create = open();
    create.draft.corporateIds = ['B'];
    await create.submit();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'sales', corporateIds: ['B'] }),
    );
    const edit = open(owner);
    edit.draft.corporateIds = ['A', 'B'];
    await edit.submit();
    expect(api.update).toHaveBeenCalledWith(
      owner.id,
      expect.objectContaining({ corporateIds: ['A', 'B'] }),
    );
  });

  it('shows assignment conflict in both languages and requests updated owners after a racing save', async () => {
    api.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { error: { code: 'CORPORATE_ALREADY_ASSIGNED' } },
          }),
      ),
    );
    const form = open();
    const reload = vi.fn();
    form.refreshUsers.subscribe(reload);
    form.draft.corporateIds = ['B'];
    for (const language of ['en', 'th'] as const) {
      locale.set(language);
      await form.submit();
      expect(form.error()).toBe((language === 'en' ? usersEn : usersTh).corporateAssigned);
      expect(form.visible()).toBe(true);
    }
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('shows and filters sales by assigned organizations instead of all corporates', () => {
    const page = TestBed.createComponent(UsersPage).componentInstance;
    expect(page.rows()[0].corporateLabel).toBe('A');
    page.corporateFilter.set('B');
    expect(page.rows()).toHaveLength(0);
    page.corporateFilter.set('A');
    expect(page.rows()).toHaveLength(1);
  });
});
