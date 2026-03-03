import { HttpMethod, KeyValue, RequestBody, AuthConfig } from './messages';

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

  const normalized = trimmed.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ');

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: KeyValue[] = [];
  let rawBody = '';
  let auth: AuthConfig = { type: 'none' };

  const tokens = tokenize(normalized);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'curl') continue;

    if (t === '-X' || t === '--request') { const v = tokens[++i]?.toUpperCase(); if (v) method = v as HttpMethod; continue; }
    if (t === '-H' || t === '--header') {
      const v = tokens[++i];
      if (v) { const s = v.indexOf(':'); if (s > 0) headers.push({ key: v.slice(0, s).trim(), value: v.slice(s + 1).trim(), enabled: true }); }
      continue;
    }
    if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-urlencode') {
      rawBody = tokens[++i] || ''; if (method === 'GET') method = 'POST'; continue;
    }
    if (t === '-u' || t === '--user') {
      const v = tokens[++i] || ''; const [u, ...r] = v.split(':');
      auth = { type: 'basic', basic: { username: u, password: r.join(':') } }; continue;
    }
    if (t === '-k' || t === '--insecure' || t === '-v' || t === '--verbose' || t === '-s' || t === '--silent' ||
        t === '-S' || t === '--show-error' || t === '-L' || t === '--location' || t === '--compressed') continue;
    if (t === '-o' || t === '--output' || t === '--connect-timeout' || t === '--max-time') { i++; continue; }
    if (!t.startsWith('-') && !url) { url = t.replace(/^['"]|['"]$/g, ''); continue; }
  }

  if (!url) return null;

  const ct = headers.find(h => h.key.toLowerCase() === 'content-type')?.value || '';
  let body: RequestBody = { type: 'none' };
  if (rawBody) {
    if (ct.includes('application/json') || isJson(rawBody)) body = { type: 'json', raw: rawBody };
    else if (ct.includes('xml')) body = { type: 'xml', raw: rawBody };
    else if (ct.includes('x-www-form-urlencoded')) {
      body = { type: 'x-www-form-urlencoded', formData: rawBody.split('&').map(p => { const [k, ...r] = p.split('='); return { key: decodeURIComponent(k), value: decodeURIComponent(r.join('=')), enabled: true }; }) };
    } else body = { type: 'raw', raw: rawBody };
  }

  const ah = headers.find(h => h.key.toLowerCase() === 'authorization');
  if (ah && auth.type === 'none') {
    if (ah.value.toLowerCase().startsWith('bearer ')) auth = { type: 'bearer', bearer: { token: ah.value.slice(7).trim() } };
    else if (ah.value.toLowerCase().startsWith('basic ')) {
      try { const d = atob(ah.value.slice(6).trim()); const [u, ...r] = d.split(':'); auth = { type: 'basic', basic: { username: u, password: r.join(':') } }; } catch {}
    }
  }

  return { method, url, headers, body, auth };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && input[i] === ' ') i++;
    if (i >= input.length) break;
    if (input[i] === "'" || input[i] === '"') {
      const q = input[i]; i++; let t = '';
      while (i < input.length && input[i] !== q) { if (input[i] === '\\' && i + 1 < input.length) { i++; t += input[i]; } else t += input[i]; i++; }
      i++; tokens.push(t); continue;
    }
    let t = '';
    while (i < input.length && input[i] !== ' ') { t += input[i]; i++; }
    tokens.push(t);
  }
  return tokens;
}

function isJson(s: string): boolean { try { JSON.parse(s); return true; } catch { return false; } }
