import {
  arrayOf,
  bool,
  dateText,
  finiteNumber,
  nullable,
  objectOf,
  oneOf,
  optional,
  text,
} from '@core/api/response-validation';
import { PORTAL_STATUSES } from '@shared/models/portal-status';

export const poolsResponse = arrayOf(
  objectOf({
    id: text,
    corporateId: text,
    name: nullable(text),
    corporate: text,
    lot: nullable(text),
    status: oneOf(['active', 'inactive']),
    service: nullable(text),
    quotaMb: nullable(finiteNumber),
    usedMb: nullable(finiteNumber),
    remainingMb: nullable(finiteNumber),
    expiresAt: nullable(dateText),
    memberCount: finiteNumber,
    sourceState: oneOf(['partial', 'complete']),
  }),
);
export const membersResponse = arrayOf(
  objectOf({
    id: text,
    poolId: text,
    mobile: text,
    assignedTo: nullable(text),
    department: nullable(text),
    usedMb: nullable(finiteNumber),
    status: nullable(oneOf(PORTAL_STATUSES)),
  }),
);
export const transactionsResponse = arrayOf(
  objectOf({
    id: text,
    poolId: text,
    type: text,
    occurredAt: nullable(dateText),
    amountMb: nullable(finiteNumber),
    totalAfterMb: nullable(finiteNumber),
    remainingAfterMb: nullable(finiteNumber),
    afterQuantityMb: optional(nullable(finiteNumber)),
    performedBy: nullable(text),
    reason: nullable(text),
  }),
);
export const inventoryResponse = arrayOf(
  objectOf({ id: text, poolId: text, name: nullable(text), status: optional(nullable(text)) }),
);
export const capabilitiesResponse = objectOf({ quotaAdjust: bool });
