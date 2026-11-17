import { ApiResponseError } from './api-response.error';

export type ResponseCheck = (value: unknown) => boolean;

export const text: ResponseCheck = (value) => typeof value === 'string';
export const finiteNumber: ResponseCheck = (value) =>
  typeof value === 'number' && Number.isFinite(value);
export const dateText: ResponseCheck = (value) =>
  typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));

export function oneOf(values: readonly string[]): ResponseCheck {
  return (value) => typeof value === 'string' && values.includes(value);
}

export function nullable(check: ResponseCheck): ResponseCheck {
  return (value) => value === null || check(value);
}

/** Additive field that older servers/fixtures may omit. */
export function optional(check: ResponseCheck): ResponseCheck {
  return (value) => value === undefined || check(value);
}

export const bool: ResponseCheck = (value) => typeof value === 'boolean';

export function arrayOf(check: ResponseCheck): ResponseCheck {
  return (value) => Array.isArray(value) && value.every(check);
}

/** Validate fields consumed by the UI; allow additive server fields. */
export function objectOf(fields: Record<string, ResponseCheck>): ResponseCheck {
  return (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    return Object.entries(fields).every(([key, check]) => check(row[key]));
  };
}

export function parseResponse<T>(value: unknown, check: ResponseCheck, contract: string): T {
  if (!check(value)) throw new ApiResponseError(`Invalid ${contract} response`);
  return value as T;
}
