# ⚡ Open Post

> "API Testing. Inside Your Code."

Open Post is a lightweight, fully offline VS Code extension for testing REST and GraphQL APIs — no context switching, no external tools, no cloud dependency.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [From VS Code Marketplace](#from-vs-code-marketplace)
  - [From VSIX (Manual Install)](#from-vsix-manual-install)
  - [From Source (Development)](#from-source-development)
- [Getting Started](#getting-started)
  - [Opening Open Post](#opening-open-post)
  - [Sending Your First Request](#sending-your-first-request)
- [Features Guide](#features-guide)
  - [Request Builder](#request-builder)
  - [Body Types](#body-types)
  - [Authentication](#authentication)
  - [Environment Variables](#environment-variables)
  - [Collections](#collections)
  - [Response Viewer](#response-viewer)
  - [Pre-Request & Test Scripts](#pre-request--test-scripts)
- [Data Storage](#data-storage)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- **VS Code** version 1.85.0 or higher
- **Node.js** 18+ (only needed if building from source)

---

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS) to open the Extensions panel
3. Search for **"Open Post"**
4. Click **Install**
5. Reload VS Code if prompted

### From VSIX (Manual Install)

If you have a `.vsix` file (e.g., from a release page or a teammate):

1. Open VS Code
2. Press `Ctrl+Shift+P` / `Cmd+Shift+P` to open the Command Palette
3. Type **"Extensions: Install from VSIX..."** and select it
4. Browse to the `.vsix` file and select it
5. Reload VS Code

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/your-org/open-post.git
cd open-post

# Install dependencies
npm install

# Build the extension and webview
npm run build

# Open in VS Code for development
code .
```

Then press `F5` in VS Code to launch a new Extension Development Host window with Open Post loaded.

---

## Getting Started

### Opening Open Post

There are three ways to open the extension:

1. **Activity Bar** — Click the ⚡ Open Post icon in the left sidebar
2. **Command Palette** — Press `Ctrl+Shift+P` / `Cmd+Shift+P`, then type:
   - `Open Post: New Request` — opens a fresh request tab
   - `Open Post: Open Collection` — opens the collection browser
3. **Keyboard Shortcut** — `Ctrl+Alt+P` / `Cmd+Alt+P` (default binding)

### Sending Your First Request

1. Open Open Post (see above)
2. In the URL bar, enter a URL, e.g.:
   ```
   https://jsonplaceholder.typicode.com/posts/1
   ```
3. Select the HTTP method from the dropdown (defaults to **GET**)
4. Click **Send** (or press `Ctrl+Enter` / `Cmd+Enter`)
5. View the response in the panel below — status code, time, size, headers, and body

That's it. You just made your first API call without leaving your editor.

---

## Features Guide

### Request Builder

Open Post supports all standard HTTP methods:

| Method    | Use Case                  |
|-----------|---------------------------|
| `GET`     | Retrieve data             |
| `POST`   | Create a resource          |
| `PUT`    | Replace a resource         |
| `PATCH`  | Partially update a resource|
| `DELETE` | Remove a resource          |
| `HEAD`   | Get headers only           |
| `OPTIONS`| Check allowed methods      |

The request panel has the following tabs:

- **Params** — Add query parameters as key-value pairs
- **Headers** — Set custom request headers
- **Body** — Configure the request body (see Body Types below)
- **Auth** — Set up authentication (see Authentication below)
- **Tests** — Write post-response test assertions
- **Scripts** — Write pre-request scripts

### Body Types

When sending `POST`, `PUT`, or `PATCH` requests, select a body type:

| Type                    | When to Use                          |
|-------------------------|--------------------------------------|
| JSON                    | Most REST APIs                       |
| Form Data               | File uploads, multipart forms        |
| x-www-form-urlencoded   | Simple form submissions              |
| Raw Text                | Plain text payloads                  |
| XML                     | SOAP or XML-based APIs               |
| GraphQL                 | GraphQL queries and mutations        |
| Binary                  | Binary file uploads                  |

Example JSON body:
```json
{
  "title": "Hello World",
  "body": "This is a test post",
  "userId": 1
}
```

### Authentication

Configure auth from the **Auth** tab in the request builder:

| Auth Type      | Setup                                                        |
|----------------|--------------------------------------------------------------|
| No Auth        | Default — no credentials sent                                |
| Basic Auth     | Enter username and password                                  |
| Bearer Token   | Paste your token                                             |
| API Key        | Set key name, value, and location (header or query param)    |
| OAuth 2.0      | Configure grant type, auth URL, token URL, client ID/secret  |
| AWS Signature V4| Enter access key, secret key, region, and service           |

For **OAuth 2.0**, Open Post will:
1. Open your default browser for the authorization flow
2. Start a local callback server to capture the redirect
3. Automatically store the token for subsequent requests

### Environment Variables

Environments let you reuse values across requests using `{{variable}}` syntax.

**Setting up an environment:**

1. Click the **Environments** panel in the sidebar
2. Click **+ New Environment** (e.g., "Development", "Staging", "Production")
3. Add variables:

| Variable       | Value                          |
|----------------|--------------------------------|
| `base_url`     | `https://api.dev.example.com`  |
| `token`        | `your-dev-token-here`          |
| `user_id`      | `42`                           |

4. Select the active environment from the dropdown in the top bar

**Using variables in requests:**

- URL: `{{base_url}}/users/{{user_id}}`
- Headers: `Authorization: Bearer {{token}}`
- Body: `{ "userId": "{{user_id}}" }`

**Variable scopes** (highest to lowest priority):

1. **Request** — overrides everything for a single request
2. **Collection** — shared across all requests in a collection
3. **Workspace** — shared across all collections in the workspace
4. **Global** — available everywhere

Sensitive values (tokens, passwords) are encrypted using VS Code's SecretStorage API.

### Collections

Organize your requests into collections and folders:

**Creating a collection:**

1. Open the **Collections** panel in the sidebar
2. Click **+ New Collection**
3. Name it (e.g., "User API")

**Organizing requests:**

```
User API (Collection)
 ├── Auth (Folder)
 │    ├── Login
 │    ├── Register
 │    └── Refresh Token
 ├── Users (Folder)
 │    ├── Get All Users
 │    ├── Get User by ID
 │    └── Update User
 └── Health Check
```

- Right-click a collection to add folders or requests
- Drag and drop to reorder
- Collections are stored as JSON files — fully git-friendly

### Response Viewer

After sending a request, the response panel shows:

- **Status** — HTTP status code with color indicator (green for 2xx, yellow for 3xx, red for 4xx/5xx)
- **Time** — Response time in milliseconds
- **Size** — Response body size
- **Headers** — Response headers as a table

**Body view modes:**

| Mode       | Description                                    |
|------------|------------------------------------------------|
| Pretty     | Syntax-highlighted, formatted JSON/XML/HTML    |
| Raw        | Unformatted response body                      |
| Preview    | Rendered HTML preview                          |
| Tree View  | Collapsible JSON tree for exploring nested data|
| Diff       | Compare with a previous response               |

### Pre-Request & Test Scripts

Write JavaScript scripts that run before or after a request.

**Pre-request script example:**
```javascript
// Set a dynamic timestamp header
request.headers["X-Timestamp"] = Date.now().toString();

// Read from environment
const token = environment.get("token");
request.headers["Authorization"] = `Bearer ${token}`;
```

**Test script example:**
```javascript
// Assert status code
console.assert(response.status === 200, "Expected 200 OK");

// Parse and check body
const body = response.json();
console.assert(body.id !== undefined, "Response should have an id");

// Save a value to environment for later requests
environment.set("post_id", body.id);
```

**Available objects in scripts:**

| Object        | Description                              |
|---------------|------------------------------------------|
| `request`     | Current request (url, headers, body)     |
| `response`    | Response (status, headers, body, json()) |
| `environment` | Get/set environment variables            |
| `console`     | Log output to the script console         |

Scripts run in a sandboxed environment for security.

---

## Data Storage

Open Post stores all data locally in your workspace:

```
your-project/
 └── .openpost/
      ├── collections.json    # All collections and requests
      └── environments.json   # All environment configurations
```

- **No cloud sync** — your data stays on your machine
- **Git-friendly** — commit `.openpost/` to share collections with your team
- **Secrets** — sensitive values (tokens, passwords) are stored separately in VS Code's encrypted SecretStorage, not in JSON files

To share collections without secrets, just commit the `.openpost/` directory. Each team member's secrets remain local and encrypted.

---

## Keyboard Shortcuts

| Action                  | Windows/Linux          | macOS                 |
|-------------------------|------------------------|-----------------------|
| Open Open Post          | `Ctrl+Alt+P`          | `Cmd+Alt+P`          |
| Send Request            | `Ctrl+Enter`          | `Cmd+Enter`          |
| New Request             | `Ctrl+N`              | `Cmd+N`              |
| Save Request            | `Ctrl+S`              | `Cmd+S`              |
| Switch Environment      | `Ctrl+Shift+E`        | `Cmd+Shift+E`        |
| Toggle Sidebar          | `Ctrl+B`              | `Cmd+B`              |
| Focus URL Bar           | `Ctrl+L`              | `Cmd+L`              |

---

## FAQ

**Q: Does Open Post send any data to external servers?**
A: No. Open Post is fully offline. There is no telemetry, no analytics, and no cloud sync by default. Your requests go only to the URLs you specify.

**Q: Can I import my Postman collections?**
A: Postman import support is planned for Phase 2. For now, you can manually recreate collections or use curl import (coming soon).

**Q: Where are my secrets stored?**
A: Sensitive values are stored using VS Code's SecretStorage API, which uses your OS keychain (macOS Keychain, Windows Credential Manager, or Linux libsecret). They are never written to plain-text files.

**Q: Can I use this with my team?**
A: Yes. Commit the `.openpost/` directory to your repo. Collections and environments (minus secrets) will be shared. Each developer's secrets stay local.

**Q: Does it support GraphQL?**
A: GraphQL body type is available in the MVP. A full GraphQL schema explorer is planned for Phase 2.

**Q: What about gRPC and WebSockets?**
A: Both are on the roadmap for Phase 2/3.

---

## Contributing

We welcome contributions!

```bash
# Fork and clone
git clone https://github.com/your-username/open-post.git
cd open-post

# Install dependencies
npm install

# Run in development mode
# Press F5 in VS Code to launch Extension Development Host

# Run tests
npm test

# Lint
npm run lint
```

Please follow:
- Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Strict TypeScript — no `any` types
- 80%+ test coverage for new code

---

## License

MIT — free and open source.

---

Built with ❤️ for developers who live in their editor.
