import { ApiRequest, ApiResponse, KeyValue } from './types';
import { interpolateVariables } from './interpolation';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export async function executeRequest(
  request: ApiRequest,
  variables: Record<string, string>,
  sslVerification: boolean = true
): Promise<ApiResponse> {
  const activeParams = request.params.filter(p => p.enabled && p.key.trim() !== '');
  const url = buildUrl(
    interpolateVariables(request.url, variables),
    activeParams.map(p => ({
      ...p,
      key: interpolateVariables(p.key, variables),
      value: interpolateVariables(p.value, variables),
    }))
  );

  const headers: Record<string, string> = {};
  for (const h of request.headers.filter(h => h.enabled && h.key.trim() !== '')) {
    headers[interpolateVariables(h.key, variables)] = interpolateVariables(h.value, variables);
  }

  const body = serializeBody(request, variables);
  if (body.contentType && !headers['Content-Type']) {
    headers['Content-Type'] = body.contentType;
  }

  const start = performance.now();
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (!sslVerification) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  try {
    const res = await fetch(url, {
      method: request.method,
      headers,
      body: body.data,
    });

    const time = Math.round(performance.now() - start);
    const responseBody = await res.text();
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    return {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      body: responseBody,
      time,
      size: new TextEncoder().encode(responseBody).length,
    };
  } catch (err: unknown) {
    const time = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: `Request failed: ${message}`,
      time,
      size: 0,
    };
  } finally {
    if (!sslVerification) {
      if (prevTls === undefined) { delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; }
      else { process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls; }
    }
  }
}

function buildUrl(base: string, params: KeyValue[]): string {
  try {
    const url = new URL(base);
    for (const p of params) {
      url.searchParams.append(p.key, p.value);
    }
    return url.toString();
  } catch {
    // If URL is invalid (e.g. unresolved variables), append params manually
    const qs = params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    return qs ? `${base}?${qs}` : base;
  }
}

function serializeBody(
  request: ApiRequest,
  variables: Record<string, string>
): { data: string | Buffer | FormData | undefined; contentType?: string } {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return { data: undefined };
  }

  const { body } = request;
  switch (body.type) {
    case 'none':
      return { data: undefined };
    case 'json':
      return { data: interpolateVariables(body.raw || '', variables), contentType: 'application/json' };
    case 'raw':
      return { data: interpolateVariables(body.raw || '', variables), contentType: 'text/plain' };
    case 'xml':
      return { data: interpolateVariables(body.raw || '', variables), contentType: 'application/xml' };
    case 'x-www-form-urlencoded': {
      const params = new URLSearchParams();
      for (const kv of (body.formData || []).filter(f => f.enabled)) {
        params.append(
          interpolateVariables(kv.key, variables),
          interpolateVariables(kv.value, variables)
        );
      }
      return { data: params.toString(), contentType: 'application/x-www-form-urlencoded' };
    }
    case 'form-data': {
      const form = new FormData();
      const items = body.formDataFiles || (body.formData || []).map(kv => ({ ...kv, fieldType: 'text' as const }));
      for (const item of items.filter(f => f.enabled)) {
        const key = interpolateVariables(item.key, variables);
        if (item.fieldType === 'file' && item.filePath) {
          const buf = fs.readFileSync(item.filePath);
          const blob = new Blob([buf]);
          form.append(key, blob, item.fileName || path.basename(item.filePath));
        } else {
          form.append(key, interpolateVariables(item.value, variables));
        }
      }
      return { data: form as unknown as FormData };
    }
    case 'binary': {
      if (body.binaryPath) {
        const buf = fs.readFileSync(body.binaryPath);
        return { data: buf, contentType: 'application/octet-stream' };
      }
      return { data: undefined };
    }
    case 'graphql': {
      const gql = body.graphql || { query: '', variables: '{}' };
      const payload = JSON.stringify({
        query: interpolateVariables(gql.query, variables),
        variables: JSON.parse(interpolateVariables(gql.variables || '{}', variables)),
      });
      return { data: payload, contentType: 'application/json' };
    }
    default:
      return { data: body.raw || undefined };
  }
}
