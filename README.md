# ⚡ Open Post

> API Testing. Inside Your Code.

Open Post is a lightweight, fully offline VS Code extension for testing REST and GraphQL APIs — no context switching, no external tools, no cloud dependency.

---

## Quick Start

1. Click the ⚡ **Open Post** icon in the Activity Bar (or press `Cmd+Alt+P` / `Ctrl+Alt+P`)
2. The webview panel opens automatically alongside the sidebar tree views
3. Enter a URL and click **Send** (or `Cmd+Enter` / `Ctrl+Enter`)

**Try it now:**

```
GET  https://jsonplaceholder.typicode.com/posts/1
GET  https://jsonplaceholder.typicode.com/users
POST https://jsonplaceholder.typicode.com/posts
     Body (JSON): { "title": "Hello", "body": "World", "userId": 1 }
```

**5-minute workflow:**

1. **Create an environment** — click Environments tab → New Environment → add `base_url = https://jsonplaceholder.typicode.com`
2. **Create a collection** — click Collections tab → type a name → press Enter
3. **Build a request** — enter `{{base_url}}/posts/1`, click Send
4. **Save it** — click Save in the request builder, pick your collection
5. **Export code** — click the `</>` button to generate code in 11 languages

---

## Features

### 🚀 HTTP Client
- All methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- Query parameters with bidirectional URL sync
- Custom headers with autocomplete for standard HTTP headers
- Multi-tab interface with session persistence — tabs restore when you reopen the panel

### 📝 Body Types

| Type | Use Case |
|------|----------|
| JSON | Most REST APIs |
| Form Data | File uploads, multipart forms |
| URL Encoded | Simple form submissions |
| Raw Text | Plain text payloads |
| XML | SOAP or XML-based APIs |
| GraphQL | Queries and mutations |
| Binary | Binary file uploads |

### 🔐 Authentication
- **Basic Auth** — username & password
- **Bearer Token** — paste your token
- **API Key** — header or query param
- **OAuth 2.0** — authorization code & client credentials flows
- **AWS Signature V4** — access key, secret, region, service

Auth is automatically injected into generated code exports.

### 🌍 Environments
Create environments (Dev, Staging, Production) with key-value variables. Use `{{variable}}` syntax anywhere — URL, headers, body. Switch environments from the top bar dropdown.

```
URL:    {{base_url}}/users/{{user_id}}
Header: Authorization: Bearer {{token}}
Body:   { "api_key": "{{api_key}}" }
```

### 📁 Collections & Folders
- Organize requests into collections with nested folder trees
- **Local collections** — stored per workspace in `.openpost/`
- **Global collections** — stored in `~/.openpost/global/`, shared across all workspaces
- Import/export as Open Post JSON or Postman v2.1 format
- Import from OpenAPI / Swagger specs (auto-creates collection + environment)
- Full CRUD from both the sidebar and VS Code native tree views

### 🌐 Global Storage & Cross-Window Sync
- Global collections, environments, and history live in `~/.openpost/global/`
- Changes sync across VS Code windows automatically via file system watcher
- Both the webview sidebar and VS Code tree views show Local and Global groups
- Requests track their source scope so saves go back to the right place

### 📊 Response Viewer
- Status code with color indicator (green/yellow/red)
- Response time and body size
- Syntax highlighting with line numbers and code folding
- Pretty-printed JSON, raw body, and collapsible tree view
- Response headers table
- Schema extraction for JSON responses
- History dropdown — browse or delete past responses per URL

### 📚 History & Snapshots
- **Request history** — every send is stored locally, browsable from the sidebar
- **Global history** — shared across workspaces
- **Snapshot contracts** — track response structure changes over time
- **Automatic snapshot records** — every send for a saved request is captured
- **Variant detection** — notifies when a response returns a new JSON structure
- Rename, delete, and browse snapshots from the sidebar or tree view

### 🍪 Cookie Jar
- Automatic cookie storage and sending across requests
- Cookie manager accessible from the settings menu
- Toggle cookies on/off per workspace

### 💻 Code Export
Generate ready-to-use code from your request in **11 languages**:

cURL · JavaScript (Fetch) · JavaScript (Axios) · Python (Requests) · Python (http.client) · Go · Java · C# · Ruby · PHP · Rust · Swift

- Environment variables are resolved in generated code
- Auth headers/params are injected automatically
- Toggle the code panel with the `</>` button next to Send

### 🤖 AI Prompt Generator
Generate copy-paste-ready prompts for AI tools with 5 dialects:
- **Explain API** — understand what an endpoint does
- **Write Integration** — get production-ready code
- **Debug Response** — troubleshoot issues
- **Write Tests** — generate test cases
- **Generate Docs** — create API documentation

Includes full request context: method, URL, auth, headers, body, and response.

### 📜 Pre-Request & Test Scripts
Write JavaScript that runs before or after requests:

```javascript
// Pre-request: set dynamic header
request.headers["X-Timestamp"] = Date.now().toString();

// Test: assert response
console.assert(response.status === 200, "Expected 200");
const body = response.json();
console.assert(body.id !== undefined, "Should have id");
```

### 📥 Import & Export
- **Postman v2.1** — import and export collections
- **OpenAPI / Swagger** — import specs (JSON or YAML) to auto-generate collections and environments
- **cURL** — import cURL commands
- **Open Post JSON** — native format, git-friendly

### ⚙️ Settings
All settings available in two places:
- **Webview popup** — gear icon in the top bar
- **VS Code Settings** — Settings → Extensions → Open Post

| Setting | Default | Description |
|---------|---------|-------------|
| SSL Verification | ✅ On | Disable for self-signed certificates |
| Cookies Enabled | ✅ On | Auto-store and send cookies |
| Collapsed Tabs | Off | Compact tab bar view |
| Grouped Tabs | Off | Group tabs by collection |
| Subtle Contracts | Off | Non-intrusive contract change notifications |

### 🎨 Theme Integration
Adapts to your VS Code theme — dark, light, and high contrast. All colors use native VS Code CSS variables.

---

## Installation

### From Marketplace
Search for **Open Post** in the VS Code Extensions panel and click Install.

### From VSIX
1. `Cmd+Shift+P` / `Ctrl+Shift+P` → **Extensions: Install from VSIX...**
2. Select the `.vsix` file
3. Reload VS Code

### From Source
```bash
git clone https://github.com/open-post/open-post.git
cd open-post
npm install
cd src/webview && npm install && cd ../..
./build.sh
code --install-extension open-post-*.vsix
```

---

## Data Storage

```
.openpost/                    ← per workspace (local)
  ├── collections.json
  ├── environments.json
  ├── history.json
  ├── snapshots.json
  ├── cookies.json
  ├── session.json
  └── config.json

~/.openpost/global/           ← shared across workspaces (global)
  ├── collections.json
  ├── environments.json
  ├── history.json
  └── config.json
```

- No cloud sync — your data stays on your machine
- Git-friendly — commit `.openpost/` to share with your team
- No telemetry, no analytics

---

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Open Open Post | `Ctrl+Alt+P` | `Cmd+Alt+P` |
| Send Request | `Ctrl+Enter` | `Cmd+Enter` |

---

## License

MIT — free and open source.

---

Built with ❤️ for developers who live in their editor.
