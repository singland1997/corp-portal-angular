import {
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
