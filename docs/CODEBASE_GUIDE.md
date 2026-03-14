# Codebase Guide

How to navigate, read, and understand the Open Post codebase. Start here if you are new to the project.

---

## Annotated File Map

```
open-post/
│
├── package.json                      ← Extension manifest: name, version, VS Code engine,
│                                       commands, keybindings, view containers, menus, scripts
│
├── tsconfig.json                     ← TypeScript config for extension side (CommonJS, Node.js)
│
├── src/
│   │
│   ├── extension.ts                  ← 🚪 ENTRY POINT
│   │                                    Registers all commands, tree providers, and keyboard shortcuts.
│   │                                    Sets OpenPostPanel.onDataChanged to refresh sidebar trees.
│   │
│   ├── core/                         ← 🧠 PURE BUSINESS LOGIC — no VS Code API imports here
│   │   │
│   │   ├── types.ts                  ← ⭐ THE MOST IMPORTANT FILE
│   │   │                                Every type, interface, and message union used project-wide.
│   │   │                                Read this first.
│   │   │
│   │   ├── httpClient.ts             ← Sends the actual HTTP request
│   │   │                                Uses only Node.js built-in http/https modules.
│   │   │                                Handles body serialisation, SSL, timing, size.
│   │   │
│   │   ├── curlParser.ts             ← Turns a curl ... command string into an ApiRequest
│   │   │                                Called from the webview side too (mirrored).
│   │   │
│   │   ├── openApiParser.ts          ← Reads a Swagger 2.0 or OpenAPI 3.x spec (JSON/YAML)
│   │   │                                Returns a Collection + an Environment.
│   │   │
│   │   └── interpolation.ts          ← Replaces {{variable}} placeholders with actual values
│   │                                    Used by httpClient and codeGen before sending/rendering.
│   │
│   ├── auth/
│   │   └── authHandler.ts            ← applyAuth(request, envVars) → { headers, queryParams }
│   │                                    One function per auth type: Basic, Bearer, API Key,
│   │                                    OAuth2 (both grant types), AWS SigV4.
│   │                                    Does NOT mutate the request — returns additions only.
│   │
│   ├── scripting/
│   │   └── sandbox.ts                ← runScript(script, context) → ScriptResult
│   │                                    Runs user JS in vm.createContext() — isolated from
│   │                                    the extension. 5-second hard timeout.
│   │
│   ├── services/                     ← VS CODE INTEGRATION LAYER
│   │   │
│   │   ├── webviewProvider.ts        ← 🖥️ THE BRIDGE
│   │   │                                Creates and manages the WebView panel.
│   │   │                                handleMessage() is the central hub — every WebView
│   │   │                                message routes through its switch statement.
│   │   │                                Coordinates: auth → scripting → HTTP → history → snapshots → response.
│   │   │
│   │   ├── collectionTree.ts         ← VS Code TreeDataProvider for the Collections sidebar.
│   │   │                                Reads from fileStore, builds TreeItem objects.
│   │   │                                addCollection / deleteCollection / importCollection /
│   │   │                                exportCollection / renameRequest methods called by commands.
│   │   │
│   │   ├── environmentTree.ts        ← VS Code TreeDataProvider for the Environments sidebar.
│   │   │                                Shows a checkmark/bullet on the active environment.
│   │   │
│   │   └── historyTree.ts            ← VS Code TreeDataProvider for the History sidebar.
│   │                                    Most recent entries at the top.
│   │                                    clear() wipes history.json.
│   │                                    deleteEntry() removes a single history item.
│   │
│   ├── storage/
│   │   └── fileStore.ts              ← Read/write .openpost/*.json in the workspace root.
│   │                                    Simple JSON serialisation — no database.
│   │                                    Returns empty arrays when no workspace folder is open.
│   │                                    Also manages config.json tab settings (including subtleContracts).
│   │
│   └── webview/                      ← 🌐 SEPARATE TYPESCRIPT PROJECT (browser/ESM)
│       │
│       ├── index.html                ← Shell HTML. Gets asset paths rewritten by webviewProvider
│       │                               at runtime to vscode-webview:// URIs.
│       │
│       ├── package.json              ← Webview-only deps: react, zustand, lucide-react, vite,
│       │                               tailwindcss, etc.
│       │
│       ├── vite.config.ts            ← Outputs to ../../dist/webview/ with deterministic filenames.
│       │
│       ├── tailwind.config.js        ← Tailwind config (content paths, theme extensions).
│       │
│       └── src/
│           │
│           ├── main.tsx              ← Creates React root, mounts <App />, acquires vscode API.
│           │
│           ├── App.tsx               ← 🌳 REACT ROOT
│           │                            Sets up the window 'message' listener for all extension → webview messages.
│           │                            On mount: requests loadCollections + loadEnvironments + loadHistory + loadSnapshots.
│           │                            Renders: top bar, collapsible sidebar, ResizableSplit (request/response),
│           │                            optional code/prompt panel, ToastContainer, ConfirmDialog.
│           │                            Settings panel includes Subtle Contracts toggle.
│           │                            contractVariantPrompt handler branches on subtleContracts setting.
│           │
│           ├── components/
│           │   ├── RequestBuilder.tsx      ← Main request editor.
│           │   │                             Method dropdown + URL bar + tab switcher (Params/Headers/Body/Auth/Scripts).
│           │   │                             cURL paste detection and import.
│           │   │                             Send button → postMessage({ type: 'sendRequest' }).
│           │   │                             Save dropdown → postMessage({ type: 'saveRequest' }).
│           │   │                             Bookmark menu requires saved requests before manual snapshotting.
│           │   │
│           │   ├── ResponseViewer.tsx      ← Shows ApiResponse.
│           │   │                             Status bar, body tab (pretty/raw/tree/preview), headers tab.
│           │   │                             Per-URL history dropdown with single-entry delete.
│           │   │                             Diff mode using viewedHistoryId from appStore.
│           │   │                             Snapshot record banner using viewedSnapshotRecord from appStore.
│           │   │                             Inline ContractIndicator (glow animation) when
│           │   │                             pendingContractPrompt is set and subtleContracts is on.
│           │   │
│           │   ├── Sidebar.tsx             ← Left sidebar panel.
│           │   │                             Tab switcher: Collections | Environments | History | Snapshots.
│           │   │                             Collection tree rendered as expandable folders.
│           │   │                             Environment management UI.
│           │   │                             History list with replay + delete.
│           │   │                             SnapshotsPanel: collapsible snapshot rows with records,
│           │   │                             inline rename, per-snapshot and per-record delete.
│           │   │
│           │   ├── BodyEditor.tsx          ← Body type selector + the correct sub-editor:
│           │   │                             CodeEditor for json/raw/xml,
│           │   │                             GraphQL dual-pane editor,
│           │   │                             KeyValueEditor for form/urlencoded,
│           │   │                             file picker for binary.
│           │   │
│           │   ├── AuthPanel.tsx           ← Auth type selector + the correct sub-form:
│           │   │                             BasicAuth, BearerToken, ApiKey,
│           │   │                             OAuth2 (with "Get Token" button), AwsSigV4.
│           │   │
│           │   ├── ScriptEditor.tsx        ← Pre-request and test script text areas with a
│           │   │                             console-style log output section.
│           │   │
│           │   ├── KeyValueEditor.tsx      ← Reusable table for params, headers, form fields.
│           │   │                             Checkbox enable/disable, key input, value input, delete.
│           │   │                             Optional header autocomplete via AutocompleteInput.
│           │   │
│           │   ├── AutocompleteInput.tsx   ← Input with a dropdown of suggestions.
│           │   │                             Used for the header name and value columns.
│           │   │
│           │   ├── CodeExportPanel.tsx     ← Sliding right panel showing code snippets.
│           │   │                             Language selector, syntax-highlighted code output,
│           │   │                             Code / Prompt toggle, copy button.
│           │   │                             Built-in syntax highlighter (no external library).
│           │   │
│           │   ├── AIPromptPanel.tsx       ← Renders the AI prompt (inside CodeExportPanel).
│           │   │                             Dialect selector + formatted prompt output.
│           │   │
│           │   ├── EnvironmentSelector.tsx ← Dropdown in the top bar to pick the active environment.
│           │   │                             Posts setActiveEnvironment when selection changes.
│           │   │
│           │   ├── JsonTreeView.tsx        ← Collapsible tree for exploring nested JSON.
│           │   │                             Used in the response viewer's Tree body mode.
│           │   │
│           │   ├── ResizableSplit.tsx      ← Drag-to-resize vertical split container.
│           │   │                             Stores ratio in appStore.splitRatio.
│           │   │
│           │   ├── ToastContainer.tsx      ← Renders appStore.toasts as notification banners.
│           │   │                             Auto-dismisses after duration ms.
│           │   │
│           │   └── ConfirmDialog.tsx       ← Modal confirm dialog from appStore.confirmDialog.
│           │                                 Confirm → calls onConfirm(), then hideConfirm().
│           │
│           ├── stores/
│           │   ├── appStore.ts             ← Global app state (Zustand).
│           │   │                             All UI state, server data, toast queue, confirm dialog.
│           │   │                             Also holds `snapshots` array and `viewedSnapshotRecord`
│           │   │                             for the snapshot record viewer banner.
│           │   │                             `subtleContracts` boolean and `pendingContractPrompt`
│           │   │                             for inline contract change notifications.
│           │   └── requestStore.ts         ← Current request being edited (Zustand).
│           │                                 toApiRequest() → serialise, loadRequest() → populate.
│           │
│           ├── types/
│           │   ├── messages.ts             ← WebView-side mirror of core/types.ts.
│           │   │                             Also exports postMessage() helper typed to MessageToExtension.
│           │   └── curlParser.ts           ← WebView-side cURL parser (same logic as core/curlParser.ts).
│           │
│           ├── utils/
│           │   ├── codeGen.ts              ← generateCode() for 12 target languages.
│           │   └── promptGen.ts            ← generatePrompt() for 5 AI prompt dialects.
│           │
│           ├── data/
│           │   └── headers.ts              ← Static list of well-known HTTP header names and their
│           │                                 common values — drives autocomplete in KeyValueEditor.
│           │
│           └── styles/
│               └── globals.css             ← Tailwind @layer base/components + VS Code CSS variable
│                                             mappings (--vscode-* → --vsc-* shorthand aliases).
│                                             @keyframes contract-glow animation and .contract-indicator
│                                             class for the inline contract change indicator.
│
├── dist/                             ← Build output (gitignored)
│   ├── extension.js
│   └── webview/
│       ├── index.html
│       └── assets/
│           ├── main.js
│           └── main.css
│
└── docs/                             ← You are here
    ├── README.md
    ├── ARCHITECTURE.md
    ├── FEATURES.md
    ├── DEVELOPMENT.md
    ├── API_REFERENCE.md
    └── CODEBASE_GUIDE.md
```

---

## Recommended Reading Order

If you are new to the codebase, read files in this order:

### 1. Types first — `src/core/types.ts`

This is the contract that everything else is built on. Every data structure — `ApiRequest`, `ApiResponse`, `Collection`, `Environment`, `HistoryEntry` — is defined here. Read it fully before touching any other file. Pay special attention to:

- `ApiRequest` — what a request contains
- `ApiResponse` — what comes back
- `MessageToExtension` / `MessageToWebview` — the communication protocol

### 2. The entry point — `src/extension.ts`

Shows you every VS Code command, every tree provider, and how `OpenPostPanel` is connected to the sidebar trees via `onDataChanged`. This file is short (~120 lines) and gives the full command surface.

### 3. The bridge — `src/services/webviewProvider.ts`

The most important file to understand system behaviour. The `handleMessage()` method is where every user action (Send, Save, Load collections, etc.) is processed. Trace through the `sendRequest` case to understand the full pipeline: auth → pre-script → HTTP → test-script → history.

### 4. The React root — `src/webview/src/App.tsx`

The WebView-side entry. Understand how:
- `window.addEventListener('message', ...)` receives messages from the extension
- The initial `loadCollections` / `loadEnvironments` / `loadHistory` messages are sent on mount
- The layout is composed: top bar → sidebar → `ResizableSplit` → code panel

### 5. The two stores — `appStore.ts` and `requestStore.ts`

Everything in the WebView reads from or writes to these two Zustand stores. Know what lives in each (see the [Architecture doc](ARCHITECTURE.md#state-management-webview--zustand)).

### 6. The main components — `RequestBuilder.tsx` and `ResponseViewer.tsx`

These are the two halves of the split panel. `RequestBuilder` contains all editing logic; `ResponseViewer` handles everything after a response arrives. Reading these two will show you how the UI glues together the stores and the message protocol.

---

## Key Patterns

### Pattern 1: Message round-trip

Every operation that needs data from the extension follows this three-step pattern:

```
[WebView]  postMessage({ type: 'loadCollections' })
                    ↓
[Extension] webviewProvider.handleMessage()
             postMessage({ type: 'collections', data: store.loadCollections() })
                    ↓
[WebView]  App.tsx onMessage: setCollections(msg.data)
            → Zustand update → React re-render
```

```typescript
// Step 1 — send from any React component
import { postMessage } from '../types/messages';
postMessage({ type: 'loadCollections' });

// Step 2 — handle in webviewProvider.ts
case 'loadCollections':
  this.postMessage({ type: 'collections', data: store.loadCollections() });
  break;

// Step 3 — receive in App.tsx
case 'collections':
  useAppStore.getState().setCollections(msg.data);
  break;
```

### Pattern 2: Environment Variable Interpolation

Variables are **stored as literals** (`{{variable}}`) everywhere. They are only **resolved at send time** in the extension (httpClient) or at render time in codeGen (webview). This means:

- The request builder always shows `{{base_url}}/users` even when an environment is active
- The URL you see in the request builder is the raw template, not the interpolated value

```typescript
// Interpolation happens in two places:
// 1. Extension — src/core/httpClient.ts — before the actual HTTP call
// 2. WebView — src/webview/src/utils/codeGen.ts — when rendering code snippets
```

### Pattern 3: Zustand selector subscriptions

Components subscribe only to the slice of state they need, preventing unnecessary re-renders:

```typescript
// ✅ Only re-renders when response changes
const response = useAppStore((s) => s.response);
const loading  = useAppStore((s) => s.loading);

// ✅ Multiple selectors — each independently subscribed
const [collections, activeEnvId] = useAppStore((s) => [s.collections, s.activeEnvironmentId]);
```

### Pattern 4: The request store is the single source of truth for the editor

`requestStore` holds the "current" state of everything visible in the request builder. When a user clicks a saved request in the sidebar, the extension sends `{ type: 'loadRequest', data: req }`, and `App.tsx` calls `useRequestStore.getState().loadRequest(req, collectionId)` — which populates every field from the saved `ApiRequest`.

When working with request fields, always go through the store:

```typescript
const { method, setMethod } = useRequestStore((s) => ({ method: s.method, setMethod: s.setMethod }));
```

### Pattern 5: notifyDataChanged keeps the sidebar in sync

After any write operation in `webviewProvider.ts`, `notifyDataChanged()` is called:

```typescript
// webviewProvider.ts
private notifyDataChanged() {
  OpenPostPanel.onDataChanged?.();
}

// extension.ts — set at startup
OpenPostPanel.onDataChanged = () => {
  collectionTree.refresh();
  environmentTree.refresh();
  historyTree.refresh();
  snapshotTree.refresh();
};
```

This refresh cascades to all four tree providers, which re-read from disk and repaint. If you add a new write operation and forget `notifyDataChanged()`, the sidebar will not update until the user manually collapses/expands trees.

### Pattern 6: The type mirroring problem

`src/core/types.ts` and `src/webview/src/types/messages.ts` contain the same types written twice. They must be kept in sync manually because:

- `src/core/types.ts` is compiled as CommonJS (Node.js) for the extension
- `src/webview/src/types/messages.ts` is compiled as ESModules (browser) for Vite

They cannot import from each other at runtime. If you add a field to a type in one, add it to the other.

---

## VS Code Theme CSS Variables

Open Post avoids hardcoded colours by using VS Code's built-in CSS variables. These are defined in `globals.css` as shorter aliases:

| Alias | Maps to VS Code variable | Usage |
|---|---|---|
| `--vsc-bg` | `--vscode-editor-background` | Panel backgrounds |
| `--vsc-fg` | `--vscode-editor-foreground` | Body text |
| `--vsc-input-bg` | `--vscode-input-background` | Input fields |
| `--vsc-input-fg` | `--vscode-input-foreground` | Input text |
| `--vsc-border` | `--vscode-panel-border` | Panel borders |
| `--vsc-border-visible` | `--vscode-contrastBorder` | High-contrast borders |
| `--vsc-btn-bg` | `--vscode-button-background` | Primary button background |
| `--vsc-btn-fg` | `--vscode-button-foreground` | Primary button text |
| `--vsc-btn-hover` | `--vscode-button-hoverBackground` | Primary button hover |
| `--vsc-success` | `--vscode-testing-iconPassed` | 2xx status, success toasts |
| `--vsc-warning` | `--vscode-editorWarning-foreground` | 3xx status |
| `--vsc-error` | `--vscode-editorError-foreground` | 4xx/5xx status, error toasts |
| `--vsc-dropdown-bg` | `--vscode-dropdown-background` | Dropdowns, menus |
| `--vsc-notify-bg` | `--vscode-notifications-background` | Toast backgrounds |

These work automatically with VS Code's light, dark, and high-contrast themes.

---

## Common Mistakes to Avoid

| Mistake | Why it's wrong | What to do instead |
|---|---|---|
| Importing from `vscode` in webview code | The `vscode` package is not available in the browser context | Use `postMessage` to ask the extension to do it |
| Importing from webview code in extension code | The module format is incompatible (ESM vs CJS) | Duplicate the type in `src/core/types.ts` |
| Mutating `request` in `applyAuth` | The original request object would be permanently altered | Return `{ headers, queryParams }` additions only |
| Skipping `notifyDataChanged()` after a write | Sidebar trees will show stale data | Call it after every `store.save*()` call |
| Using hashed filenames in the webview build | The regex in `getHtml()` would not match → broken assets | Keep Vite rollup output configured with `[name]` not `[name]-[hash]` |
| Adding `require()` inside a user script | The sandbox blocks it — the call throws | User scripts are sandboxed; document this limitation for users |
| Storing OAuth tokens in plain JSON | Tokens are sensitive — don't write them to `.openpost/environments.json` | Use VS Code `SecretStorage` (already done in `authHandler.ts`) |
