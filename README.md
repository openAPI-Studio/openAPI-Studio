# ⚡ Open Post

> API Testing. Inside Your Code.

Open Post is a lightweight, fully offline VS Code extension for testing REST and GraphQL APIs — no context switching, no external tools, no cloud dependency.

---

## Features

### 🚀 Full HTTP Client
- All HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- Query parameters with bidirectional URL sync
- Custom headers with autocomplete for standard headers
- Send requests with `Ctrl+Enter` / `Cmd+Enter`

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

### 🌍 Environment Variables
Create environments (Dev, Staging, Production) with key-value variables. Use `{{variable}}` syntax anywhere — URL, headers, body. Switch environments from the top bar dropdown.

```
URL:    {{base_url}}/users/{{user_id}}
Header: Authorization: Bearer {{token}}
Body:   { "api_key": "{{api_key}}" }
```

### 📁 Collections
Organize requests into collections with collapsible tree navigation in the sidebar. Collections are stored as JSON — fully git-friendly for team sharing.

### 📊 Response Viewer
- Status code with color indicator (green/yellow/red)
- Response time and body size
- Pretty-printed JSON with syntax highlighting
- Raw body view
- Collapsible JSON tree view
- Response headers table
- **History dropdown** — browse or delete past responses for the current URL

### 📚 History & Snapshots
- **Automatic request history** — every send is stored locally in `.openpost/history.json`
- **Per-entry history delete** — remove selected entries from the response dropdown or History sidebar
- **Automatic snapshots for saved requests** — when a request is saved to a collection, a snapshot contract is created automatically
- **Automatic snapshot records** — every subsequent send for that saved request is captured under its snapshot
- **Manual snapshot tools** — add records or rename/delete snapshots from the bookmark menu and sidebars

### 💻 Code Export
Generate ready-to-use code in **12 languages** from your current request:
- cURL
- JavaScript (Fetch & Axios)
- Python (Requests & http.client)
- Go, Java, C#, Ruby, PHP, Rust, Swift

Environment variables are resolved in generated code. Toggle the code panel with the `</>` button next to Send.

### 🤖 AI Prompt Generator
Generate copy-paste-ready prompts for AI tools with 5 dialects:
- **Explain API** — understand what an endpoint does
- **Write Integration** — get production-ready code
- **Debug Response** — troubleshoot issues
- **Write Tests** — generate test cases
- **Generate Docs** — create API documentation

Includes full request details: method, URL, auth, headers, body, and response.

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

### ⚙️ Settings
- **SSL Verification** toggle — disable to allow self-signed certificates
- **Clear History** — wipe all request history
- Access from the gear icon in the top bar

### 🎨 Theme Integration
Adapts to your VS Code theme — dark, light, and high contrast. All colors use native VS Code CSS variables.

---

## Installation

### From VSIX

1. Open VS Code
2. `Ctrl+Shift+P` / `Cmd+Shift+P` → **Extensions: Install from VSIX...**
3. Select the `.vsix` file
4. Reload VS Code

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

## Getting Started

1. Click the ⚡ Open Post icon in the Activity Bar (or `Ctrl+Shift+P` → `Open Post: New Request`)
2. Enter a URL: `https://jsonplaceholder.typicode.com/posts/1`
3. Click **Send** (or `Ctrl+Enter`)
4. View the response below

---

## Data Storage

All data is stored locally in your workspace:

```
.openpost/
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
