import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateCode, LANGUAGES, type CodeLanguage } from '../codeGen';
import type {
  ApiRequest,
  AuthConfig,
  AuthType,
  HttpMethod,
  BodyType,
  KeyValue,
  RequestBody,
  FormDataItem,
} from '../../types/messages';

// ---------------------------------------------------------------------------
// Shared fast-check arbitraries
// ---------------------------------------------------------------------------

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_TYPES: BodyType[] = ['none', 'json', 'raw', 'xml', 'graphql', 'form-data', 'x-www-form-urlencoded', 'binary'];
const AUTH_TYPES: AuthType[] = ['none', 'basic', 'bearer', 'apiKey', 'oauth2', 'awsSigV4'];

/** Pick one of the 12 supported CodeLanguage values uniformly. */
function arbCodeLanguage(): fc.Arbitrary<CodeLanguage> {
  return fc.constantFrom(...LANGUAGES.map(l => l.value));
}

/** Generate strings containing backslashes, quotes, newlines, and other special characters. */
function arbSpecialString(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.string(),
    fc.constantFrom(
      'hello\\world',
      "it's a test",
      'say "hello"',
      'line1\nline2',
      'tab\there',
      'back\\slash',
      "mix'ed\"quotes",
      'path\\to\\file',
      '\r\n windows',
      '',
    ),
    fc.stringOf(
      fc.oneof(
        fc.char(),
        fc.constantFrom('\\', "'", '"', '\n', '\t', '\r', '`', '$', '!', '&', '|', ';'),
      ),
      { minLength: 1, maxLength: 50 },
    ),
  );
}

/** Generate a random enabled KeyValue pair. */
function arbKeyValue(
  keyArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 }),
  valueArb: fc.Arbitrary<string> = fc.string({ maxLength: 50 }),
): fc.Arbitrary<KeyValue> {
  return fc.record({
    key: keyArb,
    value: valueArb,
    enabled: fc.constant(true),
  });
}

/** Generate random form-data items (mix of text and file fields). */
function arbFormDataItems(): fc.Arbitrary<FormDataItem[]> {
  const textItem: fc.Arbitrary<FormDataItem> = fc.record({
    key: fc.string({ minLength: 1, maxLength: 20 }),
    value: fc.string({ maxLength: 50 }),
    enabled: fc.constant(true),
    fieldType: fc.constant('text' as const),
  });
  const fileItem: fc.Arbitrary<FormDataItem> = fc.record({
    key: fc.string({ minLength: 1, maxLength: 20 }),
    value: fc.string({ maxLength: 50 }),
    enabled: fc.constant(true),
    fieldType: fc.constant('file' as const),
    fileName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    filePath: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  });
  return fc.array(fc.oneof(textItem, fileItem), { minLength: 1, maxLength: 5 });
}

/** Generate a random valid JSON object string. */
function arbJsonBody(): fc.Arbitrary<string> {
  const leaf = fc.oneof(
    fc.string({ maxLength: 30 }).map(s => JSON.stringify(s)),
    fc.integer().map(n => String(n)),
    fc.boolean().map(b => String(b)),
    fc.constant('null'),
  );
  return fc
    .dictionary(fc.string({ minLength: 1, maxLength: 10 }), leaf, { minKeys: 1, maxKeys: 5 })
    .map(dict => {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dict)) {
        try {
          obj[k] = JSON.parse(v);
        } catch {
          obj[k] = v;
        }
      }
      return JSON.stringify(obj);
    });
}

/** Generate a random AuthConfig for a specific auth type (or random if not specified). */
function arbAuthConfig(type?: AuthType): fc.Arbitrary<AuthConfig> {
  const arbType = type ? fc.constant(type) : fc.constantFrom(...AUTH_TYPES);

  return arbType.chain((t): fc.Arbitrary<AuthConfig> => {
    switch (t) {
      case 'none':
        return fc.constant({ type: 'none' });
      case 'basic':
        return fc.record({
          type: fc.constant('basic' as const),
          basic: fc.record({
            username: fc.string({ minLength: 1, maxLength: 20 }),
            password: fc.string({ minLength: 1, maxLength: 20 }),
          }),
        });
      case 'bearer':
        return fc.record({
          type: fc.constant('bearer' as const),
          bearer: fc.record({
            token: fc.string({ minLength: 1, maxLength: 60 }),
          }),
        });
      case 'apiKey':
        return fc.record({
          type: fc.constant('api-key' as const),
          apiKey: fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.string({ minLength: 1, maxLength: 40 }),
            addTo: fc.constantFrom('header' as const, 'query' as const),
          }),
        });
      case 'oauth2':
        return fc.record({
          type: fc.constant('oauth2' as const),
          oauth2: fc.record({
            grantType: fc.constantFrom('authorization_code' as const, 'client_credentials' as const),
            authUrl: fc.constant('https://auth.example.com/authorize'),
            tokenUrl: fc.constant('https://auth.example.com/token'),
            clientId: fc.string({ minLength: 1, maxLength: 20 }),
            clientSecret: fc.string({ minLength: 1, maxLength: 20 }),
            scope: fc.string({ maxLength: 30 }),
            accessToken: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: undefined }),
          }),
        });
      case 'awsSigV4':
        return fc.record({
          type: fc.constant('aws-sigv4' as const),
          awsSigV4: fc.record({
            accessKey: fc.string({ minLength: 1, maxLength: 20 }),
            secretKey: fc.string({ minLength: 1, maxLength: 40 }),
            region: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-1234567890'.split('')), { minLength: 5, maxLength: 15 }),
            service: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 10 }),
          }),
        });
      default:
        return fc.constant({ type: 'none' });
    }
  });
}

/** Generate a random ApiRequest with optional overrides. */
function arbApiRequest(
  overrides: Partial<{
    method: fc.Arbitrary<HttpMethod>;
    bodyType: fc.Arbitrary<BodyType>;
    auth: fc.Arbitrary<AuthConfig>;
    headers: fc.Arbitrary<KeyValue[]>;
    url: fc.Arbitrary<string>;
  }> = {},
): fc.Arbitrary<ApiRequest> {
  const methodArb = overrides.method ?? fc.constantFrom(...HTTP_METHODS);
  const bodyTypeArb = overrides.bodyType ?? fc.constantFrom(...BODY_TYPES);
  const authArb = overrides.auth ?? arbAuthConfig();
  const headersArb = overrides.headers ?? fc.array(arbKeyValue(), { maxLength: 4 });
  const urlArb = overrides.url ?? fc.webUrl();

  return fc
    .tuple(fc.uuid(), fc.string({ minLength: 1, maxLength: 30 }), methodArb, urlArb, headersArb, bodyTypeArb, authArb)
    .chain(([id, name, method, url, hdrs, bodyType, auth]) => {
      const bodyArb = arbRequestBody(bodyType);
      return bodyArb.map(
        (body): ApiRequest => ({
          id,
          name,
          method,
          url,
          params: [],
          headers: hdrs,
          body,
          auth,
        }),
      );
    });
}

/** Generate a RequestBody for a given body type. */
function arbRequestBody(type: BodyType): fc.Arbitrary<RequestBody> {
  switch (type) {
    case 'none':
      return fc.constant({ type: 'none' });
    case 'json':
      return arbJsonBody().map(raw => ({ type: 'json' as const, raw }));
    case 'raw':
      return fc.string({ maxLength: 200 }).map(raw => ({ type: 'raw' as const, raw }));
    case 'xml':
      return fc.constant({ type: 'xml' as const, raw: '<root><item>value</item></root>' });
    case 'graphql':
      return fc.record({
        type: fc.constant('graphql' as const),
        graphql: fc.record({
          query: fc.constant('{ users { id name } }'),
          variables: fc.oneof(arbJsonBody(), fc.constant('{}')),
        }),
      });
    case 'form-data':
      return arbFormDataItems().map(items => ({
        type: 'form-data' as const,
        formData: items.filter(i => i.fieldType === 'text'),
        formDataFiles: items,
      }));
    case 'x-www-form-urlencoded':
      return fc.array(arbKeyValue(), { minLength: 1, maxLength: 4 }).map(fields => ({
        type: 'x-www-form-urlencoded' as const,
        formData: fields,
      }));
    case 'binary':
      return fc.record({
        type: fc.constant('binary' as const),
        binaryPath: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        binaryName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
      });
    default:
      return fc.constant({ type: 'none' });
  }
}

// ---------------------------------------------------------------------------
// Smoke test — verifies the test infrastructure works
// ---------------------------------------------------------------------------

describe('codeGen test infrastructure', () => {
  it('generateCode returns a non-empty string for all languages', () => {
    const req: ApiRequest = {
      id: 'test-1',
      name: 'Test Request',
      method: 'GET',
      url: 'https://api.example.com/users',
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: { type: 'none' },
    };

    for (const lang of LANGUAGES) {
      const code = generateCode(req, lang.value, null);
      expect(code).toBeTruthy();
      expect(typeof code).toBe('string');
    }
  });

  it('arbitraries produce valid ApiRequest objects', () => {
    fc.assert(
      fc.property(arbApiRequest(), arbCodeLanguage(), (req, lang) => {
        const code = generateCode(req, lang, null);
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 },
    );
  });
});
