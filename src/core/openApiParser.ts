import * as yaml from 'js-yaml';
import { Collection, CollectionFolder, ApiRequest, KeyValue, AuthConfig, HttpMethod, RequestBody } from './types';

interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info: { title: string; version?: string };
  servers?: { url: string }[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, Record<string, OperationObject>>;
  components?: { schemas?: Record<string, SchemaObject>; securitySchemes?: Record<string, SecurityScheme> };
  definitions?: Record<string, SchemaObject>;
  securityDefinitions?: Record<string, SecurityScheme>;
}

interface OperationObject {
  summary?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: { content?: Record<string, { schema?: SchemaObject; example?: unknown }> };
  security?: Record<string, string[]>[];
  // Swagger 2.0
  consumes?: string[];
  produces?: string[];
}

interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'body' | 'cookie';
  required?: boolean;
  schema?: SchemaObject;
  type?: string;
  example?: unknown;
  default?: unknown;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
  required?: string[];
  format?: string;
}

interface SecurityScheme {
  type: string;
  scheme?: string;
  name?: string;
  in?: string;
  flows?: {
    authorizationCode?: { authorizationUrl?: string; tokenUrl?: string; scopes?: Record<string, string> };
    clientCredentials?: { tokenUrl?: string; scopes?: Record<string, string> };
  };
}

export interface OpenApiImportResult {
  collection: Collection;
  environment: { name: string; variables: KeyValue[] };
  requestCount: number;
}

export function parseOpenApiSpec(content: string, fileName: string): OpenApiImportResult {
  // Parse JSON or YAML
  let spec: OpenApiSpec;
  if (content.trim().startsWith('{')) {
    spec = JSON.parse(content);
  } else {
    spec = yaml.load(content) as OpenApiSpec;
  }

  const isSwagger2 = !!spec.swagger && spec.swagger.startsWith('2');
  const schemas = spec.components?.schemas || spec.definitions || {};
  const securitySchemes = spec.components?.securitySchemes || spec.securityDefinitions || {};

  // Resolve base URL
  let baseUrl = '';
  if (spec.servers && spec.servers.length > 0) {
    baseUrl = spec.servers[0].url;
  } else if (spec.host) {
    const scheme = spec.schemes?.[0] || 'https';
    baseUrl = `${scheme}://${spec.host}${spec.basePath || ''}`;
  }

  // Resolve ref helper
  const resolveRef = (ref: string): SchemaObject => {
    const path = ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
    return schemas[path] || {};
  };

  // Generate example from schema
  const generateExample = (schema: SchemaObject, depth = 0): unknown => {
    if (depth > 5) return null;
    if (schema.$ref) return generateExample(resolveRef(schema.$ref), depth + 1);
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    if (schema.allOf) {
      const merged: Record<string, unknown> = {};
      for (const sub of schema.allOf) {
        const val = generateExample(sub, depth + 1);
        if (typeof val === 'object' && val !== null) Object.assign(merged, val);
      }
      return merged;
    }
    if (schema.oneOf || schema.anyOf) {
      const choices = schema.oneOf || schema.anyOf || [];
      return choices.length > 0 ? generateExample(choices[0], depth + 1) : null;
    }

    switch (schema.type) {
      case 'object': {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(schema.properties || {})) {
          obj[key] = generateExample(prop, depth + 1);
        }
        return obj;
      }
      case 'array':
        return schema.items ? [generateExample(schema.items, depth + 1)] : [];
      case 'string':
        if (schema.format === 'date') return '2026-01-01';
        if (schema.format === 'date-time') return '2026-01-01T00:00:00Z';
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
        if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
        return 'string';
      case 'integer': return 0;
      case 'number': return 0.0;
      case 'boolean': return true;
      default:
        if (schema.properties) {
          const obj: Record<string, unknown> = {};
          for (const [key, prop] of Object.entries(schema.properties)) {
            obj[key] = generateExample(prop, depth + 1);
          }
          return obj;
        }
        return null;
    }
  };

  // Map security scheme to auth config
  const mapAuth = (): AuthConfig => {
    const firstScheme = Object.values(securitySchemes)[0];
    if (!firstScheme) return { type: 'none' };

    if (firstScheme.type === 'http' && firstScheme.scheme === 'basic') {
      return { type: 'basic', basic: { username: '', password: '' } };
    }
    if (firstScheme.type === 'http' && firstScheme.scheme === 'bearer') {
      return { type: 'bearer', bearer: { token: '' } };
    }
    if (firstScheme.type === 'apiKey') {
      return {
        type: 'api-key',
        apiKey: { key: firstScheme.name || 'X-API-Key', value: '', addTo: firstScheme.in === 'query' ? 'query' : 'header' },
      };
    }
    if (firstScheme.type === 'oauth2') {
      const flow = firstScheme.flows?.authorizationCode || firstScheme.flows?.clientCredentials;
      return {
        type: 'oauth2',
        oauth2: {
          grantType: firstScheme.flows?.authorizationCode ? 'authorization_code' : 'client_credentials',
          authUrl: flow?.authorizationUrl || '',
          tokenUrl: flow?.tokenUrl || '',
          clientId: '',
          clientSecret: '',
          scope: Object.keys(flow?.scopes || {}).join(' '),
        },
      };
    }
    return { type: 'none' };
  };

  const defaultAuth = mapAuth();

  // Parse all paths into requests grouped by tag
  const tagFolders: Record<string, ApiRequest[]> = {};
  const untaggedRequests: ApiRequest[] = [];
  let requestCount = 0;
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [methodLower, operation] of Object.entries(methods)) {
      if (!httpMethods.includes(methodLower)) continue;
      const op = operation as OperationObject;
      const method = methodLower.toUpperCase() as HttpMethod;

      // Build URL with path params as {{param}}
      const urlPath = path.replace(/\{(\w+)\}/g, '{{$1}}');
      const url = `{{base_url}}${urlPath}`;

      // Collect parameters (merge path-level and operation-level for Swagger 2.0)
      const allParams = [...(op.parameters || []), ...((methods as Record<string, unknown>).parameters as ParameterObject[] || [])];

      const queryParams: KeyValue[] = [];
      const headerParams: KeyValue[] = [];
      const pathParams: KeyValue[] = [];

      for (const param of allParams) {
        const val = String(param.example ?? param.default ?? '');
        const kv: KeyValue = { key: param.name, value: val, enabled: !!param.required };
        if (param.in === 'query') queryParams.push(kv);
        else if (param.in === 'header') headerParams.push(kv);
        else if (param.in === 'path') pathParams.push(kv);
      }

      // Body
      let body: RequestBody = { type: 'none' };

      if (op.requestBody?.content) {
        // OpenAPI 3.0
        const jsonContent = op.requestBody.content['application/json'];
        const formContent = op.requestBody.content['multipart/form-data'];
        const urlencodedContent = op.requestBody.content['application/x-www-form-urlencoded'];

        if (jsonContent?.schema) {
          const example = jsonContent.example ?? generateExample(jsonContent.schema);
          body = { type: 'json', raw: JSON.stringify(example, null, 2) };
        } else if (formContent?.schema) {
          const props = formContent.schema.properties || {};
          body = {
            type: 'form-data',
            formData: Object.keys(props).map(k => ({ key: k, value: '', enabled: true })),
          };
        } else if (urlencodedContent?.schema) {
          const props = urlencodedContent.schema.properties || {};
          body = {
            type: 'x-www-form-urlencoded',
            formData: Object.keys(props).map(k => ({ key: k, value: '', enabled: true })),
          };
        }
      } else if (isSwagger2) {
        // Swagger 2.0: body parameter
        const bodyParam = allParams.find(p => p.in === 'body');
        if (bodyParam?.schema) {
          const example = generateExample(bodyParam.schema);
          body = { type: 'json', raw: JSON.stringify(example, null, 2) };
        }
      }

      const name = op.summary || op.operationId || `${method} ${path}`;
      const request: ApiRequest = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        name,
        method,
        url,
        params: queryParams,
        headers: headerParams,
        body,
        auth: defaultAuth,
      };

      requestCount++;
      const tag = op.tags?.[0];
      if (tag) {
        if (!tagFolders[tag]) tagFolders[tag] = [];
        tagFolders[tag].push(request);
      } else {
        untaggedRequests.push(request);
      }
    }
  }

  // Build folders from tags
  const folders: CollectionFolder[] = Object.entries(tagFolders).map(([tag, requests]) => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    name: tag,
    requests,
    folders: [],
  }));

  const specName = spec.info.title || fileName.replace(/\.(json|ya?ml)$/i, '');

  const collection: Collection = {
    id: Date.now().toString(),
    name: specName,
    folders,
    requests: untaggedRequests,
    variables: [],
  };

  const environment = {
    name: specName,
    variables: [
      { key: 'base_url', value: baseUrl.replace(/\/$/, ''), enabled: true },
      // Add path param placeholders
      ...Array.from(new Set(
        Object.keys(spec.paths || {})
          .flatMap(p => [...p.matchAll(/\{(\w+)\}/g)].map(m => m[1]))
      )).map(param => ({ key: param, value: '', enabled: true })),
    ],
  };

  return { collection, environment, requestCount };
}
