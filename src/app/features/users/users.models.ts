import { CorporateAccount } from '@core/corporate/corporate-account';

/** Admin sees all allowed organizations; Sales sees assigned organizations only. */
export type UserType = 'platform' | 'corporate';
/** admin = System admin, sales = ฝ่ายขาย (platform), corporate = Corp admin */
export type UserRole = 'admin' | 'sales' | 'corporate';
/** pending = สร้างแล้วแต่ยังไม่ได้ตั้งรหัสผ่าน */
export type UserStatus = 'active' | 'inactive' | 'pending';

export const PLATFORM_ROLES: readonly UserRole[] = ['admin', 'sales'];
export const USER_ROLES: readonly UserRole[] = ['admin', 'sales', 'corporate'];
export const USER_STATUSES: readonly UserStatus[] = ['active', 'inactive', 'pending'];

/** 1 แถวจาก GET /api/v1/users */
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

/** Body ของ POST /api/v1/users */
export interface CreateUserBody {
  userType: UserType;
  corporateId?: string;
  corporateIds?: string[];
  fullName: string;
  email: string;
  role?: UserRole;
}

/** Body ของ PATCH /api/v1/users/{id} */
export interface UpdateUserBody {
  fullName: string;
  corporateId?: string;
  corporateIds?: string[];
  role?: UserRole;
  status: UserStatus;
}

/** ค่าในฟอร์ม (ใช้ทั้งสร้างและแก้ไข) */
export interface UserDraft {
  userType: UserType;
  corporateId: string;
  corporateIds: string[];
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

/** ลิงก์ตั้งรหัสผ่าน (ได้ตอนสร้างผู้ใช้ หรือกดออกลิงก์ใหม่) */
export interface Invite {
  inviteToken: string;
  /** unix seconds */
  inviteExpiresAt: number;
}

/** ผลของ POST /api/v1/users */
export type CreatedUser = UserRow & Invite;

export interface SalesAssignment {
  corporateId: string;
  userId: string;
  name: string;
}
