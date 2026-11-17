import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api/api-client';
import { AuthUser, LoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);
  login(email: string, password: string) {
    return this.api.post<LoginResponse>('/auth/sessions', { email: email.trim(), password });
  }
  me() {
    return this.api.get<AuthUser>('/auth/me');
  }
  logout() {
    return this.api.delete<void>('/auth/sessions/current');
  }
  refresh(refreshToken: string) {
    return this.api.post<LoginResponse>('/auth/sessions/refresh', { refreshToken });
  }
  /** ผู้ใช้ใหม่ตั้งรหัสผ่านจากลิงก์ที่ admin ส่งให้ (ไม่ต้อง login) */
  setupPassword(token: string, password: string) {
    return this.api.post<void>('/auth/password/setup', { token, password });
  }
}
