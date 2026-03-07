# Open Post — Documentation Hub

> **"API Testing. Inside Your Code."**

Open Post is a **fully offline, VS Code-native REST and GraphQL API client**. No browser tabs, no external apps, no cloud dependency. Everything lives inside your editor as a VS Code extension.

---

## Documentation Index

| Document | Description |
|---|---|
| [README.md](README.md) | You are here — overview & quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, and how the two processes talk |
| [FEATURES.md](FEATURES.md) | Complete guide to every feature with usage examples |
| [DEVELOPMENT.md](DEVELOPMENT.md) | How to build, run, debug, and contribute |
| [API_REFERENCE.md](API_REFERENCE.md) | All TypeScript types, message protocol, and store API |
| [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md) | How to navigate and read the source code |

---

## What Is Open Post?

Open Post is a **VS Code extension** that embeds a full HTTP client inside the editor using a **WebView panel**. It replaces tools like Postman, Insomnia, or `curl` on the command line — without ever leaving VS Code.

Current version: **0.8.17**  
Minimum VS Code: **1.85.0**

### Capabilities at a Glance

| Area | Details |
|---|---|
| **HTTP Methods** | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| **Body Types** | JSON, Form Data, Multipart, URL-Encoded, XML, GraphQL, Binary, Raw |
| **Auth Types** | None, Basic, Bearer, API Key, OAuth 2.0 (Auth Code + Client Credentials), AWS Signature V4 |
| **Environments** | `{{variable}}` substitution, scoped resolution, git-friendly storage |
| **Collections** | Hierarchical folders, Postman v2.1 import/export |
| **OpenAPI Import** | Swagger 2.0 and OpenAPI 3.x (JSON or YAML) |
| **Code Export** | 12 languages: cURL, JS Fetch, Axios, Python, Go, Java, C#, Ruby, PHP, Rust, Swift |
| **AI Prompts** | Generate prompts for AI assistants from any request |
| **Scripting** | Pre-request and test scripts (sandboxed JS) |
| **Response Viewer** | Pretty, Raw, Tree, Preview, Diff modes |
| **History** | Automatic request history with replay |
| **Snapshots** | Save named API contracts with full request/response records for later review |
| **SSL** | Toggle SSL verification per-session |
| **Storage** | Local `.openpost/` directory — fully git-friendly, no account needed |

---

## Quick Start

### Install

**From VS Code Marketplace:**
1. Press `Ctrl+Shift+X` / `Cmd+Shift+X`
2. Search **"Open Post"**
3. Click **Install**

**From source (for development):**
```bash
git clone https://github.com/open-post/open-post.git
cd open-post
npm install
npm run build
# Press F5 in VS Code to launch Extension Development Host
```

### Open the Panel

- Click the **⚡ icon** in the Activity Bar (left sidebar), **or**
- Press `Ctrl+Alt+P` / `Cmd+Alt+P`, **or**
- Open the Command Palette (`Ctrl+Shift+P`) → type `Open Post: New Request`

### Send Your First Request

```
1. The panel opens with a blank request
2. URL: https://jsonplaceholder.typicode.com/posts/1
3. Method: GET (already selected)
4. Press Ctrl+Enter / Cmd+Enter — or click the Send button
5. The response appears in the bottom panel
```

---

## Project Layout

```
open-post/
├── src/
│   ├── extension.ts          → VS Code extension entry point
│   ├── auth/
│   │   └── authHandler.ts    → Applies auth headers/params to requests
│   ├── core/
│   │   ├── types.ts          → ALL shared TypeScript types & message protocol
│   │   ├── httpClient.ts     → HTTP request execution (Node.js built-ins)
│   │   ├── curlParser.ts     → Parses cURL commands into ApiRequest objects
│   │   ├── openApiParser.ts  → Converts OpenAPI specs into Collections
│   │   └── interpolation.ts  → Resolves {{variable}} placeholders
│   ├── scripting/
│   │   └── sandbox.ts        → Sandboxed user script execution
│   ├── services/
│   │   ├── webviewProvider.ts  → WebView panel lifecycle + all message handling
│   │   ├── collectionTree.ts   → Collections sidebar tree provider
│   │   ├── environmentTree.ts  → Environments sidebar tree provider
│   │   ├── historyTree.ts      → History sidebar tree provider
│   │   └── snapshotTree.ts     → Snapshots sidebar tree provider
│   ├── storage/
│   │   └── fileStore.ts        → Read/write .openpost/*.json files
│   └── webview/                → React frontend (separate TypeScript project)
│       ├── index.html
│       ├── package.json        → Webview-only dependencies
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx         → Root component, layout, message listener
│           ├── components/     → All UI components
│           ├── stores/         → Zustand state (appStore, requestStore)
│           ├── types/          → Webview-side type definitions & message helper
│           └── utils/          → Code generation, prompt generation
├── docs/                       → You are here
├── package.json                → Extension manifest + npm scripts
└── tsconfig.json               → Extension TypeScript config
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Two TypeScript projects** | Extension (Node.js/CJS) and WebView (browser/ESM) cannot share modules at runtime — they communicate via a strict typed message-passing protocol |
| **Local-first storage** | All data lives in `.openpost/` in the workspace folder. No accounts, no cloud, 100% offline |
| **No external HTTP library** | Uses Node.js built-in `http`/`https` modules — zero network dependency footprint |
| **Sandboxed scripting** | User scripts run in `vm.createContext()` — isolated from the extension with a 5-second timeout |
| **esbuild for extension** | Fast bundling of the extension side into a single `dist/extension.js` |
| **Vite for webview** | Fast bundling of the React app with deterministic (non-hashed) filenames required by VS Code's WebView CSP |

---

## External Dependencies

### Extension Side (Node.js)
| Package | Purpose |
|---|---|
| `js-yaml` | Parse YAML-format OpenAPI specs |
| `vscode` | VS Code Extension API (peer dependency) |

### WebView Side (Browser/React)
| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `zustand` | Lightweight state management |
| `lucide-react` | Icon components |
| `vite` | Build tool / bundler |
| `@vitejs/plugin-react` | React support for Vite |
| `tailwindcss` | Utility-first CSS |
| `postcss` + `autoprefixer` | CSS processing |

> **Notable absences:** No Axios, no fetch polyfill, no syntax highlighting library, no date library. Everything custom is built in-house.

---

## License

MIT — free and open source.  
Repository: [github.com/open-post/open-post](https://github.com/open-post/open-post)
