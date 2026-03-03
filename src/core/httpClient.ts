import { ApiRequest, ApiResponse, KeyValue } from './types';
import { interpolateVariables } from './interpolation';

export async function executeRequest(
  request: ApiRequest,
  variables: Record<string, string>
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
  }
}

function buildUrl(base: string, params: KeyValue[]): string {
  const url = new URL(base);
  for (const p of params) {
    url.searchParams.append(p.key, p.value);
  }
  return url.toString();
}

function serializeBody(
  request: ApiRequest,
  variables: Record<string, string>
): { data: string | FormData | undefined; contentType?: string } {
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
