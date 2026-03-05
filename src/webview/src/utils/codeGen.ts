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

function buildUrl(req: ApiRequest): string {
  const params = req.params.filter(p => p.enabled && p.key);
  if (params.length === 0) return req.url;
  const sp = new URLSearchParams();
  params.forEach(p => sp.append(p.key, p.value));
  const sep = req.url.includes('?') ? '&' : '?';
  return `${req.url}${sep}${sp.toString()}`;
}

function headers(req: ApiRequest): { key: string; value: string }[] {
  return req.headers.filter(h => h.enabled && h.key);
}

function bodyStr(req: ApiRequest): string | null {
  const b = req.body;
  if (b.type === 'none' || req.method === 'GET' || req.method === 'HEAD') return null;
  if (b.type === 'json' || b.type === 'raw' || b.type === 'xml') return b.raw || '';
  if (b.type === 'x-www-form-urlencoded') {
    const sp = new URLSearchParams();
    (b.formData || []).filter(f => f.enabled).forEach(f => sp.append(f.key, f.value));
    return sp.toString();
  }
  if (b.type === 'graphql') {
    return JSON.stringify({ query: b.graphql?.query || '', variables: JSON.parse(b.graphql?.variables || '{}') });
  }
  return null;
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

export function generateCode(req: ApiRequest, lang: CodeLanguage, response: ApiResponse | null): string {
  const url = buildUrl(req);
  const hdrs = headers(req);
  const body = bodyStr(req);

  switch (lang) {
    case 'curl': return genCurl(req, url, hdrs, body, response);
    case 'javascript-fetch': return genJsFetch(req, url, hdrs, body, response);
    case 'javascript-axios': return genJsAxios(req, url, hdrs, body, response);
    case 'python-requests': return genPythonRequests(req, url, hdrs, body, response);
    case 'python-http': return genPythonHttp(req, url, hdrs, body, response);
    case 'go': return genGo(req, url, hdrs, body, response);
    case 'java': return genJava(req, url, hdrs, body, response);
    case 'csharp': return genCsharp(req, url, hdrs, body, response);
    case 'ruby': return genRuby(req, url, hdrs, body, response);
    case 'php': return genPhp(req, url, hdrs, body, response);
    case 'rust': return genRust(req, url, hdrs, body, response);
    case 'swift': return genSwift(req, url, hdrs, body, response);
  }
}

type H = { key: string; value: string }[];

function genCurl(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const parts = [`curl -X ${req.method} '${url}'`];
  hdrs.forEach(h => parts.push(`  -H '${h.key}: ${h.value}'`));
  if (body) parts.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
  return parts.join(' \\\n') + sampleComment(res, '#');
}

function genJsFetch(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const opts: string[] = [`  method: '${req.method}'`];
  if (hdrs.length) {
    opts.push(`  headers: {\n${hdrs.map(h => `    '${h.key}': '${h.value}'`).join(',\n')}\n  }`);
  }
  if (body) opts.push(`  body: ${JSON.stringify(body)}`);
  return `const response = await fetch('${url}', {\n${opts.join(',\n')}\n});\n\nconst data = await response.json();\nconsole.log(data);${sampleComment(res, '//')}`;
}

function genJsAxios(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const m = req.method.toLowerCase();
  const hdrObj = hdrs.length ? `\n  headers: {\n${hdrs.map(h => `    '${h.key}': '${h.value}'`).join(',\n')}\n  }` : '';
  const dataStr = body ? `\n  data: ${JSON.stringify(body)}` : '';
  return `const { data } = await axios.${m}('${url}', {${hdrObj}${dataStr ? ',' : ''}${dataStr}\n});\n\nconsole.log(data);${sampleComment(res, '//')}`;
}

function genPythonRequests(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = ['import requests', ''];
  if (hdrs.length) lines.push(`headers = {\n${hdrs.map(h => `    '${h.key}': '${h.value}'`).join(',\n')}\n}`);
  const args = [`'${url}'`];
  if (hdrs.length) args.push('headers=headers');
  if (body) args.push(req.body.type === 'json' ? `json=${body}` : `data='${body}'`);
  lines.push(`response = requests.${req.method.toLowerCase()}(${args.join(', ')})`);
  lines.push('print(response.json())');
  return lines.join('\n') + sampleComment(res, '#');
}

function genPythonHttp(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return '# Invalid URL'; }
  const lines = [
    'import http.client', 'import json', '',
    `conn = http.client.HTTP${parsed.protocol === 'https:' ? 'S' : ''}Connection('${parsed.host}')`,
  ];
  if (hdrs.length) lines.push(`headers = {\n${hdrs.map(h => `    '${h.key}': '${h.value}'`).join(',\n')}\n}`);
  const path = parsed.pathname + parsed.search;
  lines.push(`conn.request('${req.method}', '${path}'${body ? `, body='${body}'` : ''}${hdrs.length ? ', headers=headers' : ''})`);
  lines.push('res = conn.getresponse()', 'data = res.read()', 'print(data.decode("utf-8"))');
  return lines.join('\n') + sampleComment(res, '#');
}

function genGo(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = ['package main', '', 'import (', '  "fmt"', '  "io"', '  "net/http"'];
  if (body) lines.push('  "strings"');
  lines.push(')', '', 'func main() {');
  if (body) lines.push(`  body := strings.NewReader(\`${body}\`)`);
  lines.push(`  req, _ := http.NewRequest("${req.method}", "${url}", ${body ? 'body' : 'nil'})`);
  hdrs.forEach(h => lines.push(`  req.Header.Set("${h.key}", "${h.value}")`));
  lines.push('  resp, _ := http.DefaultClient.Do(req)', '  defer resp.Body.Close()', '  bytes, _ := io.ReadAll(resp.Body)', '  fmt.Println(string(bytes))', '}');
  return lines.join('\n') + sampleComment(res, '//');
}

function genJava(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = [
    'import java.net.http.*;', 'import java.net.URI;', '',
    'HttpClient client = HttpClient.newHttpClient();',
    `HttpRequest.Builder builder = HttpRequest.newBuilder()`,
    `    .uri(URI.create("${url}"))`,
  ];
  hdrs.forEach(h => lines.push(`    .header("${h.key}", "${h.value}")`));
  if (body) {
    lines.push(`    .method("${req.method}", HttpRequest.BodyPublishers.ofString(${JSON.stringify(body)}));`);
  } else {
    lines.push(`    .method("${req.method}", HttpRequest.BodyPublishers.noBody());`);
  }
  lines.push('', 'HttpRequest request = builder.build();');
  lines.push('HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());');
  lines.push('System.out.println(response.body());');
  return lines.join('\n') + sampleComment(res, '//');
}

function genCsharp(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = [
    'using var client = new HttpClient();',
    `var request = new HttpRequestMessage(HttpMethod.${req.method.charAt(0) + req.method.slice(1).toLowerCase()}, "${url}");`,
  ];
  hdrs.filter(h => !['content-type'].includes(h.key.toLowerCase())).forEach(h => {
    lines.push(`request.Headers.Add("${h.key}", "${h.value}");`);
  });
  if (body) {
    const ct = hdrs.find(h => h.key.toLowerCase() === 'content-type')?.value || 'application/json';
    lines.push(`request.Content = new StringContent(${JSON.stringify(body)}, System.Text.Encoding.UTF8, "${ct}");`);
  }
  lines.push('', 'var response = await client.SendAsync(request);', 'var content = await response.Content.ReadAsStringAsync();', 'Console.WriteLine(content);');
  return lines.join('\n') + sampleComment(res, '//');
}

function genRuby(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = ["require 'net/http'", "require 'uri'", "require 'json'", ''];
  lines.push(`uri = URI.parse('${url}')`);
  lines.push(`request = Net::HTTP::${req.method.charAt(0) + req.method.slice(1).toLowerCase()}.new(uri)`);
  hdrs.forEach(h => lines.push(`request['${h.key}'] = '${h.value}'`));
  if (body) lines.push(`request.body = '${body.replace(/'/g, "\\'")}'`);
  lines.push('', 'response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(request) }');
  lines.push('puts response.body');
  return lines.join('\n') + sampleComment(res, '#');
}

function genPhp(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = ['<?php', '', '$ch = curl_init();', `curl_setopt($ch, CURLOPT_URL, '${url}');`, 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);'];
  if (req.method !== 'GET') lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${req.method}');`);
  if (hdrs.length) {
    lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [`, ...hdrs.map(h => `    '${h.key}: ${h.value}',`), ']);');
  }
  if (body) lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');`);
  lines.push('', '$response = curl_exec($ch);', 'curl_close($ch);', 'echo $response;');
  return lines.join('\n') + sampleComment(res, '//');
}

function genRust(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = ['use reqwest;', '', '#[tokio::main]', 'async fn main() -> Result<(), Box<dyn std::error::Error>> {'];
  lines.push('    let client = reqwest::Client::new();');
  lines.push(`    let response = client.${req.method.toLowerCase()}("${url}")`);
  hdrs.forEach(h => lines.push(`        .header("${h.key}", "${h.value}")`));
  if (body) lines.push(`        .body(${JSON.stringify(body)})`);
  lines.push('        .send()', '        .await?', '        .text()', '        .await?;');
  lines.push('    println!("{}", response);', '    Ok(())', '}');
  return lines.join('\n') + sampleComment(res, '//');
}

function genSwift(req: ApiRequest, url: string, hdrs: H, body: string | null, res: ApiResponse | null): string {
  const lines = ['import Foundation', '', `let url = URL(string: "${url}")!`, 'var request = URLRequest(url: url)'];
  lines.push(`request.httpMethod = "${req.method}"`);
  hdrs.forEach(h => lines.push(`request.setValue("${h.value}", forHTTPHeaderField: "${h.key}")`));
  if (body) lines.push(`request.httpBody = ${JSON.stringify(body)}.data(using: .utf8)`);
  lines.push('', 'let (data, _) = try await URLSession.shared.data(for: request)', 'print(String(data: data, encoding: .utf8)!)');
  return lines.join('\n') + sampleComment(res, '//');
}
