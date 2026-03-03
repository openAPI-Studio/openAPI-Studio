import { HttpMethod, KeyValue, RequestBody, AuthConfig } from './types';

interface ParsedCurl {
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
}

export function parseCurl(input: string): ParsedCurl | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('curl ') && !trimmed.startsWith('curl\n')) return null;

  // Normalize: join line continuations, collapse whitespace
  const normalized = trimmed
    .replace(/\\\s*\n/g, ' ')
    .replace(/\s+/g, ' ');

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: KeyValue[] = [];
  let rawBody = '';
  let auth: AuthConfig = { type: 'none' };

  const tokens = tokenize(normalized);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t === 'curl') continue;

    // Method
    if (t === '-X' || t === '--request') {
      const val = tokens[++i]?.toUpperCase();
      if (val) method = val as HttpMethod;
      continue;
    }

    // Headers
    if (t === '-H' || t === '--header') {
      const val = tokens[++i];
      if (val) {
        const sep = val.indexOf(':');
        if (sep > 0) {
          headers.push({ key: val.slice(0, sep).trim(), value: val.slice(sep + 1).trim(), enabled: true });
        }
      }
      continue;
    }

    // Data / body
    if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-urlencode') {
      rawBody = tokens[++i] || '';
      if (method === 'GET') method = 'POST';
      continue;
    }

    // Basic auth
    if (t === '-u' || t === '--user') {
      const val = tokens[++i] || '';
      const [username, ...rest] = val.split(':');
      auth = { type: 'basic', basic: { username, password: rest.join(':') } };
      continue;
    }

    // Flags to skip
    if (t === '-k' || t === '--insecure' || t === '-v' || t === '--verbose' ||
        t === '-s' || t === '--silent' || t === '-S' || t === '--show-error' ||
        t === '-L' || t === '--location' || t === '--compressed') {
      continue;
    }

    // Skip flags with values
    if (t === '-o' || t === '--output' || t === '--connect-timeout' || t === '--max-time') {
      i++;
      continue;
    }

    // URL (anything that looks like a URL or doesn't start with -)
    if (!t.startsWith('-') && !url) {
      url = t.replace(/^['"]|['"]$/g, '');
      continue;
    }
  }

  if (!url) return null;

  // Determine body type from Content-Type header
  const contentType = headers.find(h => h.key.toLowerCase() === 'content-type')?.value || '';
  let body: RequestBody = { type: 'none' };

  if (rawBody) {
    if (contentType.includes('application/json') || isJson(rawBody)) {
      body = { type: 'json', raw: rawBody };
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      body = { type: 'xml', raw: rawBody };
    } else if (contentType.includes('x-www-form-urlencoded')) {
      const pairs = rawBody.split('&').map(p => {
        const [key, ...rest] = p.split('=');
        return { key: decodeURIComponent(key), value: decodeURIComponent(rest.join('=')), enabled: true };
      });
      body = { type: 'x-www-form-urlencoded', formData: pairs };
    } else {
      body = { type: 'raw', raw: rawBody };
    }
  }

  // Extract bearer token from Authorization header
  const authHeader = headers.find(h => h.key.toLowerCase() === 'authorization');
  if (authHeader && auth.type === 'none') {
    const val = authHeader.value;
    if (val.toLowerCase().startsWith('bearer ')) {
      auth = { type: 'bearer', bearer: { token: val.slice(7).trim() } };
    } else if (val.toLowerCase().startsWith('basic ')) {
      try {
        const decoded = atob(val.slice(6).trim());
        const [username, ...rest] = decoded.split(':');
        auth = { type: 'basic', basic: { username, password: rest.join(':') } };
      } catch { /* keep as-is */ }
    }
  }

  return { method, url, headers, body, auth };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    while (i < input.length && input[i] === ' ') i++;
    if (i >= input.length) break;

    // Quoted string
    if (input[i] === "'" || input[i] === '"') {
      const quote = input[i];
      i++;
      let token = '';
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          token += input[i];
        } else {
          token += input[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push(token);
      continue;
    }

    // Unquoted token
    let token = '';
    while (i < input.length && input[i] !== ' ') {
      token += input[i];
      i++;
    }
    tokens.push(token);
  }

  return tokens;
}

function isJson(str: string): boolean {
  try { JSON.parse(str); return true; } catch { return false; }
}
