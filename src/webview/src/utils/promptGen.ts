import { ApiRequest, ApiResponse } from '../types/messages';

export type PromptDialect = 'describe' | 'integrate' | 'debug' | 'test' | 'document';

export const PROMPT_DIALECTS: { value: PromptDialect; label: string; prefix: string }[] = [
  { value: 'describe', label: 'Explain API', prefix: 'Explain what this API endpoint does and how to use it:\n\n' },
  { value: 'integrate', label: 'Write Integration', prefix: 'Write production-ready integration code for this API endpoint:\n\n' },
  { value: 'debug', label: 'Debug Response', prefix: 'Help me debug this API request and its response:\n\n' },
  { value: 'test', label: 'Write Tests', prefix: 'Write comprehensive tests for this API endpoint:\n\n' },
  { value: 'document', label: 'Generate Docs', prefix: 'Generate API documentation for this endpoint:\n\n' },
];

function describeAuth(req: ApiRequest): string {
  const a = req.auth;
  switch (a.type) {
    case 'none': return '';
    case 'basic': return `- Auth: Basic (username: ${a.basic?.username || '<username>'})\n`;
    case 'bearer': return `- Auth: Bearer token\n`;
    case 'api-key': return `- Auth: API Key "${a.apiKey?.key}" in ${a.apiKey?.addTo || 'header'}\n`;
    case 'oauth2': return `- Auth: OAuth2 (${a.oauth2?.grantType || 'authorization_code'})\n`;
    case 'aws-sigv4': return `- Auth: AWS Signature V4 (region: ${a.awsSigV4?.region}, service: ${a.awsSigV4?.service})\n`;
    default: return '';
  }
}

function describeBody(req: ApiRequest): string {
  const b = req.body;
  if (b.type === 'none') return '';
  if (b.type === 'json' || b.type === 'raw' || b.type === 'xml') {
    const content = b.raw?.trim();
    if (!content) return `- Body: ${b.type} (empty)\n`;
    return `- Body (${b.type}):\n\`\`\`\n${content}\n\`\`\`\n`;
  }
  if (b.type === 'x-www-form-urlencoded') {
    const fields = (b.formData || []).filter(f => f.enabled && f.key);
    if (!fields.length) return '';
    return `- Body (form-urlencoded): ${fields.map(f => `${f.key}=${f.value}`).join(', ')}\n`;
  }
  if (b.type === 'form-data') {
    const items = b.formDataFiles || b.formData || [];
    const fields = items.filter((f: any) => f.enabled && f.key);
    if (!fields.length) return '';
    return `- Body (multipart form-data): ${fields.map((f: any) => `${f.key} (${f.fieldType === 'file' ? 'file' : 'text'})`).join(', ')}\n`;
  }
  if (b.type === 'graphql') {
    return `- Body (GraphQL):\n\`\`\`graphql\n${b.graphql?.query || ''}\n\`\`\`\n${b.graphql?.variables ? `Variables: ${b.graphql.variables}\n` : ''}`;
  }
  if (b.type === 'binary') {
    return `- Body: Binary file (${b.binaryName || 'file'})\n`;
  }
  return '';
}

export function generatePrompt(req: ApiRequest, dialect: PromptDialect, response: ApiResponse | null, envVars: Record<string, string>): string {
  const resolve = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => envVars[k] ?? `{{${k}}}`);
  const d = PROMPT_DIALECTS.find(p => p.value === dialect)!;

  const hdrs = req.headers.filter(h => h.enabled && h.key);
  let prompt = d.prefix;
  prompt += `## Request\n`;
  prompt += `- Method: ${req.method}\n`;
  prompt += `- URL: ${resolve(req.url)}\n`;
  prompt += describeAuth(req);
  if (hdrs.length) prompt += `- Headers: ${hdrs.map(h => `${resolve(h.key)}: ${resolve(h.value)}`).join(', ')}\n`;
  prompt += describeBody(req);

  if (response && response.status > 0) {
    prompt += `\n## Response\n`;
    prompt += `- Status: ${response.status} ${response.statusText}\n`;
    const respHdrs = Object.entries(response.headers);
    if (respHdrs.length) prompt += `- Headers: ${respHdrs.map(([k, v]) => `${k}: ${v}`).join(', ')}\n`;
    if (response.body) {
      let body = response.body;
      try { body = JSON.stringify(JSON.parse(body), null, 2); } catch {}
      if (body.length > 2000) body = body.slice(0, 2000) + '\n... (truncated)';
      prompt += `- Body:\n\`\`\`\n${body}\n\`\`\`\n`;
    }
  }

  return prompt;
}
