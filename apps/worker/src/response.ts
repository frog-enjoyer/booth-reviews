import type { ApiResult } from '@booth-addon/shared';

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string): ApiResult<never> {
  return { ok: false, error: { code, message } };
}
