import { ApiRequest, AuthConfig } from './types';

export function applyAuth(request: ApiRequest, variables: Record<string, string>): {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
} {
  const headers: Record<string, string> = {};
  const queryParams: Record<string, string> = {};
  const auth = request.auth;

  switch (auth.type) {
    case 'none':
      break;
    case 'basic': {
      const { username = '', password = '' } = auth.basic || {};
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
      break;
    }
    case 'bearer':
      headers['Authorization'] = `Bearer ${auth.bearer?.token || ''}`;
      break;
    case 'api-key': {
      const { key = '', value = '', addTo = 'header' } = auth.apiKey || {};
      if (addTo === 'header') {
        headers[key] = value;
      } else {
        queryParams[key] = value;
      }
      break;
    }
    case 'oauth2':
      if (auth.oauth2?.accessToken) {
        headers['Authorization'] = `Bearer ${auth.oauth2.accessToken}`;
      }
      break;
    case 'aws-sigv4':
      // AWS SigV4 signing is complex — placeholder for full implementation
      // Would need to compute canonical request, string to sign, and signing key
      break;
  }

  return { headers, queryParams };
}
