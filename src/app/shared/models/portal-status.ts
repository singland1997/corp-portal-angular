export const PORTAL_STATUSES = ['active', 'inactive', 'suspended', 'pending', 'failed', 'terminated'] as const;

export type PortalStatus = (typeof PORTAL_STATUSES)[number];

export function isPortalStatus(value: string): value is PortalStatus {
  return PORTAL_STATUSES.some((status) => status === value);
}
