# Agents Guide

> A practical reference for AI agents, LLM tools, and automated systems working with the Open Post codebase.

---

## Table of Contents

1. [Project Identity](#project-identity)
2. [Repository Layout](#repository-layout)
3. [The Two Runtimes](#the-two-runtimes)
4. [Critical Files — Read First](#critical-files--read-first)
5. [Type System](#type-system)
6. [Message Protocol](#message-protocol)
7. [State Management](#state-management)
8. [Data Flow: Sending a Request](#data-flow-sending-a-request)
9. [Key Patterns](#key-patterns)
10. [Common Tasks](#common-tasks)
11. [Constraints & Rules](#constraints--rules)
12. [File Modification Guide](#file-modification-guide)
13. [Testing Checklist](#testing-checklist)
14. [Terminology Glossary](#terminology-glossary)

---

## Project Identity

| Property | Value |
|---|---|
| **Name** | Open Post (`open-post`) |
| **Type** | VS Code Extension |
| **Publisher** | `open-post` |
| **Entry point** | `src/extension.ts` |
| **Built output** | `dist/extension.js` + `dist/webview/` |
| **License** | MIT |
| **Min VS Code** | `^1.85.0` |

Open Post is a **fully offline API testing tool** embedded inside VS Code. It has no cloud dependency, no telemetry, and stores all user data as plain JSON files inside `.openpost/` in the workspace root.

---

## Repository Layout

```
open-post/
├── src/
│   ├── extension.ts              ← VS Code entry point — commands, tree providers
│   ├── auth/
│   │   └── authHandler.ts        ← Auth header/param injection (never mutates request)
│   ├── core/
│   │   ├── types.ts              ← ⭐ ALL shared types — read this first
│   │   ├── httpClient.ts         ← HTTP execution (Node.js built-ins only)
│   │   ├── curlParser.ts         ← cURL string → ApiRequest
│   │   ├── openApiParser.ts      ← OpenAPI/Swagger spec → Collection + Environment
│   │   ├── interpolation.ts      ← {{variable}} → resolved value
│   │   └── testRunner.ts         ← Evaluates TestRule[] against ApiResponse
│   ├── scripting/
│   │   └── sandbox.ts            ← vm.createContext() sandboxed user JS execution
│   ├── services/
│   │   ├── webviewProvider.ts    ← WebView panel + all message routing (THE BRIDGE)
│   │   ├── collectionTree.ts     ← VS Code TreeDataProvider: Collections sidebar
│   │   ├── environmentTree.ts    ← VS Code TreeDataProvider: Environments sidebar
│   │   ├── historyTree.ts        ← VS Code TreeDataProvider: History sidebar
│   │   └── snapshotTree.ts       ← VS Code TreeDataProvider: Snapshots sidebar
│   ├── storage/
│   │   └── fileStore.ts          ← Read/write .openpost/*.json
│   └── webview/                  ← Separate TypeScript project (React/ESM/browser)
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│           └── src/
│               ├── main.tsx          ← React root mount
│               ├── App.tsx           ← Layout + message listener
│               ├── components/       ← All UI components
│               ├── stores/           ← Zustand state (appStore, requestStore)
│               ├── types/            ← WebView-side type mirror + postMessage helper
│               ├── utils/            ← codeGen.ts, promptGen.ts
│               └── data/             ← Static header autocomplete data
├── docs/                         ← Documentation (you are here)
├── dist/                         ← Build output (gitignored)
├── .openpost/                    ← Runtime data (workspace-local)
│   ├── collections.json
│   ├── environments.json
│   ├── history.json
│   └── snapshots.json
├── package.json                  ← Extension manifest
├── tsconfig.json                 ← Extension-side TypeScript config
└── build.sh                      ← Build script
```

---

## The Two Runtimes

This is the most important architectural fact. There are **two completely separate TypeScript compilation units** that cannot import from each other.

### Runtime 1 — Extension (Node.js)

| Property | Value |
|---|---|
| Root | `src/` (excluding `src/webview/`) |
| Config | `tsconfig.json` at root |
| Format | CommonJS (`cjs`) |
| Built by | `esbuild` |
| Output | `dist/extension.js` |
| Has access to | VS Code API, file system, network, OS keychain |
| Entry | `src/extension.ts` |

### Runtime 2 — WebView (Browser/React)

| Property | Value |
|---|---|
| Root | `src/webview/src/` |
| Config | `src/webview/tsconfig.json` |
| Format | ESM |
| Built by | `vite` |
| Output | `dist/webview/` |
| Has access to | DOM, `acquireVsCodeApi()`, nothing else |
| Entry | `src/webview/src/main.tsx` |

### The Rule

> **Never import extension-side code into webview code, and never import webview code into extension code.**

Types that both sides need are duplicated:
- Extension side: `src/core/types.ts`
- WebView side: `src/webview/src/types/messages.ts`

If you add a type to one, manually mirror it in the other.

---

## Critical Files — Read First

Read these files in order before making any changes:

### 1. `src/core/types.ts`
Every shared interface and type union. `ApiRequest`, `ApiResponse`, `Collection`, `Environment`, `HistoryEntry`, `Snapshot`, `TestRule`, `SetVariable`, `MessageToExtension`, `MessageToWebview`. This is the contract.

### 2. `src/extension.ts`
All VS Code commands, all tree provider registrations, how `OpenPostPanel.onDataChanged` connects the panel to the sidebar trees. Short (~120 lines).

### 3. `src/services/webviewProvider.ts`
The most important file for system behaviour. `handleMessage()` routes every user action. Trace the `sendRequest` case to understand the full pipeline:
```
auth injection → pre-request script → HTTP call → test runner → history write → response dispatch
```

### 4. `src/webview/src/App.tsx`
WebView root. Handles all incoming `MessageToWebview` messages via `window.addEventListener('message', ...)`. Sends `loadCollections`, `loadEnvironments`, `loadHistory` on mount.

### 5. `src/webview/src/stores/appStore.ts` and `requestStore.ts`
Everything the WebView reads or writes flows through these two Zustand stores. Know what lives in each before touching any component.

---

## Type System

### Core Request Types

```typescript
// The request being edited or sent
interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;           // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  url: string;                  // May contain {{variable}} placeholders
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
  testRules?: TestRule[];
  setVariables?: SetVariable[];
}

// Every response
interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;                 // milliseconds
  size: number;                 // bytes
  cookies?: CookieEntry[];
  testResults?: TestResult[];
}

// A key-value row (params, headers, form fields)
interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}
```

### Body Types

```typescript
type BodyType =
  | 'none'
  | 'json'
  | 'raw'
  | 'xml'
  | 'graphql'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'binary';

interface RequestBody {
  type: BodyType;
  raw?: string;                    // json, raw, xml
  formData?: KeyValue[];           // x-www-form-urlencoded, form-data text fields
  formDataFiles?: FormDataItem[];  // form-data file fields
  graphql?: { query: string; variables: string };
  binaryPath?: string;
  binaryName?: string;
}
```

### Auth Types

```typescript
type AuthType = 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2' | 'awsSigV4';

interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials';
    authUrl: string; tokenUrl: string;
    clientId: string; clientSecret: string;
    scope: string; accessToken?: string;
  };
  awsSigV4?: { accessKey: string; secretKey: string; region: string; service: string };
}
```

### Collection Structure

```typescript
interface Collection {
  id: string;
  name: string;
  folders: CollectionFolder[];   // nested folders
  requests: ApiRequest[];        // top-level requests
  variables: KeyValue[];         // collection-scoped variables
}

interface CollectionFolder {
  id: string;
  name: string;
  requests: ApiRequest[];
  folders: CollectionFolder[];   // recursive nesting
}
```

### Test Types

```typescript
type TestSource =
  | 'status' | 'time' | 'size' | 'body'
  | 'body-contains' | 'body-is-json' | 'body-schema'
  | 'jsonpath' | 'header' | 'content-type' | 'content-length';
```

## Contract Variant Prompt Flow

When a saved request produces a response with a new unique JSON structure, the extension sends a `contractVariantPrompt` message to the webview. The handling branches based on the `subtleContracts` setting:

- **`subtleContracts: false` (default)** — `App.tsx` shows a modal confirm dialog with "Save Type" / "Skip" buttons. This is the original behaviour.
- **`subtleContracts: true`** — `App.tsx` stores the prompt data in `appStore.pendingContractPrompt` instead of showing a modal. A `ContractIndicator` element (inline in `ResponseViewer.tsx` status bar, before the history dropdown) renders with a CSS glow animation. Clicking it reveals a "Save Type" / "Skip" action menu. Resolving clears the pending prompt and sends `resolveContractVariantPrompt` to the extension.

### Persisted Config Key

`subtleContracts` is a boolean stored in `.openpost/config.json` alongside other tab settings (`tabViewCollapsed`, `tabGrouping`). It defaults to `false` when absent. Managed by `fileStore.ts` via `loadTabSettings()` / `saveTabSetting('subtleContracts', value)`.

### Files Involved

| File | What changed |
|---|---|
| `src/core/types.ts` | `subtleContracts` added to `tabSettings` data payload and `setTabSetting` key union |
| `src/webview/src/types/messages.ts` | Mirrored type changes |
| `src/storage/fileStore.ts` | `loadTabSettings` / `saveTabSetting` handle `subtleContracts` |
| `src/webview/src/stores/appStore.ts` | `subtleContracts` boolean + `pendingContractPrompt` state |
| `src/webview/src/App.tsx` | Settings checkbox, `contractVariantPrompt` handler branches on setting, restores setting from `tabSettings` message |
| `src/webview/src/components/ResponseViewer.tsx` | Inline `ContractIndicator` in status bar |
| `src/webview/src/styles/globals.css` | `@keyframes contract-glow` animation + `.contract-indicator` class |

---

## Constraints & Rules

This section codifies the expectations for contributions and automated
systems that modify the repository.

- **Documentation first.** Every time the codebase is changed—whether it's a
  bug fix, refactor, or an entirely new feature—the corresponding docs in this
  repository (and any associated documentation in other folders) **must** be
  updated to reflect those changes. Failing to do so leads to confusion for
  future maintainers, automated agents, and end-users.  
  > This is not optional; it's a compulsory part of the development workflow.

- Keep rules short, precise, and machine‑parsable where applicable.

## File Modification Guide

(placeholder)

input text truncated due to length... (content continues)