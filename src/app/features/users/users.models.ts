import { CorporateAccount } from '@core/corporate/corporate-account';

export type UserType = 'platform' | 'corporate';
export type UserRole = 'admin' | 'sales' | 'corporate';
export type UserStatus = 'active' | 'inactive' | 'pending';

export const PLATFORM_ROLES: readonly UserRole[] = ['admin', 'sales'];
export const USER_ROLES: readonly UserRole[] = ['admin', 'sales', 'corporate'];
export const USER_STATUSES: readonly UserStatus[] = ['active', 'inactive', 'pending'];

export interface UserRow {
  id: string;
  name: string;
  email: string;
  userType: UserType;
  role: UserRole;
  status: UserStatus;
  corporateId: string | null;
  corporateName: string | null;
  corporates: readonly CorporateAccount[];
}

export interface CreateUserBody {
  userType: UserType;
  corporateId?: string;
  corporateIds?: string[];
  fullName: string;
  email: string;
  role?: UserRole;
}

export interface UpdateUserBody {
  fullName: string;
  corporateId?: string;
  corporateIds?: string[];
  role?: UserRole;
  status: UserStatus;
}

export interface UserDraft {
  userType: UserType;
  corporateId: string;
  corporateIds: string[];
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface Invite {
  inviteToken: string;
  /** unix seconds */
  inviteExpiresAt: number;
}

export type CreatedUser = UserRow & Invite;

export interface SalesAssignment {
  corporateId: string;
  userId: string;
  name: string;
}
