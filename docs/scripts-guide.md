# Scripts Guide

Open Post supports JavaScript scripts that run before and after each request. Scripts execute in a sandboxed Node.js environment with access to the request, response, and environment variables.

---

## Overview

| Script | When it runs | Use case |
|--------|-------------|----------|
| **Pre-request** | Before the request is sent | Modify headers, generate timestamps, read env vars |
| **Test** | After the response is received | Assert status codes, parse JSON, save values to env |

Scripts are written in the **Scripts** tab in the request builder.

---

## Available Objects

### `request`

Available in both pre-request and test scripts.

```javascript
request.url        // string — the request URL
request.method     // string — GET, POST, etc.
request.headers    // object — { "Content-Type": "application/json", ... }
request.body       // object — request body configuration
request.params     // array — query parameters
```

In pre-request scripts, you can modify the request:

```javascript
request.headers["X-Custom"] = "value";
request.headers["Authorization"] = "Bearer " + environment.get("token");
```

### `response`

Available only in test scripts.

```javascript
response.status      // number — HTTP status code (200, 404, etc.)
response.statusText  // string — status text ("OK", "Not Found", etc.)
response.headers     // object — { "content-type": "application/json", ... }
response.body        // string — raw response body
response.time        // number — response time in milliseconds
response.json()      // function — parse body as JSON, returns object
```

### `environment`

Available in both scripts. Reads from and writes to the active environment.

```javascript
environment.get("key")           // returns string value, or "" if not set
environment.set("key", "value")  // saves to active environment
```

Variables set with `environment.set()` are immediately available in subsequent requests using `{{key}}` syntax.

### `console`

```javascript
console.log("message", variable)           // output to test log
console.assert(condition, "error message") // logs message if condition is false
```

All `console.log` and failed `console.assert` output appears in the response body under `--- Test Output ---`.

---

## Pre-request Script Examples

### Add dynamic timestamp

```javascript
request.headers["X-Timestamp"] = Date.now().toString();
request.headers["X-Request-Id"] = Math.random().toString(36).slice(2);
```

### Attach auth token from environment

```javascript
const token = environment.get("auth_token");
if (token) {
  request.headers["Authorization"] = "Bearer " + token;
}
```

### Generate HMAC signature

```javascript
const secret = environment.get("api_secret");
const timestamp = Date.now().toString();
request.headers["X-Timestamp"] = timestamp;
request.headers["X-Signature"] = timestamp + ":" + secret;
```

### Conditionally set headers

```javascript
const env = environment.get("env_name");
if (env === "production") {
  request.headers["X-Rate-Limit"] = "strict";
}
```

---

## Test Script Examples

### Basic status check

```javascript
console.assert(response.status === 200, "Expected 200, got " + response.status);
```

### Parse and validate JSON

```javascript
const data = response.json();
console.assert(data.id !== undefined, "Response missing 'id' field");
console.assert(data.name === "John", "Expected name 'John', got '" + data.name + "'");
console.assert(Array.isArray(data.items), "Expected 'items' to be an array");
console.log("Found", data.items.length, "items");
```

### Save response values to environment

```javascript
const data = response.json();
environment.set("user_id", String(data.id));
environment.set("auth_token", data.token);
console.log("Saved user_id:", data.id);
```

### Performance check

```javascript
console.assert(response.time < 500, "Response too slow: " + response.time + "ms");
console.assert(response.status !== 0, "Request failed entirely");
```

### Check response headers

```javascript
const contentType = response.headers["content-type"] || "";
console.assert(contentType.includes("application/json"), "Expected JSON content type");

const cacheControl = response.headers["cache-control"];
if (cacheControl) {
  console.log("Cache-Control:", cacheControl);
}
```

### Chain requests (extract and reuse)

**Request 1 — Login (test script):**
```javascript
const data = response.json();
console.assert(data.token, "No token in response");
environment.set("auth_token", data.token);
environment.set("user_id", String(data.user.id));
console.log("Logged in as user", data.user.id);
```

**Request 2 — Get user (pre-request script):**
```javascript
const token = environment.get("auth_token");
request.headers["Authorization"] = "Bearer " + token;
```

---

## Execution Order

When you send a request, scripts execute in this order:

1. **Pre-request script** — can modify request headers, params, body, and env vars
2. **Request is sent** — with any modifications from step 1
3. **Response received**
4. **Variable extraction** — Set Variables from the Tests tab run first
5. **GUI test assertions** — Test rules from the Tests tab are evaluated
6. **Test script** — runs last, output appended to response body

---

## Sandbox Limitations

Scripts run in a Node.js `vm` sandbox for security:

- **5-second timeout** — scripts that take longer are killed
- **No imports** — `require()` and `import` are not available
- **No file access** — cannot read/write files
- **No network** — cannot make HTTP requests from scripts
- **No global state** — each script execution is isolated
- **Standard JS only** — no TypeScript, no JSX

The sandbox has access to basic JavaScript built-ins: `JSON`, `Math`, `Date`, `Array`, `Object`, `String`, `Number`, `RegExp`, `parseInt`, `parseFloat`, `isNaN`, `encodeURIComponent`, `decodeURIComponent`.

---

## Script Output

All output from `console.log()` and failed `console.assert()` appears appended to the response body:

```
{"id": 1, "name": "John"}

--- Test Output ---
Found 5 items
Saved user_id: 42
Assertion failed: Expected name 'Jane', got 'John'
```

This output is visible in the response Body tab.

---

## Tips

- Use the **snippet buttons** above each textarea to quickly insert common patterns
- Click **JavaScript Reference** to see all available objects and methods
- Use `console.log()` liberally for debugging — output is non-destructive
- Prefer the **GUI test builder** (Tests tab) for simple assertions — it's faster and results show in the Tests response tab
- Use scripts for complex logic that the GUI can't handle (loops, conditionals, computed values)
- `environment.set()` values persist across requests — useful for chaining auth flows
