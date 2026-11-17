# คู่มือส่วนกลางและธีม

[กลับหน้า README](../README.md)

## วิธีใช้ส่วนกลาง

เปิดหน้า `/components` หลังเข้าสู่ระบบเพื่อดูตัวอย่างหน้าตา และดู [CorporatePage](../src/app/features/corporate/corporate.page.ts) สำหรับตัวอย่างตาราง ตัวกรอง รายละเอียด และการยืนยัน bulk action

### หลักการ import และการรับส่งข้อมูล

1. Import component จากไฟล์โดยตรง เช่น `@shared/ui/card/card.component`
2. เพิ่ม component หรือ PrimeNG module ใน `imports` ของหน้าที่ใช้งาน
3. ส่งข้อมูลลง component ผ่าน `[input]` และรับ event ผ่าน `(output)`
4. ค่าที่แก้ได้ทั้งสองฝั่ง เช่น `selectedIds` และ `visible` ใช้ `[(...)]`
5. เก็บการโหลดข้อมูลและการตัดสินใจทางธุรกิจในหน้า feature หรือ data-access service

มี aliases `@core/*`, `@layout/*`, `@features/*`, `@shared/*` และ `@env/*` ใน `tsconfig.json` ส่วนไฟล์ภายใน feature เดียวกันใช้ relative import สั้น ๆ ได้ ไม่มี barrel กลางที่บังคับ import ทุก component

คำแปลใช้ไฟล์ `core/i18n/locales/en.ts` และ `th.ts` โดยตรง ส่วนชนิดข้อมูล `Locale` และ `TranslationKey` import จาก `core/i18n/translation.models.ts` ไม่ผ่านไฟล์รวม export

ใช้ standalone components, `ChangeDetectionStrategy.OnPush`, `signal` สำหรับ state และ `computed` สำหรับค่าที่คำนวณตาม state โครงการเปิด strict TypeScript และ strict templates รวมถึงตรวจตัวแปร/พารามิเตอร์ที่ไม่ได้ใช้

### รายการ component กลาง

ชื่อโฟลเดอร์ด้านล่างอยู่ภายใต้ `src/app/shared/ui/`

| โฟลเดอร์ / class                          | Selector             | ข้อมูลหลักที่รับ                                                | Event / ค่าที่รับส่งสองทาง                             |
| ----------------------------------------- | -------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `card/CardComponent`                      | `cp-card`            | `title`, `subtitle`, `flush` และเนื้อหาภายใน                    | —                                                      |
| `stat-card/StatCardComponent`             | `cp-stat-card`       | `label`, `value`, `unit`, `hint`, `icon`                        | —                                                      |
| `page-header/PageHeaderComponent`         | `cp-page-header`     | `title` และปุ่มภายใน                                            | —                                                      |
| `status-badge/StatusBadgeComponent`       | `cp-status-badge`    | `status`                                                        | —                                                      |
| `data-table/DataTableComponent`           | `cp-data-table`      | `rows`, `columns`, `label`, `actions` และตัวเลือกตาราง          | `rowAction`, `queryChange`, `retry`, `[(selectedIds)]` |
| `chart/ChartComponent`                    | `cp-chart`           | `type`, `data`, `options`, `label`, `height`                    | —                                                      |
| `form-field/FormFieldComponent`           | `cp-form-field`      | `inputId`, `label`, `hint`, `error`, `required` และ input ภายใน | —                                                      |
| `feedback-state/FeedbackStateComponent`   | `cp-feedback-state`  | `kind`, `title`, `description`                                  | `retry`                                                |
| `confirm-dialog/ConfirmDialogComponent`   | `cp-confirm-dialog`  | `title`, `message`, `confirmLabel`, `danger`, `busy`            | `confirmed`, `[(visible)]`                             |
| `language-switch/LanguageSwitchComponent` | `cp-language-switch` | ไม่ต้องส่งค่า ใช้ LocaleService ร่วมกัน                         | เปลี่ยนภาษาผ่าน service                                |

ไฟล์จริงลงท้ายด้วย `.component.ts` เช่น `card/card.component.ts` โดยแต่ละ component มี HTML แยกไฟล์

### ตัวอย่างหน้าใหม่: หัวข้อ การ์ด ตาราง และปุ่มรายละเอียด

ตัวอย่างนี้เป็นหน้าแบบข้อมูลในหน่วยความจำ ใช้ translation keys ที่มีอยู่แล้ว และเปิดรายละเอียดจากปุ่มรูปตา ข้อความหัวตารางและ action อยู่ใน `computed` เพื่อให้เปลี่ยนตามภาษา

ไฟล์ `numbers-example.page.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

import { LocaleService } from '@core/i18n/locale.service';
import { PortalStatus } from '@shared/models/portal-status';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { TableActionEvent, TableColumn } from '@shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';

interface NumberRow {
  id: string;
  mobile: string;
  owner: string;
  status: PortalStatus;
}

@Component({
  selector: 'cp-numbers-example-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    DataTableComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
    DialogModule,
  ],
  templateUrl: './numbers-example.page.html',
})
export class NumbersExamplePage {
  readonly i18n = inject(LocaleService);
  readonly selectedIds = signal<string[]>([]);
  readonly selectedNumber = signal<NumberRow | null>(null);
  readonly detailsVisible = signal(false);

  readonly rows = signal<NumberRow[]>([
    { id: 'number-001', mobile: '0812345678', owner: 'Narin', status: 'active' },
  ]);

  readonly columns = computed<TableColumn<NumberRow>[]>(() => [
    { field: 'mobile', header: this.i18n.t('mobile'), sortable: true },
    { field: 'owner', header: this.i18n.t('owner'), sortable: true },
    { field: 'status', header: this.i18n.t('status'), type: 'status', sortable: true },
  ]);

  readonly actions = computed(() => [
    { id: 'details', label: this.i18n.t('details'), icon: 'pi pi-eye' },
  ]);

  openDetails(event: TableActionEvent<NumberRow>): void {
    if (event.action !== 'details') return;
    this.selectedNumber.set(event.row);
    this.detailsVisible.set(true);
  }
}
```

ไฟล์ `numbers-example.page.html`:

```html
<div class="grid gap-6">
  <cp-page-header [title]="i18n.t('numbers')" />

  <cp-card [title]="i18n.t('numbers')" [flush]="true">
    <cp-data-table
      [label]="i18n.t('numbers')"
      [rows]="rows()"
      [columns]="columns()"
      [actions]="actions()"
      [selectable]="true"
      [(selectedIds)]="selectedIds"
      (rowAction)="openDetails($event)"
    />
  </cp-card>
</div>

<p-dialog
  [(visible)]="detailsVisible"
  [header]="i18n.t('details')"
  [modal]="true"
  [closeAriaLabel]="i18n.t('close')"
>
  @if (selectedNumber(); as number) {
  <div class="grid gap-3">
    <p>{{ number.mobile }}</p>
    <p>{{ number.owner }}</p>
    <cp-status-badge [status]="number.status" />
  </div>
  }
</p-dialog>
```

เมื่อใช้จริงให้ย้าย model และการโหลดข้อมูลไปอยู่ใน feature ตามขนาดงาน แล้วเพิ่ม route ภายใต้ `AppShell` ใน `app.routes.ts` โดยใช้ `loadComponent` และเพิ่มเมนูใน `portal-navigation.ts` ไม่ต้องประกอบ header/sidebar/footer ซ้ำในหน้าใหม่

### การ์ด หัวข้อ และสถานะ

- `cp-card`: ใส่เนื้อหาไว้ระหว่างแท็ก ใช้ `[card-actions]` สำหรับปุ่มข้างหัวข้อ และ `[card-footer]` สำหรับส่วนท้าย ต้องมี `title` จึงจะแสดงพื้นที่หัวข้อและ `card-actions`
- `flush=true`: ลด padding ของเนื้อหา เหมาะกับตารางที่ต้องการใช้ความกว้างของการ์ด
- `cp-page-header`: ใส่ปุ่มภายในแท็กเพื่อแสดงข้างชื่อหน้า
- `cp-stat-card`: ใช้แสดงตัวเลขสรุป `value` รับได้ทั้ง string และ number โดย `icon` ใช้ชื่อเช่น `pi-mobile`
- `cp-status-badge`: ส่งรหัสสถานะ `active`, `inactive`, `suspended`, `pending`, `failed` ตัวกลางจัดสีและคำแปลเอง ไม่ต้องแปลงรหัสเป็นข้อความไทยก่อนส่ง

ตัวอย่างหลัง import `StatCardComponent` และ `StatusBadgeComponent`:

```html
<cp-stat-card [label]="i18n.t('totalNumbers')" [value]="240" icon="pi-mobile" />
<cp-status-badge status="active" />
```

### ตาราง: ข้อมูลในเครื่องและข้อมูลจาก API

แต่ละแถวต้องมี `id: string` ที่ไม่ซ้ำและไม่เปลี่ยนตามลำดับแถว ใช้ `TableColumn<YourRow>[]` เพื่อให้ TypeScript ตรวจว่า `field` เป็น property ที่มีจริงใน model

| ตัวเลือก                               | วิธีใช้                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `serverSide=false` ซึ่งเป็นค่าเริ่มต้น | ส่งข้อมูลทั้งหมด ตารางค้นหา เรียง และแบ่งหน้าให้                         |
| `serverSide=true`                      | ส่งเฉพาะข้อมูลหน้าที่ API ส่งกลับ พร้อม `totalRecords` ของผลค้นหาทั้งหมด |
| `searchable` / `searchPlaceholder`     | เปิด/ปิดช่องค้นหา และกำหนดข้อความให้ตรงกับ feature                       |
| `loading`                              | แสดงสถานะกำลังโหลดแทนข้อมูลเดิม                                          |
| `error`                                | ส่งข้อความ error; ใช้ string ว่างเมื่อไม่มี error                        |
| `selectable` / `selectedIds`           | เปิด checkbox และเก็บ ID ที่เลือกไว้ในหน้าเจ้าของ                        |
| `actions` / `rowAction`                | กำหนดปุ่มต่อแถว; event มีรูปแบบ `{ action, row }`                        |
| `cellTemplate`                         | ปรับการแสดง cell โดย template รับ `$implicit: row` และ `column`          |

ในโหมด API ให้เพิ่ม state และ handler ในหน้าเจ้าของก่อนใช้ template ลักษณะนี้ โดยตัวอย่างเป็นส่วนเชื่อมต่อ ไม่ได้กำหนด endpoint หรือ service ให้:

```html
<cp-data-table
  [label]="i18n.t('numbers')"
  [rows]="rows()"
  [columns]="columns()"
  [serverSide]="true"
  [totalRecords]="totalRecords()"
  [loading]="loading()"
  [error]="error()"
  (queryChange)="loadPage($event)"
  (retry)="retryLastQuery()"
/>
```

`queryChange` ส่ง query เริ่มต้นในโหมด server และส่งอีกเมื่อค้นหา เรียง หรือเปลี่ยนหน้า ใช้ชนิด `TableQuery` จาก `data-table.models.ts`:

```ts
interface TableQuery {
  page: number; // หน้าแรกคือ 1
  pageSize: number;
  search: string;
  sortField: string | null;
  sortOrder: 1 | -1; // 1 คือเรียงขึ้น และ -1 คือเรียงลง
}
```

ใน `loadPage(query)` ให้แปลง query ตาม API contract ผ่าน data-access service จัดการ loading/error และส่งรายการกับยอดรวมกลับสู่ตาราง ตัวกลางไม่ค้นหา เรียง หรือตัดหน้า API ซ้ำ และไม่ debounce หรือยกเลิก request เก่าให้ ต้องจัดการเรื่องเหล่านี้ในชั้นโหลดข้อมูล

checkbox บนหัวตารางเลือกเฉพาะหน้าที่มองเห็น การเลือกคงอยู่เมื่อเปลี่ยนหน้า แต่ถูกล้างเมื่อเปลี่ยนคำค้น หากเปลี่ยนตัวกรองจากภายนอก ให้เรียก `reset()` เพื่อเริ่มหน้าแรก ล้างการเลือก และส่ง query ใหม่:

```ts
// เพิ่ม viewChild ใน import จาก @angular/core และประกาศใน class ของหน้า
readonly table = viewChild(DataTableComponent);

// เรียกหลังอัปเดตตัวกรองของหน้า
// this.table()?.reset();
```

ใช้ `setSearch('')` เมื่อต้องการล้างคำค้น ดูตัวอย่างจริงใน `CorporatePage` การเลือกทั้งหมดในหน้าปัจจุบันไม่เท่ากับการเลือกข้อมูลทั้งหมดที่ตรงเงื่อนไขบน server

### ฟอร์มและการแสดง validation

`cp-form-field` จัด label, hint และ error ส่วน input จริงใช้ PrimeNG โดยตรง ตัวกลางนี้ไม่ใช่ form control และไม่ได้ตรวจ validation ให้

ตัวอย่างส่วนของ class: import `FormControl`, `ReactiveFormsModule`, `Validators` จาก `@angular/forms`, `InputTextModule` จาก `primeng/inputtext` และ `FormFieldComponent` จาก `@shared/ui/form-field/form-field.component` จากนั้นเพิ่ม `ReactiveFormsModule`, `InputTextModule`, `FormFieldComponent` ลงใน `imports` ของหน้า:

```ts
readonly email = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required, Validators.email],
});

// ใช้ร่วมกับ readonly i18n = inject(LocaleService)
emailError(): string {
  return this.email.touched && this.email.invalid ? this.i18n.t('emailError') : '';
}
```

```html
<cp-form-field
  inputId="contact-email"
  [label]="i18n.t('emailAddress')"
  [required]="true"
  [error]="emailError()"
>
  <input
    pInputText
    id="contact-email"
    type="email"
    autocomplete="email"
    required
    [formControl]="email"
    [invalid]="!!emailError()"
    [attr.aria-invalid]="emailError() ? 'true' : null"
    [attr.aria-describedby]="emailError() ? 'contact-email-message' : null"
  />
</cp-form-field>
```

`inputId` ต้องตรงกับ `id` ของ input ส่วนข้อความประกอบมี ID เป็น `inputId + '-message'` หากแสดง hint ให้เชื่อม `aria-describedby` กับ ID นี้ด้วย `required` ของตัวกลางแสดงเครื่องหมายบังคับกรอก ต้องกำหนด validator และสถานะ required บน input จริงแยกกัน

### Dialog ยืนยัน และสถานะ loading/empty/error

Import `ConfirmDialogComponent` และประกาศ `visible = signal(false)`, `busy = signal(false)` ในหน้าเจ้าของ ตัวอย่าง template ต่อไปนี้ต้องมี handler `confirmOperation()` และข้อความ `confirmationTitle()`, `confirmationMessage()` ที่หน้าเตรียมจากคำแปล:

```html
<cp-confirm-dialog
  [(visible)]="visible"
  [title]="confirmationTitle()"
  [message]="confirmationMessage()"
  [busy]="busy()"
  [danger]="true"
  (confirmed)="confirmOperation()"
/>
```

เมื่อยืนยัน หน้าเจ้าของต้องตรวจป้องกันการส่งซ้ำ ตั้ง `busy`, เรียก service และปิด dialog ด้วย `visible.set(false)` เมื่อสำเร็จ หากล้มเหลวให้แสดง error และคืน `busy` ตัวกลางไม่เรียก API หรือปิดตัวเองเมื่อกดยืนยัน ขณะ busy ปุ่มยกเลิกและการปิดด้วย Escape จะถูกปิดใช้งาน

สำหรับพื้นที่เนื้อหาอื่น ใช้ `FeedbackStateComponent` โดย `kind` รับ `loading`, `empty`, `error` ตัวอย่างส่วน template:

```html
<cp-feedback-state kind="loading" />
<cp-feedback-state kind="empty" />
<cp-feedback-state kind="error" (retry)="reload()" />
```

เลือกแสดงทีละสถานะตาม state ของหน้าจอ และกำหนด `reload()` ในหน้าเจ้าของ เมื่อใช้ `cp-data-table` ให้ส่ง `loading`/`error` ผ่าน input ของตารางได้เลย ไม่ต้องแสดงสถานะซ้ำอีกชุด

### กราฟด้วย Chart.js

Import `ChartComponent` จาก `@shared/ui/chart/chart.component` แล้วเพิ่มใน `imports` รองรับ `line`, `bar` และ `doughnut` ตัวกลางลงทะเบียน Chart.js ให้แล้ว

ตัวอย่างส่วน TypeScript ใช้ชนิดกราฟเดียวกันทั้ง `ChartData` และ `ChartOptions` เพื่อป้องกัน type error:

```ts
import { ChartData, ChartOptions } from 'chart.js';
import { PORTAL_COLORS } from '@core/theme/portal-colors';

// ประกาศภายใน class ที่มี i18n โดย import computed จาก @angular/core
readonly poolData = computed<ChartData<'doughnut'>>(() => ({
  labels: [this.i18n.t('used'), this.i18n.t('remaining')],
  datasets: [{
    data: [65, 35],
    backgroundColor: [PORTAL_COLORS.primary, PORTAL_COLORS.subtle],
    borderWidth: 0,
  }],
}));

readonly poolOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
};
```

```html
<cp-chart
  type="doughnut"
  [data]="poolData()"
  [options]="poolOptions"
  [label]="i18n.t('poolTitle')"
  [height]="260"
/>
```

ต้องส่ง `type`, `data`, `options` และ `label` ให้ครบ ใส่ข้อความสรุปหรือตารางประกอบเพื่อให้เข้าใจข้อมูลโดยไม่ต้องอ่านกราฟอย่างเดียว ดูการจัดสีและหน่วยใน `features/dashboard/dashboard.charts.ts`

## Service กลาง ภาษา และ layout

### LocaleService

```ts
import { inject } from '@angular/core';
import { LocaleService } from '@core/i18n/locale.service';

// ประกาศใน component
readonly i18n = inject(LocaleService);

// อ่านภาษา: this.i18n.locale()
// อ่านคำแปล: this.i18n.t('dashboard')
// เปลี่ยนภาษา: this.i18n.setLocale('th') หรือ this.i18n.setLocale('en')
```

ใน HTML ใช้ `{{ i18n.t('dashboard') }}` ข้อความใหม่ต้องเพิ่ม key ในทั้ง `locales/en.ts` และ `locales/th.ts` TypeScript ตรวจความครบของ keys ให้

ค่าที่สร้างเป็น array เช่น dropdown options, หัวตาราง และ labels ของกราฟ ควรอยู่ใน `computed` เพื่อให้เปลี่ยนตามภาษา การเรียก `t()` เพียงครั้งเดียวตอนสร้าง array ธรรมดาจะไม่คำนวณใหม่เมื่อสลับภาษา

ใช้ `<cp-language-switch />` หลัง import `LanguageSwitchComponent` เมื่อต้องวางปุ่มภาษาเพิ่ม รูปแบบเป็นปุ่ม `English / ไทย` ไม่ใช่ dropdown โดยอยู่ภายในเมนูผู้ใช้ของ header และบนหน้า auth ปุ่มนี้เปลี่ยนข้อความและ `document.lang` พร้อมจดจำภาษาใน localStorage โดยไม่เปลี่ยน route หรือรีเซ็ตข้อมูลที่กรอก

### APP_ENVIRONMENT

อ่านค่าที่จำเป็นผ่าน injection token ใน data-access service เพื่อให้หน้าไม่ผูกกับไฟล์ environment ของแต่ละระบบ:

```ts
import { inject, Injectable } from '@angular/core';
import { APP_ENVIRONMENT } from '@core/config/app-environment.token';

@Injectable()
export class ExampleDataService {
  private readonly environment = inject(APP_ENVIRONMENT);

  get apiBaseUrl(): string {
    return this.environment.apiBaseUrl;
  }
}
```

เพิ่ม `providers: [ExampleDataService]` ในหน้าเจ้าของเมื่อต้องการอายุเท่าหน้านั้น ปัจจุบันลงทะเบียน `provideHttpClient(withInterceptors([authInterceptor]))` แล้ว ให้ feature เรียกผ่าน `ApiClient` ใน API repository ดูตัวอย่าง `PoolingApiRepository` และใช้ `corporateResource` สำหรับยกเลิกคำขอเดิมเมื่อเปลี่ยนองค์กร

### AuthService และ guards

Inject `AuthService` จาก `@core/auth/auth.service` เพื่อใช้:

| API                       | ความหมาย                                                        |
| ------------------------- | --------------------------------------------------------------- |
| `user()`                  | อ่านผู้ใช้ปัจจุบัน หรือ `null`                                  |
| `signIn(email, password)` | คืน `Promise<boolean>`; สำเร็จเป็น true ผิดพลาดจะ reject        |
| `signOut()`               | คืน Promise เรียก API logout แล้วล้าง session และกลับหน้า login |

`authGuard` ป้องกันหน้าหลังเข้าสู่ระบบ และ `guestGuard` ใช้กับหน้า login/recovery หลัง login ไป `/dashboard` เสมอโดยไม่ใช้ `returnUrl` ส่วนการรีเฟรชระหว่างที่ session ยังใช้ได้จะกู้ session จาก API ก่อนเปิด route เดิม

Login เรียก API และเก็บ access JWT ใน memory เท่านั้น ไม่เก็บรหัสผ่านหรือ access JWT ใน storage ส่วน refresh token แบบหมุนเวียนเก็บใน sessionStorage ของแท็บเพื่อกู้ session ผ่าน API เมื่อรีเฟรชหน้า และต่ออายุ access ก่อนหมดอายุ 60 วินาที หาก refresh ไม่สำเร็จ, session หมดอายุ หรือ API ตอบ 401 จะออกจากระบบ Logout เรียก API เพื่อ revoke token โดย backend local ตรวจ token กับ Identity ทุกครั้ง ไม่มี frontend mock หรือ fallback เมื่อ API ล่ม

หน้า `/forgot-password` แสดงวิธีติดต่อผู้ดูแล ยังไม่ส่งอีเมลหรือเปลี่ยนรหัสผ่าน

### Header, sidebar และ footer

`AppShell` ประกอบ layout กลางและ `router-outlet` ให้หน้าภายในอยู่แล้ว ส่วน `AuthLayout` ใช้กับหน้าก่อนเข้าสู่ระบบ ไม่ต้อง import layout เหล่านี้ซ้ำในทุก feature

sidebar เปลี่ยนเป็น PrimeNG drawer เมื่อหน้าจอกว้างน้อยกว่า 900px ตารางเลื่อนแนวนอนภายในพื้นที่ของตัวเองได้ เมื่อต้องเพิ่มเมนูให้แก้ข้อมูลใน `portal-navigation.ts` และตรวจว่ามี route ตรงกัน

## ธีม PrimeNG และ Tailwind

`core/theme/aura.preset.ts` รวมเฉพาะ Aura tokens ของ component ที่ใช้จริงและ component ย่อยที่ PrimeNG เรียกใช้ เพื่อลด initial bundle ส่วนสีและค่าที่ปรับเองยังอยู่ใน `portal.preset.ts` เมื่อเพิ่ม PrimeNG component ใหม่ ให้เพิ่ม import จาก `@primeuix/themes/aura/<ชื่อธีม>` และรายการใน `components` ที่ไฟล์นี้ด้วย (เช่น `Table` ใช้ชื่อธีม `datatable`) รวมถึง dependency ภายในที่ต้องใช้ธีม หลีกเลี่ยงการ import Aura ทั้งชุดกลับมา แล้วตรวจ `npm run build:dev` และ `npm run build:prod` ให้อยู่ภายใน budget 500 kB เดิม

| เรื่องที่ต้องการปรับ                             | จุดที่ใช้                     |
| ------------------------------------------------ | ----------------------------- |
| สีที่ใช้ร่วมระหว่าง UI และกราฟ                   | `core/theme/portal-colors.ts` |
| tokens ของ PrimeNG เช่น สีปุ่ม ขอบ และ focus     | `core/theme/portal.preset.ts` |
| layout, spacing, grid, typography และ responsive | Tailwind classes ใน HTML      |
| รูปลักษณ์ส่วนภายใน PrimeNG                       | `pt` API ของ component        |
| imports, token aliases และค่าพื้นฐานทั้งแอป      | `src/styles.css`              |

ใช้ปุ่มและ form controls ของ PrimeNG โดยตรง เช่น `ButtonModule`, `SelectModule`, `InputTextModule` และเพิ่มใน `imports` ของหน้าที่ใช้ หลีกเลี่ยงการเขียน wrapper ซ้ำหากไม่เพิ่มพฤติกรรมที่ใช้ร่วมกัน

สีหลักคือเหลือง `#FACC15`, hover `#EAB308`, เหลืองอ่อน `#FEF9C3`, พื้นหลัง `#FAFAF9`, surface `#FFFFFF`, ข้อความ `#18181B`, ข้อความรอง `#71717A` และเส้นขอบ `#E4E4E7` ใช้โหมดสว่างและข้อความเข้มบนปุ่มเหลือง

ใช้ tokens หรือ `pt` ก่อนเพิ่ม CSS เฉพาะ หลีกเลี่ยง `::ng-deep` และการ override `.p-*` กระจายหลายไฟล์ ปุ่มที่มีเฉพาะ icon ต้องมีชื่อสำหรับ accessibility และ tooltip ตามบริบท

ฟอนต์ Inter Variable, Noto Sans Thai Variable และ IBM Plex Sans Thai เก็บในแพ็กเกจผ่าน Fontsource ไม่เรียก Google Fonts ภายนอก
