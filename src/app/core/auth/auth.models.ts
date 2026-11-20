import { CorporateAccount } from '@core/corporate/corporate-account';

export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly initials: string;
  readonly email: string;
  readonly role: 'admin' | 'corporate' | 'sales';
  readonly corporates: readonly CorporateAccount[];
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
  readonly user: AuthUser;
}

export interface AuthSession extends LoginResponse {
  readonly expiresAt: number;
}
