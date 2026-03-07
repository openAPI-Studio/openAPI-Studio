# Internal API Reference

All TypeScript types, message shapes, store actions, and utility function signatures used across the project. This is the authoritative source when two parts of the codebase need to agree on a contract.

---

## Table of Contents

- [Core Types](#core-types)
- [Message Protocol](#message-protocol)
- [Zustand Store API](#zustand-store-api)
- [Code Generation API](#code-generation-api)
- [Prompt Generation API](#prompt-generation-api)
- [cURL Parser API](#curl-parser-api)
- [OpenAPI Parser API](#openapi-parser-api)
- [HTTP Client API](#http-client-api)
- [Auth Handler API](#auth-handler-api)
- [Scripting Sandbox API](#scripting-sandbox-api)
- [Storage API](#storage-api)
- [Interpolation API](#interpolation-api)

---

## Core Types

Defined in `src/core/types.ts` and mirrored in `src/webview/src/types/messages.ts`.

### `HttpMethod`

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

### `BodyType`

```typescript
type BodyType =
  | 'none'
  | 'json'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'raw'
  | 'xml'
  | 'graphql'
  | 'binary';
```

### `AuthType`

```typescript
type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'aws-sigv4';
```

### `KeyValue`

```typescript
interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;   // When false the row exists but is not sent
}
```

### `FormDataItem`

```typescript
// Extends KeyValue — used in multipart form bodies
interface FormDataItem extends KeyValue {
  fieldType: 'text' | 'file';
  filePath?: string;    // Absolute filesystem path (extension side only)
  fileName?: string;    // Display name shown in the UI
}
```

### `RequestBody`

```typescript
interface RequestBody {
  type: BodyType;

  // Used for: json | raw | xml
  raw?: string;

  // Used for: x-www-form-urlencoded
  formData?: KeyValue[];

  // Used for: form-data (file uploads)
  formDataFiles?: FormDataItem[];

  // Used for: graphql
  graphql?: {
    query: string;
    variables: string;   // JSON string of the variables object
  };

  // Used for: binary
  binaryPath?: string;   // Absolute path (extension side only)
  binaryName?: string;   // Display name
}
```

### `AuthConfig`

```typescript
interface AuthConfig {
  type: AuthType;

  basic?: {
    username: string;
    password: string;
  };

  bearer?: {
    token: string;
  };

  apiKey?: {
    key: string;                   // Header name or query param name
    value: string;                 // The key value
    addTo: 'header' | 'query';    // Where to inject it
  };

  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials';
    authUrl: string;       // Authorization endpoint
    tokenUrl: string;      // Token endpoint
    clientId: string;
    clientSecret: string;
    scope: string;
    accessToken?: string;  // Cached after a successful token exchange
  };

  awsSigV4?: {
    accessKey: string;   // AWS Access Key ID
    secretKey: string;   // AWS Secret Access Key
    region: string;      // e.g. 'us-east-1'
    service: string;     // e.g. 'execute-api', 's3'
  };
}
```

### `ApiRequest`

```typescript
interface ApiRequest {
  id: string;                  // UUID or timestamp string
  name: string;                // Human-readable label
  method: HttpMethod;
  url: string;                 // May contain {{variable}} placeholders
  params: KeyValue[];          // Query parameters
  headers: KeyValue[];         // Request headers
  body: RequestBody;
  auth: AuthConfig;
  preRequestScript?: string;   // JS executed before the request
  testScript?: string;         // JS executed after the response arrives
}
```

### `ApiResponse`

```typescript
interface ApiResponse {
  status: number;                      // HTTP status code, e.g. 200
  statusText: string;                  // e.g. 'OK', 'Not Found'
  headers: Record<string, string>;     // Response header map
  body: string;                        // Raw response body as a string
  time: number;                        // Round-trip time in milliseconds
  size: number;                        // Body size in bytes
}
```

### `Environment`

```typescript
interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];   // The variable pairs
}
```

### `CollectionFolder`

```typescript
interface CollectionFolder {
  id: string;
  name: string;
  requests: ApiRequest[];
  folders: CollectionFolder[];   // Recursively nested sub-folders
}
```

### `Collection`

```typescript
interface Collection {
  id: string;
  name: string;
  folders: CollectionFolder[];   // Folder children
  requests: ApiRequest[];        // Top-level requests (not in folders)
  variables: KeyValue[];         // Collection-level variables
}
```

### `HistoryEntry`

```typescript
interface HistoryEntry {
  id: string;
  timestamp: number;       // Unix epoch milliseconds
  request: ApiRequest;     // Snapshot of the request as sent
  response: ApiResponse;   // Full response received
}
```

### `SnapshotRecord`

```typescript
interface SnapshotRecord {
  id: string;
  timestamp: number;       // Unix epoch milliseconds — when this record was captured
  request: ApiRequest;     // The request as it was at capture time
  response: ApiResponse;   // The response received at capture time
}
```

### `Snapshot`

```typescript
interface Snapshot {
  id: string;
  name: string;               // User-supplied or auto-generated: "{requestName} {datetime}"
  createdAt: number;          // Unix epoch milliseconds
  baseRequest: ApiRequest;    // The canonical API contract definition
  records: SnapshotRecord[];  // Ordered list of captured request/response pairs
}
```

---

## Message Protocol

### `MessageToWebview` — Extension → WebView

```typescript
type MessageToWebview =
  | { type: 'response';          data: ApiResponse }
  | { type: 'error';             message: string }
  | { type: 'environments';      data: Environment[] }
  | { type: 'collections';       data: Collection[] }
  | { type: 'history';           data: HistoryEntry[] }
  | { type: 'activeEnvironment'; id: string | null }
  | { type: 'filePicked';        purpose: string; filePath: string; fileName: string }
  | { type: 'snapshots';         data: Snapshot[] };
```

There is also a non-protocol message sent when a saved request is clicked in the sidebar tree:

```typescript
// Sent directly during openPost.openRequest command
{ type: 'loadRequest'; data: ApiRequest; collectionId: string | null }
```

### `MessageToExtension` — WebView → Extension

```typescript
type MessageToExtension =
  | { type: 'sendRequest';          data: ApiRequest; sslVerification?: boolean }
  | { type: 'saveRequest';          data: { collectionId: string; folderId?: string; request: ApiRequest } }
  | { type: 'loadCollections' }
  | { type: 'loadEnvironments' }
  | { type: 'saveEnvironment';      data: Environment }
  | { type: 'deleteEnvironment';    id: string }
  | { type: 'setActiveEnvironment'; id: string | null }
  | { type: 'loadHistory' }
  | { type: 'createCollection';     name: string }
  | { type: 'deleteCollection';     id: string }
  | { type: 'runPreRequestScript';  script: string; request: ApiRequest }
  | { type: 'runTestScript';        script: string; request: ApiRequest; response: ApiResponse }
  | { type: 'pickFile';             purpose: string }
  | { type: 'clearHistory' }
  | { type: 'deleteHistory';        id: string }
  | { type: 'loadSnapshots' }
  | { type: 'saveSnapshot';         name?: string; baseRequest: ApiRequest }
  | { type: 'addSnapshotRecord';    snapshotId: string; request: ApiRequest; response: ApiResponse }
  | { type: 'deleteSnapshot';       id: string }
  | { type: 'deleteSnapshotRecord'; snapshotId: string; recordId: string }
  | { type: 'renameSnapshot';       id: string; name: string };
```

### Snapshot behavior notes

- `saveRequest` now has snapshot side effects: when a request is saved into a collection, the extension auto-creates a snapshot contract for that saved request if one does not already exist.
- `sendRequest` also has snapshot side effects for saved requests: after history is written, a matching snapshot record is appended automatically when `request.id === snapshot.baseRequest.id`.
- `saveSnapshot` now behaves like an upsert for a saved request: it updates the existing snapshot contract if one already exists for that request id.
- `deleteHistory` removes a single entry from `.openpost/history.json` and the updated history array is pushed back to the webview immediately.

### Sending a Message from WebView

```typescript
import { postMessage } from '../types/messages';

postMessage({ type: 'loadCollections' });
postMessage({ type: 'sendRequest', data: apiRequest, sslVerification: true });
```

`postMessage` is a thin wrapper around `acquireVsCodeApi().postMessage()` that is typed to `MessageToExtension`.

### Receiving a Message in WebView

```typescript
// App.tsx — inside useEffect on mount
const handler = (event: MessageEvent) => {
  const msg = event.data as MessageToWebview;
  switch (msg.type) {
    case 'response':
      setResponse(msg.data);
      break;
    // ...
  }
};
window.addEventListener('message', handler);
return () => window.removeEventListener('message', handler);
```

---

## Zustand Store API

### `useAppStore` — `src/webview/src/stores/appStore.ts`

**Selector pattern (recommended):**
```typescript
const response = useAppStore((s) => s.response);
const loading  = useAppStore((s) => s.loading);
```

**Imperative access (outside React components):**
```typescript
useAppStore.getState().addToast({ type: 'success', message: 'Saved!' });
```

**Full action surface:**

| Action | Signature |
|---|---|
| `setResponse` | `(r: ApiResponse \| null) => void` |
| `setViewedHistoryId` | `(id: string \| null) => void` |
| `setLoading` | `(l: boolean) => void` |
| `setError` | `(e: string \| null) => void` |
| `setEnvironments` | `(e: Environment[]) => void` |
| `setActiveEnvironmentId` | `(id: string \| null) => void` |
| `setCollections` | `(c: Collection[]) => void` |
| `setHistory` | `(h: HistoryEntry[]) => void` |
| `setResponseTab` | `(t: 'body' \| 'headers') => void` |
| `setBodyViewMode` | `(m: 'pretty' \| 'raw' \| 'tree') => void` |
| `setSidebarTab` | `(t: 'collections' \| 'environments' \| 'history' \| 'snapshots') => void` |
| `setSidebarCollapsed` | `(v: boolean) => void` |
| `setSidebarWidth` | `(v: number) => void` |
| `setSidebarSearch` | `(v: string) => void` |
| `setSplitRatio` | `(v: number) => void` |
| `setShowCodePanel` | `(v: boolean) => void` |
| `setCodePanelRatio` | `(v: number) => void` |
| `setSslVerification` | `(v: boolean) => void` |
| `addToast` | `(t: Omit<Toast, 'id'>) => void` |
| `removeToast` | `(id: string) => void` |
| `showConfirm` | `(d: ConfirmDialog) => void` |
| `hideConfirm` | `() => void` |
| `setSnapshots` | `(s: Snapshot[]) => void` |
| `setViewedSnapshotRecord` | `(v: { snapshotId: string; record: SnapshotRecord } \| null) => void` |

**Toast shape:**
```typescript
interface Toast {
  id: string;                         // Auto-generated UUID
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;                  // ms until auto-dismiss
}
```

**ConfirmDialog shape:**
```typescript
interface ConfirmDialog {
  title: string;
  message: string;
  onConfirm: () => void;   // Called when user clicks Confirm
}
```

### `useRequestStore` — `src/webview/src/stores/requestStore.ts`

**Key methods:**

| Method | Description |
|---|---|
| `toApiRequest()` | Serialise current store state into an `ApiRequest` object |
| `loadRequest(req, collectionId)` | Populate the store from a saved `ApiRequest` |
| `reset()` | Clear all fields to defaults |

**State fields:**

| Field | Type | Default |
|---|---|---|
| `method` | `HttpMethod` | `'GET'` |
| `url` | `string` | `''` |
| `params` | `KeyValue[]` | `[]` |
| `headers` | `KeyValue[]` | `[]` |
| `body` | `RequestBody` | `{ type: 'none' }` |
| `auth` | `AuthConfig` | `{ type: 'none' }` |
| `name` | `string` | `'New Request'` |
| `preRequestScript` | `string` | `''` |
| `testScript` | `string` | `''` |
| `sourceRequestId` | `string \| null` | `null` |
| `sourceCollectionId` | `string \| null` | `null` |

---

## Code Generation API

`src/webview/src/utils/codeGen.ts`

### `generateCode`

```typescript
function generateCode(
  req: ApiRequest,
  lang: CodeLanguage,
  response?: ApiResponse | null,
  envVars?: Record<string, string>
): string
```

Produces a runnable code snippet. `response` is used to append a sample response comment. `envVars` causes `{{variable}}` placeholders to be interpolated in the output.

### `CodeLanguage`

```typescript
type CodeLanguage =
  | 'curl'
  | 'javascript-fetch'
  | 'javascript-axios'
  | 'python-requests'
  | 'python-http'
  | 'go'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'rust'
  | 'swift';
```

### `LANGUAGES`

```typescript
const LANGUAGES: { value: CodeLanguage; label: string }[]
// Use for populating the language selector dropdown
```

---

## Prompt Generation API

`src/webview/src/utils/promptGen.ts`

### `generatePrompt`

```typescript
function generatePrompt(
  req: ApiRequest,
  dialect: PromptDialect,
  response?: ApiResponse | null,
  envVars?: Record<string, string>
): string
```

Returns a structured plain-text prompt ready to paste into an AI assistant.

### `PromptDialect`

```typescript
type PromptDialect =
  | 'explain'
  | 'write-integration'
  | 'debug'
  | 'write-tests'
  | 'generate-docs';
```

### `PROMPT_DIALECTS`

```typescript
const PROMPT_DIALECTS: { value: PromptDialect; label: string }[]
```

---

## cURL Parser API

`src/core/curlParser.ts` (extension) / `src/webview/src/types/curlParser.ts` (webview)

### `parseCurl`

```typescript
function parseCurl(input: string): ParsedCurl | null
```

Returns `null` if the input does not start with `curl`. Otherwise:

```typescript
interface ParsedCurl {
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
}
```

---

## OpenAPI Parser API

`src/core/openApiParser.ts`

### `parseOpenApiSpec`

```typescript
function parseOpenApiSpec(content: string, fileName: string): OpenApiImportResult
```

`content` is raw file text (JSON or YAML). `fileName` is used to determine the spec name.

```typescript
interface OpenApiImportResult {
  collection: Collection;        // All endpoints organised into tag-named folders
  environment: {
    name: string;                // e.g. 'Petstore Environment'
    variables: KeyValue[];       // base_url + all path param names
  };
  requestCount: number;          // Total number of requests imported
}
```

Throws an `Error` if the content cannot be parsed or is neither Swagger 2.0 nor OpenAPI 3.x.

---

## HTTP Client API

`src/core/httpClient.ts`

### `executeRequest`

```typescript
async function executeRequest(
  request: ApiRequest,
  envVars: Record<string, string>,
  sslVerification: boolean
): Promise<ApiResponse>
```

- Interpolates all `{{variables}}` using `envVars` before building the request
- Appends enabled query params to the URL
- Serialises the body based on `request.body.type`
- Uses `https.request()` or `http.request()` depending on the URL scheme
- If `sslVerification` is `false`, sets `rejectUnauthorized: false` on the TLS socket
- Throws on network errors (DNS failure, connection refused, timeout, etc.)

---

## Auth Handler API

`src/auth/authHandler.ts`

### `applyAuth`

```typescript
function applyAuth(
  request: ApiRequest,
  envVars: Record<string, string>
): { headers: Record<string, string>; queryParams: Record<string, string> }
```

Returns headers and query params to inject without mutating `request`. Called in `webviewProvider.ts` before `executeRequest`.

All `{{variable}}` placeholders inside auth fields (token, username, etc.) are resolved using `envVars`.

---

## Scripting Sandbox API

`src/scripting/sandbox.ts`

### `runScript`

```typescript
function runScript(
  script: string,
  context: {
    request: ApiRequest;
    response?: ApiResponse;          // undefined in pre-request scripts
    environment: Record<string, string>;
  }
): ScriptResult
```

```typescript
interface ScriptResult {
  updatedRequest?: ApiRequest;              // If the script mutated request fields
  environmentUpdates?: Record<string, string>;  // Calls to environment.set()
  logs: string[];                           // console.log / console.assert output
  error?: string;                           // If the script threw an exception
}
```

Runs inside `vm.createContext()`. Execution is limited to **5 000 ms**.

---

## Storage API

`src/storage/fileStore.ts`

All functions resolve the `.openpost/` directory from `vscode.workspace.workspaceFolders[0]`. They are no-ops (return empty) when no workspace folder is open.

```typescript
function loadCollections(): Collection[]
function saveCollections(data: Collection[]): void

function loadEnvironments(): Environment[]
function saveEnvironments(data: Environment[]): void

function loadHistory(): HistoryEntry[]
function saveHistory(data: HistoryEntry[]): void

function loadActiveEnvironmentId(): string | null
function saveActiveEnvironmentId(id: string | null): void

function loadSnapshots(): Snapshot[]
function saveSnapshots(data: Snapshot[]): void
// Caps at 200 snapshots; each snapshot is capped at 100 records.
// Older entries beyond these limits are trimmed on save.
```

Implementation note: history is persisted on every send, then immediately reposted to the webview so response-history controls stay in sync without requiring a reload.

All data is stored as pretty-printed JSON for readability and git diff–friendliness.

---

## Interpolation API

`src/core/interpolation.ts`

### `interpolateVariables`

```typescript
function interpolateVariables(
  text: string,
  vars: Record<string, string>
): string
```

Replaces every `{{key}}` in `text` with `vars[key]`. If `key` is not present in `vars`, the original `{{key}}` text is left unchanged.

```typescript
interpolateVariables('Hello {{name}}!', { name: 'World' });
// → 'Hello World!'

interpolateVariables('Bearer {{token}}', {});
// → 'Bearer {{token}}' (unknown variable preserved)
```
