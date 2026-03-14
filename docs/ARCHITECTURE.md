# Architecture

This document explains how Open Post is structured at a technical level — the two-process design, how they communicate, how data is stored, and how each subsystem works.

---

## Overview

Open Post consists of **two distinct runtime environments** that are compiled separately and can only communicate by passing messages:

```
┌────────────────────────────────────────────────────────────────┐
│                        VS Code Host Process                     │
│                                                                │
│  ┌─────────────────────┐  postMessage()  ┌──────────────────┐  │
│  │   Extension         │ ◄─────────────► │   WebView Panel  │  │
│  │   (Node.js/CJS)     │                 │   (React/Browser)│  │
│  └──────────┬──────────┘                 └──────────────────┘  │
│             │                                                  │
│   ┌─────────┴────────────────────────────┐                     │
│   │           Core Services              │                     │
│   │  httpClient  │  authHandler          │                     │
│   │  sandbox     │  openApiParser        │                     │
│   │  fileStore   │  interpolation        │                     │
│   └─────────────────────────────────────┘                     │
│             │                                                  │
│   ┌─────────┴────────┐                                         │
│   │   .openpost/     │  (workspace filesystem)                 │
│   │  collections.json│                                         │
│   │  environments.json│                                        │
│   │  history.json    │                                         │
│   │  snapshots.json  │                                         │
│   └──────────────────┘                                         │
└────────────────────────────────────────────────────────────────┘
```

---

## The Two TypeScript Projects

### 1. Extension (Node.js)

| Property | Value |
|---|---|
| Entry point | `src/extension.ts` |
| TypeScript config | `tsconfig.json` (root) |
| Build tool | `esbuild` |
| Output | `dist/extension.js` |
| Module format | CommonJS (`cjs`) |
| Runtime | Node.js (inside VS Code host process) |
| Access to | File system, network, OS keychain, full VS Code API |

### 2. WebView (Browser)

| Property | Value |
|---|---|
| Entry point | `src/webview/src/main.tsx` |
| TypeScript config | `src/webview/tsconfig.json` |
| Build tool | Vite |
| Output | `dist/webview/` |
| Module format | ESModules |
| Runtime | Chromium WebView (sandboxed browser context) |
| Access to | React DOM, limited browser APIs, no Node.js |

These two cannot import from each other. All communication goes through `postMessage` / `onDidReceiveMessage`.

---

## Message Protocol

All messages are typed in `src/core/types.ts` and mirrored in `src/webview/src/types/messages.ts`.

### WebView → Extension (`MessageToExtension`)

| Message type | Payload | Description |
|---|---|---|
| `sendRequest` | `ApiRequest`, `sslVerification?` | Execute an HTTP request |
| `saveRequest` | `{ collectionId, folderId?, folderPath?, request }` | Upsert a request into a collection/folder |
| `loadCollections` | — | Request all collections data |
| `loadEnvironments` | — | Request all environments + active env |
| `loadHistory` | — | Request all history entries |
| `saveEnvironment` | `Environment` | Create or update an environment |
| `deleteEnvironment` | `id` | Remove an environment |
| `setActiveEnvironment` | `id \| null` | Change the active environment |
| `createCollection` | `name` | Create a new empty collection |
| `deleteCollection` | `id` | Remove a collection |
| `deleteRequest` | `collectionId, requestId, folderPath?` | Remove one saved endpoint and cascade-delete matching history (method + URL + name) |
| `runPreRequestScript` | `script, request` | Execute a pre-request script |
| `runTestScript` | `script, request, response` | Execute a test script |
| `pickFile` | `purpose` | Open VS Code file picker |
| `clearHistory` | — | Wipe all history |
| `deleteHistory` | `id` | Remove a single history entry |
| `loadSnapshots` | — | Request all snapshots data |
| `saveSnapshot` | `name?, baseRequest` | Create or update a named snapshot contract |
| `addSnapshotRecord` | `snapshotId, request, response` | Add a request/response record to a snapshot |
| `deleteSnapshot` | `id` | Remove a snapshot and all its records |
| `deleteSnapshotRecord` | `snapshotId, recordId` | Remove a single record from a snapshot |
| `renameSnapshot` | `id, name` | Rename an existing snapshot |
| `resolveContractVariantPrompt` | `promptId, save` | Confirm whether a newly detected response structure should be saved to contract |

### Extension → WebView (`MessageToWebview`)

| Message type | Payload | Description |
|---|---|---|
| `response` | `ApiResponse` | HTTP response data |
| `error` | `message` | Error string |
| `collections` | `Collection[]` | Full collections array |
| `environments` | `Environment[]` | Full environments array |
| `activeEnvironment` | `id \| null` | Currently selected environment ID |
| `history` | `HistoryEntry[]` | Full history array |
| `filePicked` | `purpose, filePath, fileName` | Result of file picker |
| `snapshots` | `Snapshot[]` | Full snapshots array (sent after any mutation or on `loadSnapshots`) |
| `contractVariantPrompt` | `ContractVariantPrompt` | Prompt for saving a newly detected unique response structure |

### Special: Load Request

When a user clicks a saved request in the sidebar tree, the extension sends a non-standard message:
```typescript
{ type: 'loadRequest'; data: ApiRequest; collectionId: string | null }
```
This populates the request builder with the saved request's values.

---

## Data Flow: Sending a Request

Tracing what happens from the moment the user clicks "Send":

```
[WebView] User clicks Send
    │
    ▼
RequestBuilder.tsx
  → requestStore.toApiRequest()    builds ApiRequest from store
  → postMessage({ type: 'sendRequest', data: req, sslVerification })
    │
    │ (crosses the WebView/Extension boundary)
    ▼
webviewProvider.ts → handleMessage({ type: 'sendRequest' })
    │
    ├─ store.loadEnvironments()          read all environments from disk
    ├─ Build envVars{}                   filter active env enabled variables
    ├─ applyAuth(request, envVars)       → authHandler.ts
    │     injects headers/params for Basic/Bearer/ApiKey/OAuth2/AWS
    │
    ├─ runScript(preRequestScript, ...)  → sandbox.ts (if script exists)
    │     runs user JS in vm.createContext()
    │     applies any request mutations or env updates
    │
    ├─ executeRequest(request, envVars, ssl)  → httpClient.ts
    │     interpolate {{vars}} in URL/headers/body
    │     build query string
    │     serialize body (JSON, form, multipart, etc.)
    │     Node.js https.request()
    │     measure time + size
    │     returns ApiResponse
    │
    ├─ runScript(testScript, ...)        → sandbox.ts (if script exists)
    │     assertions, env.set() calls
    │     logs appended to response body
    │
    ├─ store.saveHistory(...)            persist to .openpost/history.json
    ├─ postMessage({ type: 'history' })  refresh history state in the webview
    ├─ store.loadSnapshots()             find snapshot whose baseRequest.id matches request.id
    ├─ store.saveSnapshots(...)          append automatic snapshot record for saved requests
    ├─ postMessage({ type: 'snapshots' }) refresh snapshot state in the webview
    ├─ notifyDataChanged()               refresh all sidebar trees (including Snapshots)
    │
    ▼
postMessage({ type: 'response', data: ApiResponse })
    │
    │ (crosses boundary)
    ▼
[WebView] App.tsx → onMessage handler
    → appStore.setResponse(data)     Zustand state update
    → appStore.setLoading(false)
    │
    ▼
ResponseViewer.tsx re-renders with response data
```

---

## Storage Layer (`src/storage/fileStore.ts`)

All persistent data is stored in the **workspace root** under `.openpost/`:

```
your-workspace/
└── .openpost/
    ├── collections.json    → All collections, folders, and requests
    ├── config.json         → Tab settings (tabViewCollapsed, tabGrouping, subtleContracts) + active env ID
    ├── environments.json   → All environments and their variables
    ├── history.json        → All history entries (request + response pairs)
    └── snapshots.json      → All snapshot contracts and their records
```

The storage path is resolved at call time:
```typescript
function getStoragePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return path.join(folders[0].uri.fsPath, '.openpost');
}
```

If no workspace folder is open, all load functions return empty arrays and save functions are no-ops.

### Functions

| Function | Returns | Description |
|---|---|---|
| `loadCollections()` | `Collection[]` | Read collections.json |
| `saveCollections(data)` | `void` | Write collections.json |
| `loadEnvironments()` | `Environment[]` | Read environments.json |
| `saveEnvironments(data)` | `void` | Write environments.json |
| `loadHistory()` | `HistoryEntry[]` | Read history.json |
| `saveHistory(data)` | `void` | Write history.json (capped at 500 entries) |
| `loadActiveEnvironmentId()` | `string \| null` | Read active env ID |
| `saveActiveEnvironmentId(id)` | `void` | Write active env ID |
| `loadSnapshots()` | `Snapshot[]` | Read snapshots.json |
| `saveSnapshots(data)` | `void` | Write snapshots.json (capped: 200 snapshots, 100 records each) |
| `loadTabSettings()` | `{ tabViewCollapsed, tabGrouping, subtleContracts }` | Read tab settings from config.json (defaults to `false` for missing keys) |
| `saveTabSetting(key, value)` | `void` | Write a single tab setting key to config.json |

### Snapshot lifecycle

- Saving a request into a collection auto-creates a snapshot contract if one does not already exist for that saved request `id`.
- Sending that saved request auto-appends a `SnapshotRecord` to the matching snapshot.
- Manual snapshot creation still exists, but the webview requires the request to be saved in a collection first.
- Snapshot matching is by `baseRequest.id`, not by URL text, so renamed or edited saved requests continue writing to the same snapshot contract.

---

## State Management (WebView — Zustand)

The WebView uses two Zustand stores. Zustand stores are plain objects — components subscribe to individual slices using selector functions.

### `appStore` — Global Application State

Manages everything that is application-wide (not specific to the current request being edited).

| Field | Type | Description |
|---|---|---|
| `response` | `ApiResponse \| null` | The latest HTTP response |
| `viewedHistoryId` | `string \| null` | Which history entry is being viewed in the diff mode |
| `loading` | `boolean` | Request is currently in-flight |
| `error` | `string \| null` | Error message to display |
| `environments` | `Environment[]` | All environments |
| `activeEnvironmentId` | `string \| null` | The selected environment |
| `collections` | `Collection[]` | All collections |
| `history` | `HistoryEntry[]` | All history entries |
| `responseTab` | `'body' \| 'headers'` | Active tab in response panel |
| `bodyViewMode` | `'pretty' \| 'raw' \| 'tree'` | Body formatting mode |
| `sidebarTab` | `SidebarTab` | Active sidebar panel (`'collections' \| 'environments' \| 'history' \| 'snapshots'`) |
| `sidebarCollapsed` | `boolean` | Sidebar visibility |
| `sidebarWidth` | `number` | Sidebar width in pixels |
| `sidebarSearch` | `string` | Sidebar search query |
| `splitRatio` | `number` | Vertical split ratio (0–1) |
| `showCodePanel` | `boolean` | Code/prompt panel visibility |
| `codePanelRatio` | `number` | Code panel width ratio |
| `sslVerification` | `boolean` | Whether to verify SSL certificates |
| `toasts` | `Toast[]` | Active notification toasts |
| `confirmDialog` | `ConfirmDialog \| null` | Active confirm modal |
| `snapshots` | `Snapshot[]` | All snapshot contracts |
| `viewedSnapshotRecord` | `{ snapshotId: string; record: SnapshotRecord } \| null` | The record currently being viewed in the response panel (drives the snapshot banner) |
| `subtleContracts` | `boolean` | When `true`, contract variant prompts use an inline indicator instead of a modal dialog (default `false`) |
| `pendingContractPrompt` | `ContractVariantPrompt \| null` | The pending contract variant prompt stored for inline resolution when subtle mode is on |

### `requestStore` — Current Request Being Edited

Manages all fields of the request that is currently open in the builder.

| Field | Type | Description |
|---|---|---|
| `method` | `HttpMethod` | HTTP verb |
| `url` | `string` | URL (may contain `{{vars}}`) |
| `params` | `KeyValue[]` | Query parameters |
| `headers` | `KeyValue[]` | Request headers |
| `body` | `RequestBody` | Body content and type |
| `auth` | `AuthConfig` | Authentication config |
| `name` | `string` | Request display name |
| `preRequestScript` | `string` | Pre-request JS |
| `testScript` | `string` | Test JS |
| `sourceRequestId` | `string \| null` | ID if loaded from a collection |
| `sourceCollectionId` | `string \| null` | Collection ID if loaded from a collection |

Key store methods:
- `toApiRequest()` — serialises the store into an `ApiRequest` object ready to send
- `loadRequest(req, collectionId)` — populates the store from a saved `ApiRequest`
- `reset()` — clears all fields to defaults

---

## VS Code Tree Providers

Three sidebar trees are registered in the Activity Bar under the `open-post` view container:

| Class | View ID | Handles |
|---|---|---|
| `CollectionTreeProvider` | `openPost.collections` | Collections, folders, requests |
| `EnvironmentTreeProvider` | `openPost.environments` | Environments + active indicator |
| `HistoryTreeProvider` | `openPost.history` | Recent request/response pairs |
| `SnapshotTreeProvider` | `openPost.snapshots` | Snapshot contracts and their records |

Each implements `vscode.TreeDataProvider<TreeItem>`. When `OpenPostPanel.onDataChanged()` fires (after any data-writing operation), all four trees call `refresh()` which fires `_onDidChangeTreeData` to tell VS Code to repaint.

Context-menu commands (right-click) are declared in `package.json` under `contributes.menus["view/item/context"]` with `when` clauses that match `viewItem` values.

---

## Authentication (`src/auth/authHandler.ts`)

`applyAuth(request, envVars)` returns `{ headers, queryParams }` to inject, without mutating the original request.

| Auth Type | Mechanism |
|---|---|
| **Basic** | `btoa(username:password)` → `Authorization: Basic <b64>` |
| **Bearer** | `Authorization: Bearer <token>` |
| **API Key — header** | Adds `<key>: <value>` header |
| **API Key — query** | Adds `?key=value` query parameter |
| **OAuth 2.0 Client Credentials** | POSTs to token URL → bearer token injected |
| **OAuth 2.0 Authorization Code** | Opens browser → local redirect server captures code → exchanges for token |
| **AWS SigV4** | Signs request with HMAC-SHA256 → `Authorization`, `X-Amz-Date` headers |

All `{{variable}}` placeholders in auth fields are interpolated before use.

---

## Scripting Sandbox (`src/scripting/sandbox.ts`)

User scripts are executed in a Node.js `vm.createContext()` — a completely isolated V8 context:

```typescript
const sandbox = {
  request: { /* copy of ApiRequest fields */ },
  response: { /* copy of ApiResponse, undefined in pre-request */ },
  environment: {
    get: (key: string) => envVars[key],
    set: (key: string, value: string) => { environmentUpdates[key] = value; },
  },
  console: {
    log: (...args: unknown[]) => { logs.push(args.map(String).join(' ')); },
    assert: (cond: boolean, msg: string) => { if (!cond) logs.push(`ASSERTION FAILED: ${msg}`); },
  },
};

vm.runInContext(script, vm.createContext(sandbox), { timeout: 5000 });
```

The script can:
- Read and modify `request` fields
- Call `environment.get/set`
- Call `console.log/assert`

The script cannot:
- Call `require()`
- Access `process`, `fs`, or any Node.js globals
- Run for more than 5 seconds

The returned object includes `updatedRequest`, `environmentUpdates`, and `logs`.

---

## HTTP Client (`src/core/httpClient.ts`)

`executeRequest(request, envVars, sslVerification)` uses only Node.js built-in modules:

1. **Interpolate** `{{variables}}` in URL, headers, body via `interpolation.ts`
2. **Build URL** — append enabled query params as `?key=value&...`
3. **Serialize body** — JSON string, URL-encoded, multipart (with `form-data` streams), base64 binary, etc.
4. **Create request** — `https.request()` or `http.request()` depending on protocol
5. **SSL** — if `sslVerification = false`, sets `rejectUnauthorized: false`
6. **Measure time** — `Date.now()` before and after
7. **Return** `ApiResponse` with `status`, `statusText`, `headers`, `body`, `time`, `size`

---

## Code & Prompt Generation (`src/webview/src/utils/`)

### `codeGen.ts` — `generateCode(req, lang, response?, envVars?)`

Produces a runnable code snippet by:
1. Interpolating env vars into the request clone
2. Building the final URL + query string
3. Serialising headers and body to strings
4. Calling the language-specific generator function
5. Appending a `sampleComment()` block if a response is available

Supported target languages: `curl`, `javascript-fetch`, `javascript-axios`, `python-requests`, `python-http`, `go`, `java`, `csharp`, `ruby`, `php`, `rust`, `swift`

### `promptGen.ts` — `generatePrompt(req, dialect, response?, envVars?)`

Builds a structured natural-language prompt describing the request for use with AI assistants. Dialects: `explain`, `write-integration`, `debug`, `write-tests`, `generate-docs`.

---

## How the WebView HTML is Served

The extension reads the Vite-built `dist/webview/index.html` and rewrites all relative asset paths to VS Code WebView URIs (which use the `vscode-webview://` scheme):

```typescript
// webviewProvider.ts → getHtml()
let html = fs.readFileSync(indexPath.fsPath, 'utf-8');
const baseUri = webview.asWebviewUri(distPath);
html = html.replace(/(href|src)="\.?\/?/g, `$1="${baseUri}/`);
return html;
```

This is necessary because WebView contexts have a special URI scheme and can't resolve regular relative paths. Vite is configured to output **deterministic filenames without content hashes** (e.g., `assets/main.js` not `assets/main.a1b2c3.js`) so the regex replacement is stable across builds.
