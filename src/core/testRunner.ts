import { TestRule, TestResult, SetVariable, ApiResponse } from './types';

const SOURCE_LABELS: Record<string, string> = {
  status: 'Status Code', time: 'Response Time', size: 'Response Size',
  body: 'Response Body', jsonpath: 'JSON Path', header: 'Header',
  'content-type': 'Content-Type', 'content-length': 'Content-Length',
  'body-contains': 'Body Contains', 'body-is-json': 'Body Is JSON', 'body-schema': 'Body Schema',
};

const OP_LABELS: Record<string, string> = {
  eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
  contains: 'contains', 'not-contains': 'not contains',
  matches: 'matches', 'not-matches': 'not matches',
  'is-empty': 'is empty', 'is-not-empty': 'is not empty',
  exists: 'exists', 'not-exists': 'not exists', 'is-type': 'is type',
};

/**
 * Resolve a dot/bracket notation path on a JSON object.
 * Supports: data.users[0].name, data["key with spaces"], data.items[*].id
 */
function resolveJsonPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments: (string | number)[] = [];
  const re = /(\w+)|\[(\d+)\]|\["([^"]+)"\]|\['([^']+)'\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) segments.push(m[1]);
    else if (m[2] !== undefined) segments.push(parseInt(m[2], 10));
    else if (m[3] !== undefined) segments.push(m[3]);
    else if (m[4] !== undefined) segments.push(m[4]);
  }
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string | number, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

function extractValue(rule: { source: string; property: string }, response: ApiResponse): { value: unknown; exists: boolean } {
  switch (rule.source) {
    case 'status': return { value: response.status, exists: true };
    case 'time': return { value: response.time, exists: true };
    case 'size': return { value: response.size, exists: true };
    case 'body': return { value: response.body, exists: true };
    case 'content-type': return { value: response.headers['content-type'] ?? response.headers['Content-Type'], exists: 'content-type' in response.headers || 'Content-Type' in response.headers };
    case 'content-length': return { value: response.headers['content-length'] ?? response.headers['Content-Length'], exists: 'content-length' in response.headers || 'Content-Length' in response.headers };
    case 'header': {
      const key = rule.property.toLowerCase();
      const entry = Object.entries(response.headers).find(([k]) => k.toLowerCase() === key);
      return { value: entry?.[1], exists: !!entry };
    }
    case 'jsonpath': {
      try {
        const json = JSON.parse(response.body);
        const val = resolveJsonPath(json, rule.property);
        return { value: val, exists: val !== undefined };
      } catch {
        return { value: undefined, exists: false };
      }
    }
    case 'body-contains': return { value: response.body.includes(rule.property), exists: true };
    case 'body-is-json': {
      try { JSON.parse(response.body); return { value: true, exists: true }; }
      catch { return { value: false, exists: true }; }
    }
    case 'body-schema': {
      try { JSON.parse(response.body); return { value: response.body, exists: true }; }
      catch { return { value: undefined, exists: false }; }
    }
    default: return { value: undefined, exists: false };
  }
}

function stringify(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function compare(actual: unknown, operator: string, expected: string): boolean {
  const actualStr = stringify(actual);
  const actualNum = Number(actual);
  const expectedNum = Number(expected);
  const bothNumeric = !isNaN(actualNum) && !isNaN(expectedNum) && actual !== '' && expected !== '';

  switch (operator) {
    case 'eq': return bothNumeric ? actualNum === expectedNum : actualStr === expected;
    case 'neq': return bothNumeric ? actualNum !== expectedNum : actualStr !== expected;
    case 'gt': return bothNumeric ? actualNum > expectedNum : actualStr > expected;
    case 'gte': return bothNumeric ? actualNum >= expectedNum : actualStr >= expected;
    case 'lt': return bothNumeric ? actualNum < expectedNum : actualStr < expected;
    case 'lte': return bothNumeric ? actualNum <= expectedNum : actualStr <= expected;
    case 'contains': return actualStr.includes(expected);
    case 'not-contains': return !actualStr.includes(expected);
    case 'matches': try { return new RegExp(expected).test(actualStr); } catch { return false; }
    case 'not-matches': try { return !new RegExp(expected).test(actualStr); } catch { return false; }
    case 'is-empty': return actualStr === '' || actualStr === 'undefined' || actualStr === 'null';
    case 'is-not-empty': return actualStr !== '' && actualStr !== 'undefined' && actualStr !== 'null';
    case 'exists': return actual !== undefined;
    case 'not-exists': return actual === undefined;
    case 'is-type': {
      if (expected === 'array') return Array.isArray(actual);
      return typeof actual === expected;
    }
    default: return false;
  }
}

function buildLabel(rule: TestRule): string {
  const src = SOURCE_LABELS[rule.source] || rule.source;
  const prop = rule.property ? ` "${rule.property}"` : '';
  const op = OP_LABELS[rule.operator] || rule.operator;
  const exp = ['is-empty', 'is-not-empty', 'exists', 'not-exists'].includes(rule.operator) ? '' : ` "${rule.expected}"`;
  return `${src}${prop} ${op}${exp}`;
}

export function evaluateTests(rules: TestRule[], response: ApiResponse): TestResult[] {
  return rules.filter(r => r.enabled).map(rule => {
    const { value, exists } = extractValue(rule, response);

    if (rule.source === 'body-contains') {
      const passed = rule.operator === 'eq' ? value === true : value === false;
      return { ruleId: rule.id, passed, label: buildLabel(rule), actual: String(value), expected: rule.expected };
    }

    if (rule.source === 'body-is-json') {
      const passed = rule.operator === 'eq' ? value === true : value === false;
      return { ruleId: rule.id, passed, label: buildLabel(rule), actual: String(value), expected: 'true' };
    }

    if (rule.source === 'body-schema') {
      const passed = validateSchema(response.body, rule.expected);
      return { ruleId: rule.id, passed, label: buildLabel(rule), actual: passed ? 'valid' : 'invalid', expected: 'valid schema' };
    }

    if (rule.operator === 'exists') {
      return { ruleId: rule.id, passed: exists, label: buildLabel(rule), actual: exists ? 'exists' : 'not found', expected: 'exists' };
    }
    if (rule.operator === 'not-exists') {
      return { ruleId: rule.id, passed: !exists, label: buildLabel(rule), actual: exists ? 'exists' : 'not found', expected: 'not exists' };
    }

    const passed = compare(value, rule.operator, rule.expected);
    return { ruleId: rule.id, passed, label: buildLabel(rule), actual: stringify(value), expected: rule.expected };
  });
}

export function extractVariables(rules: SetVariable[], response: ApiResponse): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const rule of rules.filter(r => r.enabled && r.variableName)) {
    let value: unknown;
    switch (rule.source) {
      case 'jsonpath':
        try { value = resolveJsonPath(JSON.parse(response.body), rule.property); } catch { value = undefined; }
        break;
      case 'header': {
        const key = rule.property.toLowerCase();
        const entry = Object.entries(response.headers).find(([k]) => k.toLowerCase() === key);
        value = entry?.[1];
        break;
      }
      case 'body':
        value = response.body;
        break;
      case 'regex':
        try {
          const match = new RegExp(rule.property).exec(response.body);
          value = match ? (match[1] ?? match[0]) : undefined;
        } catch { value = undefined; }
        break;
    }
    if (value !== undefined) vars[rule.variableName] = stringify(value);
  }
  return vars;
}

function validateSchema(body: string, schemaStr: string): boolean {
  try {
    const data = JSON.parse(body);
    const schema = JSON.parse(schemaStr);
    return validateNode(data, schema);
  } catch { return false; }
}

function validateNode(data: unknown, schema: Record<string, unknown>): boolean {
  if (schema.type) {
    const t = schema.type as string;
    if (t === 'object' && (typeof data !== 'object' || data === null || Array.isArray(data))) return false;
    if (t === 'array' && !Array.isArray(data)) return false;
    if (t === 'string' && typeof data !== 'string') return false;
    if (t === 'number' && typeof data !== 'number') return false;
    if (t === 'boolean' && typeof data !== 'boolean') return false;
    if (t === 'integer' && (typeof data !== 'number' || !Number.isInteger(data))) return false;
  }
  if (schema.required && Array.isArray(schema.required) && typeof data === 'object' && data !== null) {
    for (const key of schema.required as string[]) {
      if (!(key in (data as Record<string, unknown>))) return false;
    }
  }
  if (schema.properties && typeof data === 'object' && data !== null) {
    for (const [key, propSchema] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
      if (key in (data as Record<string, unknown>)) {
        if (!validateNode((data as Record<string, unknown>)[key], propSchema)) return false;
      }
    }
  }
  if (schema.items && Array.isArray(data)) {
    for (const item of data) {
      if (!validateNode(item, schema.items as Record<string, unknown>)) return false;
    }
  }
  return true;
}
