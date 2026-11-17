import {
  arrayOf,
  bool,
  dateText,
  finiteNumber,
  nullable,
  objectOf,
  oneOf,
  text,
} from '@core/api/response-validation';
import { PORTAL_STATUSES } from '@shared/models/portal-status';
import { numberCountsResponse } from '../../corporate/data-access/corporate-response';

export const dashboardResponse = objectOf({
  updatedAt: dateText,
  periodStart: dateText,
  dailyUsageFrom: dateText,
  numbers: numberCountsResponse,
  totalUsageTb: nullable(finiteNumber),
  pool: objectOf({
    usedTb: nullable(finiteNumber),
    quotaTb: nullable(finiteNumber),
    unknownPools: finiteNumber,
  }),
  dailyUsageGb: arrayOf(nullable(finiteNumber)),
  activity: arrayOf(
    objectOf({
      mobile: nullable(text),
      operation: text,
      status: nullable(oneOf(PORTAL_STATUSES)),
      time: dateText,
    }),
  ),
  activityComplete: bool,
});
