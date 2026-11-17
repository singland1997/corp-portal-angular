import { Tag } from 'primeng/tag';

import { PortalStatus } from '@shared/models/portal-status';

interface StatusAppearance {
  severity: Tag['severity'];
  icon: string;
}

export const STATUS_APPEARANCE: Record<PortalStatus, StatusAppearance> = {
  active: { severity: 'success', icon: 'pi pi-check-circle' },
  inactive: { severity: 'secondary', icon: 'pi pi-minus-circle' },
  suspended: { severity: 'warn', icon: 'pi pi-pause-circle' },
  pending: { severity: 'info', icon: 'pi pi-clock' },
  failed: { severity: 'danger', icon: 'pi pi-times-circle' },
  terminated: { severity: 'secondary', icon: 'pi pi-ban' },
};
