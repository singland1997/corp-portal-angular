import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api/api-client';
import { CreatedUser, CreateUserBody, Invite, UpdateUserBody, UserRow } from '../users.models';

/** เรียก API ของ User management (Identity service) */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly api = inject(ApiClient);

  list() {
    return this.api.get<UserRow[]>('/users');
  }

  create(body: CreateUserBody) {
    return this.api.post<CreatedUser>('/users', body);
  }

  /** ออกลิงก์ตั้งรหัสผ่านใหม่ (ลิงก์เก่าใช้ไม่ได้ทันที) */
  invite(id: string) {
    return this.api.post<Invite>(`/users/${encodeURIComponent(id)}/invite`, {});
  }

  update(id: string, body: UpdateUserBody) {
    return this.api.patch<UserRow>(`/users/${encodeURIComponent(id)}`, body);
  }
}
