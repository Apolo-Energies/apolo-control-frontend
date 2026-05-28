import { HttpParams } from '@angular/common/http';

export type ParamSource = Record<string, unknown> | object;

export function buildParams(source: ParamSource | undefined | null): HttpParams {
  let params = new HttpParams();
  if (!source) {
    return params;
  }
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          params = params.append(key, String(item));
        }
      }
      continue;
    }
    params = params.set(key, String(value));
  }
  return params;
}
