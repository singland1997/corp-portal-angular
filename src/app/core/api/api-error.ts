import { HttpErrorResponse } from '@angular/common/http';
import { TranslationKey } from '@core/i18n/translation.models';
import { ApiResponseError } from './api-response.error';
import { TimeoutError } from 'rxjs';

/** Server error codes with a dedicated, user-actionable message. */
const CODE_MESSAGES: Record<string, TranslationKey> = {
  COMMAND_API_UNAVAILABLE: 'commandUnavailable',
  SOURCE_NOT_SYNCED: 'sourceNotSynced',
  NOT_FOUND: 'notFound',
};

export function apiErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const code = (error.error as { error?: { code?: unknown } } | null)?.error?.code;
  return typeof code === 'string' ? code : null;
}

export function apiErrorMessage(error: unknown): TranslationKey {
  if (error instanceof TimeoutError) return 'requestTimeout';
  if (error instanceof ApiResponseError) return 'invalidServiceResponse';
  if (error instanceof HttpErrorResponse) {
    const code = apiErrorCode(error);
    if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
    if (error.status === 504 || error.status === 408) return 'requestTimeout';
    if (error.status === 401) return 'signInError';
    if (error.status === 403) return 'accessDenied';
    if (error.status === 409) return 'dataConflict';
    if (error.status === 429) return 'tooManyRequests';
    if (error.status === 501 || error.status === 503) return 'serviceUnavailable';
  }
  return 'requestFailed';
}
