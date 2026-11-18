import { pageResponse } from '@core/api/pagination';
import {
  optional,
  arrayOf,
  dateText,
  finiteNumber,
  nullable,
  objectOf,
  oneOf,
  bool,
  text,
} from '@core/api/response-validation';
import { PORTAL_STATUSES } from '@shared/models/portal-status';
import { COMMAND_OUTCOMES } from '../corporate.models';

export const mobileNumberResponse = objectOf({
  id: text,
  mobile: text,
  owner: nullable(text),
  package: nullable(text),
  status: nullable(oneOf(PORTAL_STATUSES)),
  usageMb: nullable(finiteNumber),
  iccid: nullable(text),
  lot: nullable(text),
  productName: optional(nullable(text)),
  packageName: optional(nullable(text)),
  sourceStatus: optional(nullable(text)),
  simInventoryStatus: optional(nullable(text)),
  numberInventoryStatus: optional(nullable(text)),
  quotas: optional(
    arrayOf(
      objectOf({
        totalMb: nullable(finiteNumber),
        remainingMb: nullable(finiteNumber),
        expiresAt: nullable(dateText),
        capMax: nullable(bool),
      }),
    ),
  ),
});

export const numberCountsResponse = objectOf({
  total: finiteNumber,
  active: finiteNumber,
  inactive: finiteNumber,
  suspended: finiteNumber,
});

export const corporateSnapshotResponse = objectOf({
  numbers: arrayOf(mobileNumberResponse),
  counts: numberCountsResponse,
  updatedAt: dateText,
  capabilities: objectOf({ suspend: bool, resume: bool }),
});

export const commandResponse = objectOf({
  action: oneOf(['suspend', 'resume']),
  results: arrayOf(
    objectOf({
      id: text,
      mobile: text,
      outcome: oneOf(COMMAND_OUTCOMES),
      errorCode: nullable(text),
    }),
  ),
});

export const numberPageResponse = (value: unknown) =>
  pageResponse(mobileNumberResponse)(value) &&
  objectOf({
    counts: numberCountsResponse,
    lots: arrayOf(
      objectOf({
        lot: nullable(text),
        productName: optional(nullable(text)),
        quotaType: optional(nullable(text)),
        counts: numberCountsResponse,
      }),
    ),
    updatedAt: dateText,
    usageThrough: nullable(dateText),
    capabilities: objectOf({ suspend: bool, resume: bool }),
  })(value);
