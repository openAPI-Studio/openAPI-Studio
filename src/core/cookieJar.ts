import { CookieEntry } from './types';

/**
 * Parse a single Set-Cookie header string into a CookieEntry.
 */
export function parseSetCookieHeader(header: string, requestUrl: string): CookieEntry | null {
  const parts = header.split(';').map(s => s.trim());
  const [first, ...attrs] = parts;
  if (!first) return null;

  const eqIdx = first.indexOf('=');
  if (eqIdx < 0) return null;
  const name = first.slice(0, eqIdx).trim();
  const value = first.slice(eqIdx + 1).trim();
  if (!name) return null;

  let url: URL;
  try { url = new URL(requestUrl); } catch { return null; }

  const cookie: CookieEntry = {
    name,
    value,
    domain: url.hostname,
    path: '/',
    expires: null,
    httpOnly: false,
    secure: false,
    sameSite: null,
    createdAt: new Date().toISOString(),
  };

  let maxAgeSet = false;
  for (const attr of attrs) {
    const [aKey, ...aValParts] = attr.split('=');
    const key = aKey.trim().toLowerCase();
    const val = aValParts.join('=').trim();

    switch (key) {
      case 'domain':
        cookie.domain = val.startsWith('.') ? val.slice(1) : val;
        break;
      case 'path':
        cookie.path = val || '/';
        break;
      case 'max-age': {
        const seconds = parseInt(val, 10);
        if (!isNaN(seconds)) {
          cookie.expires = seconds <= 0 ? new Date(0).toISOString() : new Date(Date.now() + seconds * 1000).toISOString();
          maxAgeSet = true;
        }
        break;
      }
      case 'expires':
        if (!maxAgeSet) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) cookie.expires = d.toISOString();
        }
        break;
      case 'httponly':
        cookie.httpOnly = true;
        break;
      case 'secure':
        cookie.secure = true;
        break;
      case 'samesite':
        if (['strict', 'lax', 'none'].includes(val.toLowerCase())) {
          cookie.sameSite = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() as CookieEntry['sameSite'];
        }
        break;
    }
  }

  return cookie;
}

/**
 * Get cookies from the jar that match the given URL.
 */
export function getMatchingCookies(jar: CookieEntry[], url: string): CookieEntry[] {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return []; }

  const now = new Date().toISOString();
  return jar.filter(c => {
    // Skip expired
    if (c.expires && c.expires < now) return false;
    // Domain match: exact or subdomain
    const host = parsed.hostname;
    if (host !== c.domain && !host.endsWith('.' + c.domain)) return false;
    // Path match: prefix
    const reqPath = parsed.pathname || '/';
    if (!reqPath.startsWith(c.path)) return false;
    // Secure flag
    if (c.secure && parsed.protocol !== 'https:') return false;
    return true;
  });
}

/**
 * Merge incoming cookies into existing jar (upsert by domain+path+name).
 */
export function mergeCookies(existing: CookieEntry[], incoming: CookieEntry[]): CookieEntry[] {
  const jar = [...existing];
  for (const c of incoming) {
    const idx = jar.findIndex(e => e.domain === c.domain && e.path === c.path && e.name === c.name);
    if (c.value === '' && c.expires && new Date(c.expires).getTime() === 0) {
      // Delete cookie
      if (idx >= 0) jar.splice(idx, 1);
    } else if (idx >= 0) {
      jar[idx] = c;
    } else {
      jar.push(c);
    }
  }
  // Remove expired
  const now = new Date().toISOString();
  return jar.filter(c => !c.expires || c.expires > now);
}

/**
 * Serialize cookies into a Cookie header value.
 */
export function serializeCookieHeader(cookies: CookieEntry[]): string {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
