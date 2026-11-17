export const setPasswordEn = {
  title: 'Set your password',
  intro: 'Create a password to activate your Corp Portal account.',
  newPassword: 'New password',
  confirmPassword: 'Confirm password',
  rule: 'At least 12 characters.',
  submit: 'Set password',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  tooShort: 'The password must be at least 12 characters.',
  mismatch: 'The passwords do not match.',
  missingLink: 'This link is incomplete. Open the full link from your administrator.',
  invalidLink:
    'This link is invalid, already used, or expired. Ask your administrator for a new one.',
  tooManyAttempts: 'Too many attempts. Please wait a minute and try again.',
  doneTitle: 'Password set',
  doneText: 'Your account is active. You can now sign in with your email and new password.',
  signIn: 'Go to sign in',
} as const;

export type SetPasswordMessageKey = keyof typeof setPasswordEn;

export const setPasswordTh: Record<SetPasswordMessageKey, string> = {
  title: 'ตั้งรหัสผ่าน',
  intro: 'ตั้งรหัสผ่านเพื่อเปิดใช้งานบัญชี Corp Portal ของคุณ',
  newPassword: 'รหัสผ่านใหม่',
  confirmPassword: 'ยืนยันรหัสผ่าน',
  rule: 'อย่างน้อย 12 ตัวอักษร',
  submit: 'ตั้งรหัสผ่าน',
  showPassword: 'แสดงรหัสผ่าน',
  hidePassword: 'ซ่อนรหัสผ่าน',
  tooShort: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร',
  mismatch: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
  missingLink: 'ลิงก์ไม่ครบ กรุณาเปิดลิงก์เต็มที่ได้รับจากผู้ดูแลระบบ',
  invalidLink: 'ลิงก์นี้ไม่ถูกต้อง ถูกใช้ไปแล้ว หรือหมดอายุ กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ',
  tooManyAttempts: 'ลองหลายครั้งเกินไป กรุณารอ 1 นาทีแล้วลองใหม่',
  doneTitle: 'ตั้งรหัสผ่านเรียบร้อย',
  doneText: 'บัญชีของคุณพร้อมใช้งานแล้ว เข้าสู่ระบบด้วยอีเมลและรหัสผ่านใหม่ได้เลย',
  signIn: 'ไปหน้าเข้าสู่ระบบ',
};
