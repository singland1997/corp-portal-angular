import { LoginResponse } from '../app/core/auth/auth.models';
// Test doubles only. Runtime business fixtures and credentials live on the backend.
export function testSession(admin = false, accessToken = 'test-token'): LoginResponse {
  const organization = (id: string) => ({
    id,
    code: id,
    name: id,
    nameTh: id,
    initials: id,
    contactEmail: 'test@example.test',
    industry: 'Test',
    lotId: 'LOT-' + id,
  });
  return {
    accessToken,
    refreshToken: 'a'.repeat(64),
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: admin ? 'admin' : 'user',
      name: 'Test User',
      shortName: 'Test',
      initials: 'TU',
      email: 'test@example.test',
      role: admin ? 'admin' : 'corporate',
      corporates: admin ? [organization('A'), organization('B')] : [organization('A')],
    },
  };
}
export const testEnvironment = { name: 'local' as const, production: false, apiBaseUrl: '/api' };
