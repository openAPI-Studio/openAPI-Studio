import { ApiRequest, ApiResponse } from '../types/messages';

export type CodeLanguage =
  | 'curl' | 'javascript-fetch' | 'javascript-axios' | 'python-requests'
  | 'python-http' | 'go' | 'java' | 'csharp' | 'ruby' | 'php' | 'rust' | 'swift';

export const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'curl', label: 'cURL' },
  { value: 'javascript-fetch', label: 'JavaScript - Fetch' },
  { value: 'javascript-axios', label: 'JavaScript - Axios' },
  { value: 'python-requests', label: 'Python - Requests' },
  { value: 'python-http', label: 'Python - http.client' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java - HttpClient' },
  { value: 'csharp', label: 'C# - HttpClient' },
  { value: 'ruby', label: 'Ruby - Net::HTTP' },
  { value: 'php', label: 'PHP - cURL' },
  { value: 'rust', label: 'Rust - reqwest' },
  { value: 'swift', label: 'Swift - URLSession' },
];

// ---------------------------------------------------------------------------
// String escaper utilities
// ---------------------------------------------------------------------------

/** Escape for double-quoted string contexts (Go, Java, C#, Rust, Swift). */
export function escapeDouble(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/** Escape for single-quoted string contexts (Ruby, PHP, cURL, Python). */
export function escapeSingle(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Escape for shell single-quote context (cURL URLs and body). Replace ' with '\'' */
export function escapeShell(value: string): string {
  return value.replace(/'/g, "'\\''");
}

// ---------------------------------------------------------------------------
// Safe JSON parsing
// ---------------------------------------------------------------------------

/** Wrap JSON.parse in try-catch, return {} on SyntaxError. */
export function safeParseJsonOrEmpty(str: string): object {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Auth injection
// ---------------------------------------------------------------------------

interface AuthInjection {
  headers: { key: string; value: string }[];
  queryParams: { key: string; value: string }[];
  comments: string[];
  awsSigV4?: { region: string; service: string };
}

/**
 * Translate AuthConfig into injectable headers, query params, and comments.
 * Deduplicates against user-defined headers (case-insensitive).
 */
export function injectAuth(
  req: ApiRequest,
  existingHeaders: { key: string; value: string }[],
): AuthInjection {
  const result: AuthInjection = { headers: [], queryParams: [], comments: [] };
  const auth = req.auth;
  if (!auth || auth.type === 'none') return result;

  const hasHeader = (name: string) =>
    existingHeaders.some(h => h.key.toLowerCase() === name.toLowerCase());

  switch (auth.type) {
    case 'basic': {
      if (!hasHeader('Authorization')) {
        const u = auth.basic?.username ?? '';
        const p = auth.basic?.password ?? '';
        const encoded = btoa(`${u}:${p}`);
        result.headers.push({ key: 'Authorization', value: `Basic ${encoded}` });
      }
      break;
    }
    case 'bearer': {
      const token = auth.bearer?.token ?? '';
      if (token && !hasHeader('Authorization')) {
        result.headers.push({ key: 'Authorization', value: `Bearer ${token}` });
      }
      break;
    }
    case 'api-key': {
      const apiKey = auth.apiKey;
      if (apiKey) {
        if (apiKey.addTo === 'header') {
          if (!hasHeader(apiKey.key)) {
            result.headers.push({ key: apiKey.key, value: apiKey.value });
          }
        } else {
          result.queryParams.push({ key: apiKey.key, value: apiKey.value });
        }
      }
      break;
    }
    case 'oauth2': {
      const token = auth.oauth2?.accessToken ?? '';
      if (token) {
        if (!hasHeader('Authorization')) {
          result.headers.push({ key: 'Authorization', value: `Bearer ${token}` });
        }
      } else {
        result.comments.push('OAuth2: Access token must be obtained first (use the token URL to exchange credentials)');
      }
      break;
    }
    case 'aws-sigv4': {
      const sigv4 = auth.awsSigV4;
      if (sigv4) {
        result.awsSigV4 = { region: sigv4.region, service: sigv4.service };
        result.comments.push(
          `AWS SigV4: Request must be signed for region="${sigv4.region}", service="${sigv4.service}"`,
        );
      }
      break;
    }
  }

  return result;
}


// ---------------------------------------------------------------------------
// Interpolation & helpers
// ---------------------------------------------------------------------------

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function buildUrl(req: ApiRequest, vars: Record<string, string>): string {
  return interpolate(req.url, vars);
}

function headers(req: ApiRequest, vars: Record<string, string>): { key: string; value: string }[] {
  return req.headers.filter(h => h.enabled && h.key).map(h => ({ key: interpolate(h.key, vars), value: interpolate(h.value, vars) }));
}

function bodyStr(req: ApiRequest, vars: Record<string, string>): string | null {
  const b = req.body;
  if (b.type === 'none') return null;
  if (b.type === 'json' || b.type === 'raw' || b.type === 'xml') return interpolate(b.raw || '', vars);
  if (b.type === 'x-www-form-urlencoded') {
    const sp = new URLSearchParams();
    (b.formData || []).filter(f => f.enabled).forEach(f => sp.append(interpolate(f.key, vars), interpolate(f.value, vars)));
    return sp.toString();
  }
  if (b.type === 'graphql') {
    return JSON.stringify({ query: interpolate(b.graphql?.query || '', vars), variables: safeParseJsonOrEmpty(b.graphql?.variables || '{}') });
  }
  return null;
}

function isFormData(req: ApiRequest): boolean {
  return req.body.type === 'form-data';
}

function isBinary(req: ApiRequest): boolean {
  return req.body.type === 'binary';
}

function sampleComment(response: ApiResponse | null, commentPrefix: string): string {
  if (!response || response.status < 200 || response.status >= 300) return '';
  let body = response.body;
  try { body = JSON.stringify(JSON.parse(body), null, 2); } catch {}
  const lines = [
    '', `${commentPrefix} Sample Response (${response.status} ${response.statusText}):`,
    ...body.split('\n').map(l => `${commentPrefix} ${l}`),
  ];
  return lines.join('\n');
}

export function generateCode(req: ApiRequest, lang: CodeLanguage, response: ApiResponse | null, envVars: Record<string, string> = {}): string {
  let url = buildUrl(req, envVars);
  const hdrs = headers(req, envVars);
  const body = bodyStr(req, envVars);

  // Auth injection
  const authInfo = injectAuth(req, hdrs);
  // Merge injected headers
  hdrs.push(...authInfo.headers);
  // Append injected query params to URL
  for (const qp of authInfo.queryParams) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}${encodeURIComponent(qp.key)}=${encodeURIComponent(qp.value)}`;
  }

  switch (lang) {
    case 'curl': return genCurl(req, url, hdrs, body, response, authInfo);
    case 'javascript-fetch': return genJsFetch(req, url, hdrs, body, response, authInfo);
    case 'javascript-axios': return genJsAxios(req, url, hdrs, body, response, authInfo);
    case 'python-requests': return genPythonRequests(req, url, hdrs, body, response, authInfo);
    case 'python-http': return genPythonHttp(req, url, hdrs, body, response, authInfo);
    case 'go': return genGo(req, url, hdrs, body, response, authInfo);
    case 'java': return genJava(req, url, hdrs, body, response, authInfo);
    case 'csharp': return genCsharp(req, url, hdrs, body, response, authInfo);
    case 'ruby': return genRuby(req, url, hdrs, body, response, authInfo);
    case 'php': return genPhp(req, url, hdrs, body, response, authInfo);
    case 'rust': return genRust(req, url, hdrs, body, response, authInfo);
    case 'swift': return genSwift(req, url, hdrs, body, response, authInfo);
    default: return '// Unsupported language';
  }
}

function formDataItems(req: ApiRequest): { key: string; value: string; isFile: boolean }[] {
  const files = (req.body.formDataFiles || []).filter(f => f.enabled && f.key).map(f => ({
    key: f.key, value: f.fieldType === 'file' ? (f.fileName || f.value) : f.value, isFile: f.fieldType === 'file',
  }));
  if (files.length) return files;
  return (req.body.formData || []).filter(f => f.enabled && f.key).map(f => ({
    key: f.key, value: f.value, isFile: false,
  }));
}

type H = { key: string; value: string }[];

/** Generate auth comment block (AWS SigV4 + general auth comments) for a given comment prefix. */
function authCommentBlock(authInfo: AuthInjection, commentPrefix: string, sdkRef?: string): string {
  const lines: string[] = [];
  if (authInfo.awsSigV4) {
    const { region, service } = authInfo.awsSigV4;
    lines.push(`${commentPrefix} AWS SigV4: This request must be signed for region="${region}", service="${service}"`);
    if (sdkRef) {
      lines.push(`${commentPrefix} See: ${sdkRef}`);
    }
  }
  for (const c of authInfo.comments) {
    if (!c.startsWith('AWS SigV4:')) {
      lines.push(`${commentPrefix} ${c}`);
    }
  }
  if (lines.length) lines.push('');
  return lines.length ? lines.join('\n') : '';
}

function genCurl(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  // Idiomatic basic auth: use -u flag instead of Authorization header
  const useBasicFlag = req.auth.type === 'basic';
  const filteredHdrs = useBasicFlag
    ? hdrs.filter(h => h.key.toLowerCase() !== 'authorization')
    : hdrs;

  const parts = [`curl -X ${req.method} '${escapeShell(url)}'`];
  if (useBasicFlag) {
    const u = req.auth.basic?.username ?? '';
    const p = req.auth.basic?.password ?? '';
    parts.push(`  -u '${escapeShell(u)}:${escapeShell(p)}'`);
  }
  filteredHdrs.forEach(h => parts.push(`  -H '${escapeShell(h.key)}: ${escapeShell(h.value)}'`));
  if (isFormData(req)) {
    formDataItems(req).forEach(f => {
      parts.push(f.isFile ? `  -F '${escapeShell(f.key)}=@${escapeShell(f.value || '/path/to/file')}'` : `  -F '${escapeShell(f.key)}=${escapeShell(f.value)}'`);
    });
  } else if (isBinary(req)) {
    parts.push(`  --data-binary '@${escapeShell(req.body.binaryName || '/path/to/file')}'`);
  } else if (body) {
    parts.push(`  -d '${escapeShell(body)}'`);
  }
  return authCommentBlock(authInfo, '#') + parts.join(' \\\n') + sampleComment(res, '#');
}

function genJsFetch(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const prefix = authCommentBlock(authInfo, '//', '@aws-sdk/client-* or aws4');
  const opts: string[] = [`  method: '${req.method}'`];
  if (isFormData(req)) {
    const fdLines = ['const formData = new FormData();'];
    formDataItems(req).forEach(f => {
      fdLines.push(f.isFile ? `formData.append('${escapeSingle(f.key)}', fileInput.files[0]); // file field` : `formData.append('${escapeSingle(f.key)}', '${escapeSingle(f.value)}');`);
    });
    if (hdrs.length) opts.push(`  headers: {\n${hdrs.map(h => `    '${escapeSingle(h.key)}': '${escapeSingle(h.value)}'`).join(',\n')}\n  }`);
    opts.push('  body: formData');
    return `${prefix}${fdLines.join('\n')}\n\nconst response = await fetch('${escapeSingle(url)}', {\n${opts.join(',\n')}\n});\n\nconst data = await response.json();\nconsole.log(data);${sampleComment(res, '//')}`;
  }
  if (isBinary(req)) {
    if (hdrs.length) opts.push(`  headers: {\n${hdrs.map(h => `    '${escapeSingle(h.key)}': '${escapeSingle(h.value)}'`).join(',\n')}\n  }`);
    opts.push('  body: fileBuffer // File or Blob');
    return `${prefix}const response = await fetch('${escapeSingle(url)}', {\n${opts.join(',\n')}\n});\n\nconst data = await response.json();\nconsole.log(data);${sampleComment(res, '//')}`;
  }
  if (hdrs.length) {
    opts.push(`  headers: {\n${hdrs.map(h => `    '${escapeSingle(h.key)}': '${escapeSingle(h.value)}'`).join(',\n')}\n  }`);
  }
  if (body) opts.push(`  body: ${JSON.stringify(body)}`);
  return `${prefix}const response = await fetch('${escapeSingle(url)}', {\n${opts.join(',\n')}\n});\n\nconst data = await response.json();\nconsole.log(data);${sampleComment(res, '//')}`;
}

function genJsAxios(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  // Idiomatic basic auth: use auth config instead of Authorization header
  const useBasicAuth = req.auth.type === 'basic';
  const filteredHdrs = useBasicAuth
    ? hdrs.filter(h => h.key.toLowerCase() !== 'authorization')
    : hdrs;

  const m = req.method.toLowerCase();
  const bodylessMethods = ['GET', 'HEAD', 'DELETE', 'OPTIONS'];
  const isBodyless = bodylessMethods.includes(req.method);
  const hdrObj = filteredHdrs.length ? `\n  headers: {\n${filteredHdrs.map(h => `    '${escapeSingle(h.key)}': '${escapeSingle(h.value)}'`).join(',\n')}\n  }` : '';
  let authStr = '';
  if (useBasicAuth) {
    const u = req.auth.basic?.username ?? '';
    const p = req.auth.basic?.password ?? '';
    authStr = `\n  auth: {\n    username: '${escapeSingle(u)}',\n    password: '${escapeSingle(p)}'\n  }`;
  }

  if (isFormData(req)) {
    const fdLines = ['const formData = new FormData();'];
    formDataItems(req).forEach(f => {
      fdLines.push(f.isFile ? `formData.append('${escapeSingle(f.key)}', fs.createReadStream('${escapeSingle(f.value || '/path/to/file')}')); // file field` : `formData.append('${escapeSingle(f.key)}', '${escapeSingle(f.value)}');`);
    });
    const configParts = [hdrObj, '\n  data: formData', authStr].filter(Boolean);
    const configBody = configParts.join(',');
    return `${authCommentBlock(authInfo, '//', '@aws-sdk/client-* or aws4')}${fdLines.join('\n')}\n\nconst { data } = await axios.${m}('${escapeSingle(url)}', {${configBody}\n});\n\nconsole.log(data);${sampleComment(res, '//')}`;
  }

  if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    const configParts = [hdrObj, `\n  data: fs.readFileSync('${escapeSingle(filePath)}')`, authStr].filter(Boolean);
    const configBody = configParts.join(',');
    return `${authCommentBlock(authInfo, '//', '@aws-sdk/client-* or aws4')}const { data } = await axios.${m}('${escapeSingle(url)}', {${configBody}\n});\n\nconsole.log(data);${sampleComment(res, '//')}`;
  }

  const dataStr = body && !isBodyless ? `\n  data: ${JSON.stringify(body)}` : '';
  const configParts = [hdrObj, dataStr, authStr].filter(Boolean);
  const configBody = configParts.join(',');
  return `${authCommentBlock(authInfo, '//', '@aws-sdk/client-* or aws4')}const { data } = await axios.${m}('${escapeSingle(url)}', {${configBody}\n});\n\nconsole.log(data);${sampleComment(res, '//')}`;
}

function genPythonRequests(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  // Idiomatic basic auth: use auth= parameter instead of Authorization header
  const useBasicAuth = req.auth.type === 'basic';
  const filteredHdrs = useBasicAuth
    ? hdrs.filter(h => h.key.toLowerCase() !== 'authorization')
    : hdrs;

  const needsJsonImport = req.body.type === 'json' && body;
  const imports = needsJsonImport ? 'import json\nimport requests' : 'import requests';
  const lines = [imports, ''];
  if (filteredHdrs.length) lines.push(`headers = {\n${filteredHdrs.map(h => `    '${escapeSingle(h.key)}': '${escapeSingle(h.value)}'`).join(',\n')}\n}`);
  const args = [`'${escapeSingle(url)}'`];
  if (filteredHdrs.length) args.push('headers=headers');
  if (useBasicAuth) {
    const u = req.auth.basic?.username ?? '';
    const p = req.auth.basic?.password ?? '';
    args.push(`auth=('${escapeSingle(u)}', '${escapeSingle(p)}')`);
  }
  if (isFormData(req)) {
    const items = formDataItems(req);
    const fileItems = items.filter(f => f.isFile);
    const dataItems = items.filter(f => !f.isFile);
    if (dataItems.length) args.push(`data={${dataItems.map(f => `'${escapeSingle(f.key)}': '${escapeSingle(f.value)}'`).join(', ')}}`);
    if (fileItems.length) {
      lines.push(`files = {${fileItems.map(f => `'${escapeSingle(f.key)}': open('${escapeSingle(f.value || '/path/to/file')}', 'rb')`).join(', ')}}`);
      args.push('files=files');
    }
  } else if (isBinary(req)) {
    lines.push(`data = open('${escapeSingle(req.body.binaryName || '/path/to/file')}', 'rb').read()`);
    args.push('data=data');
  } else if (body) {
    args.push(req.body.type === 'json' ? `json=json.loads('${escapeSingle(body)}')` : `data='${escapeSingle(body)}'`);
  }
  lines.push(`response = requests.${req.method.toLowerCase()}(${args.join(', ')})`);
  lines.push('print(response.json())');
  return authCommentBlock(authInfo, '#', 'boto3') + lines.join('\n') + sampleComment(res, '#');
}

function genPythonHttp(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return '# Invalid URL'; }
  const lines = [
    'import http.client', 'import json', '',
    `conn = http.client.HTTP${parsed.protocol === 'https:' ? 'S' : ''}Connection('${escapeSingle(parsed.host)}')`,
  ];
  if (hdrs.length) lines.push(`headers = {\n${hdrs.map(h => `    '${escapeSingle(h.key)}': '${escapeSingle(h.value)}'`).join(',\n')}\n}`);
  const path = parsed.pathname + parsed.search;

  if (isFormData(req)) {
    // Note: multipart form-data with http.client is complex; consider using the requests library
    lines.push('# Note: multipart form-data is complex with http.client; consider using the requests library');
    lines.push("import urllib.parse");
    const items = formDataItems(req);
    const fileItems = items.filter(f => f.isFile);
    if (fileItems.length) {
      lines.push(`# File uploads require manual multipart encoding or a library like 'requests'`);
    }
    const textItems = items.filter(f => !f.isFile);
    if (textItems.length) {
      lines.push(`body = urllib.parse.urlencode({${textItems.map(f => `'${escapeSingle(f.key)}': '${escapeSingle(f.value)}'`).join(', ')}})`);
    }
    lines.push(`conn.request('${req.method}', '${escapeSingle(path)}'${textItems.length ? ", body=body" : ''}${hdrs.length ? ', headers=headers' : ''})`);
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`body = open('${escapeSingle(filePath)}', 'rb').read()`);
    lines.push(`conn.request('${req.method}', '${escapeSingle(path)}', body=body${hdrs.length ? ', headers=headers' : ''})`);
  } else {
    lines.push(`conn.request('${req.method}', '${escapeSingle(path)}'${body ? `, body='${escapeSingle(body)}'` : ''}${hdrs.length ? ', headers=headers' : ''})`);
  }

  lines.push('res = conn.getresponse()', 'data = res.read()', 'print(data.decode("utf-8"))');
  return authCommentBlock(authInfo, '#', 'boto3') + lines.join('\n') + sampleComment(res, '#');
}

function genGo(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = ['package main', '', 'import (', '  "fmt"', '  "io"', '  "net/http"'];
  if (isFormData(req)) {
    lines.push('  "bytes"', '  "mime/multipart"', '  "os"');
  } else if (isBinary(req)) {
    lines.push('  "bytes"', '  "os"');
  } else if (body) {
    lines.push('  "strings"');
  }
  lines.push(')', '', 'func main() {');

  if (isFormData(req)) {
    lines.push('  body := &bytes.Buffer{}');
    lines.push('  writer := multipart.NewWriter(body)');
    formDataItems(req).forEach(f => {
      if (f.isFile) {
        const filePath = f.value || '/path/to/file';
        lines.push(`  file, _ := os.Open("${escapeDouble(filePath)}")`);
        lines.push(`  part, _ := writer.CreateFormFile("${escapeDouble(f.key)}", "${escapeDouble(filePath)}")`);
        lines.push('  io.Copy(part, file)');
        lines.push('  file.Close()');
      } else {
        lines.push(`  writer.WriteField("${escapeDouble(f.key)}", "${escapeDouble(f.value)}")`);
      }
    });
    lines.push('  writer.Close()');
    lines.push(`  req, _ := http.NewRequest("${escapeDouble(req.method)}", "${escapeDouble(url)}", body)`);
    lines.push('  req.Header.Set("Content-Type", writer.FormDataContentType())');
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`  fileData, _ := os.ReadFile("${escapeDouble(filePath)}")`);
    lines.push(`  req, _ := http.NewRequest("${escapeDouble(req.method)}", "${escapeDouble(url)}", bytes.NewReader(fileData))`);
  } else {
    if (body) lines.push(`  body := strings.NewReader(\`${body}\`)`);
    lines.push(`  req, _ := http.NewRequest("${escapeDouble(req.method)}", "${escapeDouble(url)}", ${body ? 'body' : 'nil'})`);
  }

  hdrs.forEach(h => lines.push(`  req.Header.Set("${escapeDouble(h.key)}", "${escapeDouble(h.value)}")`));
  lines.push('  resp, _ := http.DefaultClient.Do(req)', '  defer resp.Body.Close()', '  bytes, _ := io.ReadAll(resp.Body)', '  fmt.Println(string(bytes))', '}');
  return authCommentBlock(authInfo, '//', 'aws-sdk-go-v2') + lines.join('\n') + sampleComment(res, '//');
}

function genJava(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = [
    'import java.net.http.*;', 'import java.net.URI;',
  ];

  if (isFormData(req) || isBinary(req)) {
    lines.push('import java.nio.file.*;');
  }

  lines.push('');
  lines.push('HttpClient client = HttpClient.newHttpClient();');
  lines.push(`HttpRequest.Builder builder = HttpRequest.newBuilder()`);
  lines.push(`    .uri(URI.create("${escapeDouble(url)}"))`);
  hdrs.forEach(h => lines.push(`    .header("${escapeDouble(h.key)}", "${escapeDouble(h.value)}")`));

  if (isFormData(req)) {
    const items = formDataItems(req);
    lines.push('    // Note: Java HttpClient does not have built-in multipart support');
    lines.push('    // Consider using a library like Apache HttpClient for complex multipart requests');
    const boundary = 'boundary-' + Date.now();
    const bodyParts: string[] = [];
    items.forEach(f => {
      if (f.isFile) {
        const filePath = f.value || '/path/to/file';
        bodyParts.push(`"--${boundary}\\r\\nContent-Disposition: form-data; name=\\"${escapeDouble(f.key)}\\"; filename=\\"${escapeDouble(filePath)}\\"\\r\\nContent-Type: application/octet-stream\\r\\n\\r\\n"`);
      } else {
        bodyParts.push(`"--${boundary}\\r\\nContent-Disposition: form-data; name=\\"${escapeDouble(f.key)}\\"\\r\\n\\r\\n${escapeDouble(f.value)}"`);
      }
    });
    lines.push(`    .header("Content-Type", "multipart/form-data; boundary=${boundary}")`);
    lines.push(`    .method("${req.method}", HttpRequest.BodyPublishers.ofString(${bodyParts.join(' + "\\r\\n" + ')} + "\\r\\n--${boundary}--"));`);
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`    .method("${req.method}", HttpRequest.BodyPublishers.ofFile(Path.of("${escapeDouble(filePath)}")));`);
  } else if (body) {
    lines.push(`    .method("${req.method}", HttpRequest.BodyPublishers.ofString(${JSON.stringify(body)}));`);
  } else {
    lines.push(`    .method("${req.method}", HttpRequest.BodyPublishers.noBody());`);
  }

  lines.push('', 'HttpRequest request = builder.build();');
  lines.push('HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());');
  lines.push('System.out.println(response.body());');
  return authCommentBlock(authInfo, '//', 'software.amazon.awssdk') + lines.join('\n') + sampleComment(res, '//');
}

function genCsharp(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = [
    'using var client = new HttpClient();',
    `var request = new HttpRequestMessage(HttpMethod.${req.method.charAt(0) + req.method.slice(1).toLowerCase()}, "${escapeDouble(url)}");`,
  ];
  hdrs.filter(h => !['content-type'].includes(h.key.toLowerCase())).forEach(h => {
    lines.push(`request.Headers.Add("${escapeDouble(h.key)}", "${escapeDouble(h.value)}");`);
  });

  if (isFormData(req)) {
    lines.push('var content = new MultipartFormDataContent();');
    formDataItems(req).forEach(f => {
      if (f.isFile) {
        const filePath = f.value || '/path/to/file';
        lines.push(`content.Add(new ByteArrayContent(File.ReadAllBytes("${escapeDouble(filePath)}")), "${escapeDouble(f.key)}", "${escapeDouble(filePath)}");`);
      } else {
        lines.push(`content.Add(new StringContent("${escapeDouble(f.value)}"), "${escapeDouble(f.key)}");`);
      }
    });
    lines.push('request.Content = content;');
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`request.Content = new ByteArrayContent(File.ReadAllBytes("${escapeDouble(filePath)}"));`);
  } else if (body) {
    const ct = hdrs.find(h => h.key.toLowerCase() === 'content-type')?.value || 'application/json';
    lines.push(`request.Content = new StringContent(${JSON.stringify(body)}, System.Text.Encoding.UTF8, "${escapeDouble(ct)}");`);
  }

  lines.push('', 'var response = await client.SendAsync(request);', 'var responseContent = await response.Content.ReadAsStringAsync();', 'Console.WriteLine(responseContent);');
  return authCommentBlock(authInfo, '//', 'AWSSDK.*') + lines.join('\n') + sampleComment(res, '//');
}

function genRuby(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = ["require 'net/http'", "require 'uri'", "require 'json'", ''];
  lines.push(`uri = URI.parse('${escapeSingle(url)}')`);
  lines.push(`request = Net::HTTP::${req.method.charAt(0) + req.method.slice(1).toLowerCase()}.new(uri)`);
  hdrs.forEach(h => lines.push(`request['${escapeSingle(h.key)}'] = '${escapeSingle(h.value)}'`));

  if (isFormData(req)) {
    const items = formDataItems(req);
    const fileItems = items.filter(f => f.isFile);
    const textItems = items.filter(f => !f.isFile);
    if (fileItems.length) {
      lines.push("# For file uploads, consider using the 'multipart-post' gem");
      fileItems.forEach(f => {
        const filePath = f.value || '/path/to/file';
        lines.push(`# request.set_form([['${escapeSingle(f.key)}', File.open('${escapeSingle(filePath)}')]], 'multipart/form-data')`);
      });
    }
    if (textItems.length) {
      lines.push(`request.set_form_data({${textItems.map(f => `'${escapeSingle(f.key)}' => '${escapeSingle(f.value)}'`).join(', ')}})`);
    }
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`request.body = File.read('${escapeSingle(filePath)}')`);
  } else if (body) {
    lines.push(`request.body = '${escapeSingle(body)}'`);
  }

  lines.push('', 'response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(request) }');
  lines.push('puts response.body');
  return authCommentBlock(authInfo, '#', 'aws-sdk-*') + lines.join('\n') + sampleComment(res, '#');
}

function genPhp(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = ['<?php', '', '$ch = curl_init();', `curl_setopt($ch, CURLOPT_URL, '${escapeSingle(url)}');`, 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);'];
  if (req.method !== 'GET') lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${req.method}');`);

  if (isFormData(req)) {
    const items = formDataItems(req);
    lines.push('curl_setopt($ch, CURLOPT_POSTFIELDS, [');
    items.forEach(f => {
      if (f.isFile) {
        const filePath = f.value || '/path/to/file';
        lines.push(`    '${escapeSingle(f.key)}' => new CURLFile('${escapeSingle(filePath)}'),`);
      } else {
        lines.push(`    '${escapeSingle(f.key)}' => '${escapeSingle(f.value)}',`);
      }
    });
    lines.push(']);');
    // When using form-data array, PHP/cURL sets Content-Type automatically; filter it from headers
    const filteredHdrs = hdrs.filter(h => h.key.toLowerCase() !== 'content-type');
    if (filteredHdrs.length) {
      lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [`, ...filteredHdrs.map(h => `    '${escapeSingle(h.key)}: ${escapeSingle(h.value)}',`), ']);');
    }
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('${escapeSingle(filePath)}'));`);
    if (hdrs.length) {
      lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [`, ...hdrs.map(h => `    '${escapeSingle(h.key)}: ${escapeSingle(h.value)}',`), ']);');
    }
  } else {
    if (hdrs.length) {
      lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [`, ...hdrs.map(h => `    '${escapeSingle(h.key)}: ${escapeSingle(h.value)}',`), ']);');
    }
    if (body) lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${escapeSingle(body)}');`);
  }

  lines.push('', '$response = curl_exec($ch);', 'curl_close($ch);', 'echo $response;');
  return authCommentBlock(authInfo, '//', 'aws/aws-sdk-php') + lines.join('\n') + sampleComment(res, '//');
}

function genRust(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = ['use reqwest;', ''];
  if (isFormData(req)) {
    lines.push('use reqwest::multipart;');
  }
  lines.push('#[tokio::main]', 'async fn main() -> Result<(), Box<dyn std::error::Error>> {');
  lines.push('    let client = reqwest::Client::new();');

  if (isFormData(req)) {
    lines.push('    let form = multipart::Form::new()');
    const items = formDataItems(req);
    items.forEach((f, i) => {
      const suffix = i === items.length - 1 ? ';' : '';
      if (f.isFile) {
        const filePath = f.value || '/path/to/file';
        lines.push(`        .file("${escapeDouble(f.key)}", "${escapeDouble(filePath)}").await?${suffix}`);
      } else {
        lines.push(`        .text("${escapeDouble(f.key)}", "${escapeDouble(f.value)}")${suffix}`);
      }
    });
    lines.push(`    let response = client.${req.method.toLowerCase()}("${escapeDouble(url)}")`);
    hdrs.forEach(h => lines.push(`        .header("${escapeDouble(h.key)}", "${escapeDouble(h.value)}")`));
    lines.push('        .multipart(form)');
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`    let file_data = std::fs::read("${escapeDouble(filePath)}")?;`);
    lines.push(`    let response = client.${req.method.toLowerCase()}("${escapeDouble(url)}")`);
    hdrs.forEach(h => lines.push(`        .header("${escapeDouble(h.key)}", "${escapeDouble(h.value)}")`));
    lines.push('        .body(file_data)');
  } else {
    lines.push(`    let response = client.${req.method.toLowerCase()}("${escapeDouble(url)}")`);
    hdrs.forEach(h => lines.push(`        .header("${escapeDouble(h.key)}", "${escapeDouble(h.value)}")`));
    if (body) lines.push(`        .body(${JSON.stringify(body)})`);
  }

  lines.push('        .send()', '        .await?', '        .text()', '        .await?;');
  lines.push('    println!("{}", response);', '    Ok(())', '}');
  return authCommentBlock(authInfo, '//', 'aws-sdk-rust') + lines.join('\n') + sampleComment(res, '//');
}

function genSwift(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null, authInfo: AuthInjection): string {
  const lines = ['import Foundation', '', `let url = URL(string: "${escapeDouble(url)}")!`, 'var request = URLRequest(url: url)'];
  lines.push(`request.httpMethod = "${req.method}"`);
  hdrs.forEach(h => lines.push(`request.setValue("${escapeDouble(h.value)}", forHTTPHeaderField: "${escapeDouble(h.key)}")`));

  if (isFormData(req)) {
    lines.push('');
    lines.push('let boundary = "Boundary-\\(UUID().uuidString)"');
    lines.push('request.setValue("multipart/form-data; boundary=\\(boundary)", forHTTPHeaderField: "Content-Type")');
    lines.push('var bodyData = Data()');
    formDataItems(req).forEach(f => {
      if (f.isFile) {
        const filePath = f.value || '/path/to/file';
        lines.push(`bodyData.append("--\\(boundary)\\r\\nContent-Disposition: form-data; name=\\"${escapeDouble(f.key)}\\"; filename=\\"${escapeDouble(filePath)}\\"\\r\\nContent-Type: application/octet-stream\\r\\n\\r\\n".data(using: .utf8)!)`);
        lines.push(`bodyData.append(try! Data(contentsOf: URL(fileURLWithPath: "${escapeDouble(filePath)}")))`);
        lines.push('bodyData.append("\\r\\n".data(using: .utf8)!)');
      } else {
        lines.push(`bodyData.append("--\\(boundary)\\r\\nContent-Disposition: form-data; name=\\"${escapeDouble(f.key)}\\"\\r\\n\\r\\n${escapeDouble(f.value)}\\r\\n".data(using: .utf8)!)`);
      }
    });
    lines.push('bodyData.append("--\\(boundary)--\\r\\n".data(using: .utf8)!)');
    lines.push('request.httpBody = bodyData');
  } else if (isBinary(req)) {
    const filePath = req.body.binaryName || '/path/to/file';
    lines.push(`request.httpBody = try Data(contentsOf: URL(fileURLWithPath: "${escapeDouble(filePath)}"))`);
  } else if (body) {
    lines.push(`request.httpBody = ${JSON.stringify(body)}.data(using: .utf8)`);
  }

  lines.push('', 'let (data, _) = try await URLSession.shared.data(for: request)', 'print(String(data: data, encoding: .utf8)!)');
  return authCommentBlock(authInfo, '//') + lines.join('\n') + sampleComment(res, '//');
}
