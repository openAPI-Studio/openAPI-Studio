# Features Guide

A complete reference for every user-facing feature in Open Post.

---

## Table of Contents

1. [The Panel Layout](#the-panel-layout)
2. [HTTP Methods](#http-methods)
3. [URL Bar & cURL Import](#url-bar--curl-import)
4. [Query Parameters](#query-parameters)
5. [Headers](#headers)
6. [Request Body](#request-body)
7. [Authentication](#authentication)
8. [Environment Variables](#environment-variables)
9. [Collections & Folders](#collections--folders)
10. [Response Viewer](#response-viewer)
11. [Request History](#request-history)
12. [Pre-Request & Test Scripts](#pre-request--test-scripts)
13. [Code Export](#code-export)
14. [AI Prompt Generator](#ai-prompt-generator)
15. [OpenAPI / Swagger Import](#openapi--swagger-import)
16. [Postman Collection Import / Export](#postman-collection-import--export)
17. [Settings](#settings)
18. [Keyboard Shortcuts](#keyboard-shortcuts)
19. [Snapshots](#snapshots)

---

## The Panel Layout

When you open Open Post the panel is split into three areas:

```
┌──────────────────────────────────────────────────────────┐
│  TOP BAR: Environment selector, Settings                  │
├──────┬───────────────────────────────────────────────────┤
│      │  [Request Name]                    [Save ▾]       │
│      │─────────────────────────────────────────────────  │
│      │  [METHOD ▾]  [ URL ......................... ]     │
│      │                                        [Send]     │
│ Side │─────────────────────────────────────────────────  │
│ bar  │  params │ headers │ body │ auth │ scripts          │
│      │  (tab content)                                     │
│      ├───────────────────────────────────────────────────┤
│      │  Response (status │ time │ size) [Copy]            │
│      │  body │ headers    pretty │ raw │ tree │ preview   │
│      │  (response content)                                │
└──────┴───────────────────────────────────────────────────┘
```

**Drag the divider** between the request and response panels to resize them.  
**Drag the sidebar edge** to widen or narrow the sidebar.  
The sidebar can be collapsed with the toggle button in the top bar.

---

## HTTP Methods

Select a method from the dropdown left of the URL bar.

| Method | Typical use |
|---|---|
| `GET` | Fetch a resource |
| `POST` | Create a resource |
| `PUT` | Replace a resource entirely |
| `PATCH` | Partially update a resource |
| `DELETE` | Remove a resource |
| `HEAD` | Like GET but no response body — headers only |
| `OPTIONS` | Ask the server what methods it supports |

The method label is colour-coded throughout the UI.

---

## URL Bar & cURL Import

The URL bar accepts two things:

### 1 — A plain URL (with optional `{{variables}}`)

```
https://api.example.com/users/{{user_id}}?page=1
```

Environment variables in `{{double_braces}}` are interpolated when the request is actually sent — the raw `{{variable}}` text is stored.

### 2 — A full cURL command

Paste or type a `curl ...` command and the builder **instantly parses it** and populates:

- Method
- URL
- All headers
- Body (JSON, form, etc.)
- Auth (Bearer token detected automatically)

**Example cURL command to paste:**

```bash
curl -X POST 'https://api.example.com/auth/login' \
  -H 'Content-Type: application/json' \
  -H 'X-Client: myapp' \
  -d '{"email":"user@example.com","password":"secret"}'
```

After pasting you will see a green **"cURL imported"** badge appear briefly to confirm.

The import also triggers automatically when you paste text starting with `curl ` via `Ctrl+V` / `Cmd+V`.

---

## Query Parameters

Under the **Params** tab.

- Add key-value pairs that are appended to the URL as `?key=value&key2=value2`
- Toggle individual params **on/off** using the checkbox — disabled params are not sent but are kept
- Delete a row with the trash icon
- `{{variables}}` in both keys and values are interpolated at send time

The URL bar preview updates live as you add/remove/toggle params.

---

## Headers

Under the **Headers** tab.

- Add any custom HTTP headers as key-value pairs
- **Autocomplete** for common header names (e.g. `Content-Type`, `Accept`, `Authorization`, `X-Request-Id`)
- **Value autocomplete** for headers that have standard values (e.g. typing `Content-Type` populates `application/json` as a suggestion)
- Toggle or delete individual headers
- Auth headers (e.g. `Authorization: Bearer ...`) are **injected automatically** based on the Auth tab — you do not need to add them here

---

## Request Body

Under the **Body** tab. Only meaningful for methods that allow a body (POST, PUT, PATCH), but technically settable for any method.

### Body types

| Type | Content-Type sent | Use case |
|---|---|---|
| **None** | — | GET, DELETE, HEAD |
| **JSON** | `application/json` | REST APIs |
| **Raw** | `text/plain` | Plain text payloads |
| **XML** | `application/xml` | SOAP, XML-based APIs |
| **GraphQL** | `application/json` | GraphQL operations |
| **Form Data** | `multipart/form-data` | File uploads + mixed fields |
| **URL Encoded** | `application/x-www-form-urlencoded` | Classic HTML form submission |
| **Binary** | `application/octet-stream` | Raw file upload |

Selecting a type automatically sets the `Content-Type` header (unless you've already set it manually).

### JSON body

Type or paste a JSON object in the editor. It is sent as-is — no formatting or validation is enforced. `{{variables}}` inside string values are interpolated.

```json
{
  "title": "{{post_title}}",
  "userId": 1
}
```

### GraphQL body

Two-field editor:

- **Query** — the GraphQL operation (query or mutation)
- **Variables** — a JSON object of variable values

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    name
    email
  }
}
```

Variables:
```json
{ "id": "{{user_id}}" }
```

These are serialised together as `{ "query": "...", "variables": {...} }` and sent as `application/json`.

### Form Data (multipart)

Key-value pairs where each row can be:
- **Text** — a string value
- **File** — pick a file from disk; it is sent as a multipart file part

### URL Encoded

Key-value pairs encoded as `key=value&key2=value2`. No files.

### Binary

Pick a single file from disk. The entire file is sent as the raw body with `Content-Type: application/octet-stream`.

---

## Authentication

Under the **Auth** tab. Auth is applied automatically when you click Send — you never need to manually add the `Authorization` header.

### None

No credentials added to the request.

### Basic Auth

- Enter **username** and **password**
- Encoded into `Authorization: Basic <base64(user:pass)>`

### Bearer Token

- Paste your token
- Adds `Authorization: Bearer <token>`

### API Key

- **Key name** — the header or query param name (e.g. `X-API-Key`, `api_key`)
- **Value** — the key value
- **Add to** — `Header` (default) or `Query parameter`

### OAuth 2.0

Two grant types:

**Authorization Code (browser flow):**
1. Fill in Auth URL, Token URL, Client ID, Client Secret, Scope
2. Click **Get Token**
3. VS Code opens your default browser to the auth URL
4. You log in and authorise
5. The extension catches the redirect on a local HTTP server
6. The code is exchanged for an access token automatically
7. The token is stored securely and injected as `Bearer` on future requests

**Client Credentials (server-to-server, no browser):**
1. Fill in Token URL, Client ID, Client Secret, Scope
2. Token is fetched via POST to the Token URL — no browser required
3. Injected as `Bearer`

All tokens are stored in **VS Code SecretStorage** (the OS keychain) — never written to plain JSON files.

### AWS Signature V4

For AWS services (API Gateway, S3, Lambda URL, etc.):

| Field | Example |
|---|---|
| Access Key | `AKIAIOSFODNN7EXAMPLE` |
| Secret Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| Region | `us-east-1` |
| Service | `execute-api` |

The `Authorization`, `X-Amz-Date`, and `X-Amz-Content-Sha256` headers are computed per-request using HMAC-SHA256.

---

## Environment Variables

Environments let you parameterise requests so the same collection works across dev, staging, and prod.

### Creating an Environment

1. Sidebar → **Environments** tab
2. Click **+ New Environment** (the `+` icon in the panel title)
3. Name the environment (e.g. `Development`, `Production`)
4. Add variables as key-value pairs:

| Key | Value |
|---|---|
| `base_url` | `https://api.dev.example.com` |
| `token` | `eyJhbGci...` |
| `user_id` | `42` |

### Activating an Environment

Use the **environment dropdown** in the top bar of the Open Post panel to select the active environment. The active environment's variables are used for all `{{variable}}` interpolation.

To change the active environment from the sidebar: right-click an environment → **Set Active** (or click the rocket icon).

### Using Variables

Variables work in the URL, any header value, any body text, auth fields:

```
URL:     {{base_url}}/users/{{user_id}}
Header:  Authorization: Bearer {{token}}
Body:    { "email": "{{user_email}}", "org": "{{org_id}}" }
```

If a variable is referenced but not defined in the active environment, it is left as the literal `{{variable_name}}` text.

### Storing Environments

Environments are saved to `.openpost/environments.json` in the workspace root. **Commit this file** to share environments with your team. Sensitive values (tokens, secrets) should use placeholder names and be set locally without committing actual values.

### Variable Resolution Priority

When the same variable key exists in multiple places, the resolution order (highest → lowest priority) is:

1. Script-set values (`environment.set(key, value)` during pre-request script)
2. Active environment variables
3. Collection-level variables (planned — stored in `Collection.variables`)
4. Fallback: the literal `{{key}}` text remains unchanged

---

## Collections & Folders

Collections organise and persist your requests.

### Structure

```
My API Collection
├── Auth
│   ├── POST  Login
│   ├── POST  Register
│   └── POST  Refresh Token
├── Users
│   ├── GET   List Users
│   ├── POST  Create User
│   ├── GET   Get User by ID
│   └── DELETE Delete User
└── GET  Health Check
```

Collections → Folders → Requests (two levels of nesting: collection and folder).

### Operations

| Operation | How to trigger |
|---|---|
| New collection | Click **⊕** icon in Collections panel title bar |
| Import Postman | Click **import** icon in Collections panel title bar |
| Import OpenAPI | Click **file-code** icon in Collections panel title bar |
| New request | Right-click a collection → **New Request** (inline icon) |
| Open an existing request | Click it in the tree |
| Rename a request | Right-click request → **Rename** (inline icon) |
| Save current request | Click **Save ▾** in the request builder → choose collection |
| Update a saved request | Click **Save** (no dropdown) — updates in-place |
| Export collection | Right-click collection → **Export Collection** (inline icon) |
| Delete collection | Right-click collection → **Delete** (inline icon) |

### Saving a Request

Click **Save ▾** and pick a destination collection. The request is stored with its current name. If you loaded it from a collection and want to update it, click **Save** (without the dropdown) — it updates in-place.

### Collection Variables

Each collection has a `variables` array in storage. These are scoped to the collection and can be used inside any request in that collection. Edit them via the webview (Environment section within a collection — if surfaced by the UI) or directly in `.openpost/collections.json`.

### Git Friendly

`.openpost/collections.json` is a plain JSON file. Commit it to share your collections with teammates.

---

## Response Viewer

The bottom panel shows the most recent HTTP response.

### Status Bar

```
 200 OK    342ms    1.2 KB    [Copy]
```

- Status code with a colour indicator (green 2xx, yellow 3xx, red 4xx/5xx)
- Response time in milliseconds
- Response body size in bytes / KB / MB
- **Copy** — copies the raw body to the clipboard

### Body Tab View Modes

| Mode | Description |
|---|---|
| **Pretty** | Auto-formatted, syntax-highlighted JSON. Falls back to raw text for non-JSON. |
| **Raw** | Unformatted response body exactly as received |
| **Tree** | Collapsible JSON tree — expand/collapse individual nodes to explore deeply nested structures |
| **Preview** | Renders the response as HTML inside an iframe — useful for HTML responses |

### Headers Tab

Shows all response headers as a two-column table (name / value).

### Diff Mode

Click the **clock icon** next to the status to open a history dropdown. Select any past response for the same URL to diff against the current one — deletions in red, additions in green.

---

## Request History

Every time you click Send, the request and its full response are saved automatically.

- Browse history in **Sidebar → History tab**
- Each entry shows: method badge, URL, timestamp, response status
- Click an entry to **replay** it — it loads into the request builder with all original fields
- **Compare / browse** — click the clock in the response viewer to open the per-URL history dropdown
- **Delete selected history** — use the trash icon beside the response-panel history dropdown
- **Delete a single history entry** — use the trash icon in the webview History sidebar or the VS Code History tree
- **Clear History** — gear icon → "Clear All History" → confirm dialog wipes everything

History is saved to `.openpost/history.json`. You may want to add this file to `.gitignore`.

### When the response dropdown appears

The history dropdown in the response panel appears as soon as the current request URL has at least one saved history entry. The menu is scoped to the exact URL string currently in the request editor.

---

## Pre-Request & Test Scripts

Under the **Scripts** tab. Write JavaScript that runs before or after (or both) the HTTP request.

### Available API

Everything available inside a script:

```javascript
// REQUEST (read/write — pre-request script)
request.url        // current URL string
request.method     // HTTP method
request.headers    // array of { key, value, enabled }
request.body       // RequestBody object

// RESPONSE (read-only — test script only)
response.status      // HTTP status code, e.g. 200
response.statusText  // e.g. "OK"
response.headers     // object of response headers
response.body        // raw response body string
response.json()      // parses body as JSON (throws if not JSON)
response.time        // milliseconds
response.size        // bytes

// ENVIRONMENT
environment.get('key')         // read a variable from the active env
environment.set('key', 'val')  // write to the active env (this session)

// CONSOLE
console.log('message', value)         // appears in the script output log
console.assert(condition, 'message')  // fails loudly if condition is false
```

### Pre-Request Script Example

```javascript
// Inject a dynamic timestamp header
request.headers.push({
  key: 'X-Timestamp',
  value: String(Date.now()),
  enabled: true,
});

// Read a token from the environment and set an auth header
const token = environment.get('token');
if (token) {
  request.headers.push({ key: 'Authorization', value: 'Bearer ' + token, enabled: true });
}
```

### Test Script Example

```javascript
// Assert status
console.assert(response.status === 201, 'Expected 201 Created, got ' + response.status);

// Parse response JSON
const body = response.json();
console.assert(body.id !== undefined, 'Response missing id field');
console.log('Created ID:', body.id);

// Store for use in subsequent requests
environment.set('created_id', String(body.id));
```

### Security

Scripts run inside Node.js `vm.createContext()`:
- **No** `require()` — cannot import Node.js modules
- **No** `process` — cannot access environment variables or exit the process
- **No** file system access
- Execution is hard-limited to **5 seconds** — long-running scripts are killed

Script output (console.log and assertion results) appears appended to the response body after the separator `--- Test Output ---`.

---

## Code Export

Click the **`</>` Code** button (top-right area of the request builder) to slide open the code export panel.

The panel displays the current request as a copy-paste–ready snippet in the language you select. It **updates live** as you modify the URL, headers, body, or method.

### Supported Languages

| Label | Identifier | Notes |
|---|---|---|
| cURL | `curl` | Copy-paste into any terminal |
| JavaScript – Fetch | `javascript-fetch` | Works in browsers and Node.js 18+ |
| JavaScript – Axios | `javascript-axios` | Requires `npm install axios` |
| Python – Requests | `python-requests` | Requires `pip install requests` |
| Python – http.client | `python-http` | Standard library — no install needed |
| Go | `go` | Uses `net/http` from the standard library |
| Java – HttpClient | `java` | Java 11+ standard library |
| C# – HttpClient | `csharp` | .NET standard library |
| Ruby – Net::HTTP | `ruby` | Standard library |
| PHP – cURL | `php` | Requires cURL extension (usually installed) |
| Rust – reqwest | `rust` | Add `reqwest` to `Cargo.toml` |
| Swift – URLSession | `swift` | Standard library — iOS & macOS |

### Sample Response Comment

If a successful response is available, it is appended to the snippet as a comment:

```python
# Sample Response (200 OK):
# {
#   "id": 1,
#   "title": "Hello World"
# }
```

### Syntax Highlighting

The code panel has a built-in syntax highlighter (no external library). It colourises keywords, strings, numbers, and comments using the active VS Code theme colours.

---

## AI Prompt Generator

In the code panel, switch the toggle from **Code** to **Prompt**.

This generates a structured plain-text prompt you can paste directly into an AI assistant (ChatGPT, Claude, GitHub Copilot Chat, etc.) without having to manually describe your request.

### Prompt Dialects

Select a dialect to focus the generated prompt:

| Dialect | What it asks the AI to do |
|---|---|
| **Explain API** | Describe what this endpoint does and how to use it |
| **Write Integration** | Write complete, production-ready integration code |
| **Debug Response** | Help diagnose why the response looks the way it does |
| **Write Tests** | Generate a comprehensive test suite for this endpoint |
| **Generate Docs** | Produce API documentation (OpenAPI/markdown/etc.) |

The prompt always includes: method, full URL, all enabled headers, body content, authentication type, and (when available) the response with status code.

---

## OpenAPI / Swagger Import

Import an entire API specification as a collection in one step.

**How to import:**
- Click the **file-code** icon in the Collections panel title bar, **or**
- Open the Command Palette → `Import OpenAPI / Swagger`

Supports:
- **OpenAPI 3.x** — JSON or YAML
- **Swagger 2.0** — JSON or YAML

### What Gets Imported

For each endpoint in the spec:

| Spec element | Import result |
|---|---|
| `operationId` / `summary` | Request name |
| `method` + `path` | Method + URL with `{{param}}` placeholders |
| `parameters` (query) | Params tab rows (required = enabled, optional = disabled) |
| `parameters` (header) | Headers tab rows |
| `requestBody` schema | JSON body pre-populated with example values |
| `tags` | Folder names |
| `securitySchemes` | Auth type auto-detected (Bearer, API Key, OAuth2) |

### Auto-Created Environment

An environment is created alongside the collection with:
- `base_url` → the spec's first server URL
- One variable for each path parameter name (e.g. `{userId}` → `user_id` variable, empty value)

---

## Postman Collection Import / Export

### Export

Right-click any collection → **Export Collection**

Saves a **Postman Collection v2.1** JSON file that you can import into Postman, Insomnia, or any compatible tool.

What is exported:
- All folders and subfolders
- All requests with method, URL, headers, body (JSON/form/urlencoded/graphql), and auth

### Import

Click the **import** icon in the Collections panel title bar.

Reads a **Postman Collection v2.1** JSON file.

Mapping:

| Postman field | Open Post result |
|---|---|
| `item` with subitems | Folder |
| `item` without subitems | Request |
| `request.url.raw` | URL |
| `request.header` | Headers |
| `request.body.mode === 'raw'` | JSON/raw/XML body |
| `request.body.mode === 'urlencoded'` | URL Encoded body |
| `request.body.mode === 'formdata'` | Form Data body |
| `request.body.mode === 'graphql'` | GraphQL body |
| `request.auth.type === 'bearer'` | Bearer |
| `request.auth.type === 'basic'` | Basic |
| `request.auth.type === 'apikey'` | API Key |

---

## Settings

Click the **⚙ gear icon** in the top bar of the Open Post panel.

| Setting | Default | Description |
|---|---|---|
| **SSL Verification** | On | Verify SSL certificates when making HTTPS requests. Turn off for local dev servers with self-signed certs |
| **Clear All History** | — | Wipes the entire history (shown with a confirm dialog before deleting) |

---

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|---|---|---|
| Open Open Post | `Ctrl+Alt+P` | `Cmd+Alt+P` |
| Send request | `Ctrl+Enter` | `Cmd+Enter` |

---

## Snapshots

Snapshots let you **save and revisit named API contracts** — a fixed `baseRequest` definition with request/response records filed under it over time. Unlike Request History (which is a flat chronological log), a Snapshot is a named container tied to a saved request.

### Key Concepts

| Term | Meaning |
|---|---|
| **Snapshot** | A named container holding one canonical `baseRequest` and zero or more records |
| **Record** | A single saved request + response pair filed under a snapshot, timestamped at capture time |
| **Contract name** | The snapshot's display name. Defaults to `{request name} {date-time}` if left blank |

### Automatic Snapshotting

Once a request is saved into a collection:

1. Open Post automatically creates a snapshot contract for that saved request if it does not already exist.
2. Every later **Send** for that same saved request automatically appends a new snapshot record.

This matching is based on the saved request `id`, not only the URL, so edits to the saved request continue writing to the same snapshot.

### Creating a Snapshot Contract

1. Build and configure a request in the request builder.
2. Save the request into a collection first.
3. Click the **bookmark (🔖) icon** in the save-button row (next to the save buttons).
4. The snapshot panel opens. Stay on the **New Contract** tab.
5. Optionally enter a custom name. Leave blank to use the default: `{request name} {current date-time}`.
6. Click **Save Contract**.

The snapshot is immediately visible in the **Snapshots** sidebar tab and in the VS Code Activity Bar tree under the Snapshots view.

If the request has not yet been saved into a collection, Open Post blocks manual snapshotting and prompts you to save the request first.

### Adding a Record to an Existing Snapshot

1. Send a request (you must have a response available).
2. Click the **bookmark icon** in the save-button row.
3. Switch to the **Add Record** tab.
4. Select the target snapshot from the dropdown.
5. Click **Add Record**.

This saves the current request and the most recent response as a new record under that snapshot.

For saved requests, this manual step is optional because sending the request already auto-adds a record to its matching snapshot.

### Viewing Records

In the webview **Snapshots** sidebar tab:
- Each snapshot row shows its name, creation date, and record count.
- Click a snapshot row to expand it and reveal all its records.
- Each record shows method badge, HTTP status, URL, and time-of-capture.
- Click any record to **load it into the active tab** — the request fields populate and the response is shown in the response viewer.

In the VS Code Activity Bar **Snapshots** tree:
- Snapshot entries are collapsible; records appear as children.
- Clicking a record opens the Open Post panel and loads the record.

A **blue banner** appears at the top of the response viewer while viewing a snapshot record, showing the snapshot name and record timestamp. Click **✕** on the banner to dismiss it.

### Renaming a Snapshot

- **Sidebar panel**: Click the **pencil icon** on the snapshot row → type a new name → press `Enter` or click away.
- **VS Code tree**: Right-click the snapshot → **Rename Snapshot**.

### Deleting Snapshots and Records

- **Delete a snapshot**: Click the trash icon on the snapshot header row (confirms before deleting all its records).
- **Delete a single record**: Hover a record row → click the trash icon that appears on the right.
- **VS Code tree**: Right-click a snapshot or record → **Delete Snapshot** / **Delete Record**.

### Storage

Snapshots are stored in your workspace at:
```
.openpost/snapshots.json
```

Limits to prevent unbounded growth:
- Maximum **200 snapshots** per workspace.
- Maximum **100 records** per snapshot.

Older entries beyond these limits are trimmed automatically when new ones are saved.

### Snapshot vs History

| | Request History | Snapshots |
|---|---|---|
| **Populated by** | Automatically, every time you send a request | Automatically for saved requests, plus manual bookmark actions |
| **Organised by** | Time (flat list) | Saved request contract (`baseRequest.id`) |
| **Purpose** | Quick lookup and replay of previous calls | Persistent contract tracking for saved endpoints |
| **Limit** | 500 entries (trimmed automatically) | 200 snapshots × 100 records each |
