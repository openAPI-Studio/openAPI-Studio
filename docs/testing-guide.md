# Testing Guide

Open Post includes a GUI-based test builder for validating API responses — no code required. Configure assertions, extract variables, and view results all within the extension.

---

## Quick Start

1. Open a request in Open Post
2. Click the **Tests** tab (between Auth and Scripts)
3. Click **+ Add Test**
4. Select a source, operator, and expected value
5. Send the request
6. Check the **Tests** tab in the response panel to see results

---

## Test Assertions

Each test row has four parts:

| Field | Description |
|-------|-------------|
| **Source** | What to check (status code, JSON path, header, etc.) |
| **Property** | Additional specifier (JSON path expression, header name, search text) |
| **Operator** | How to compare (equals, contains, greater than, etc.) |
| **Expected** | The value you expect |

### Sources

#### Response Group
| Source | Description | Property Field |
|--------|-------------|----------------|
| Status Code | HTTP status (200, 404, etc.) | — |
| Response Time (ms) | Round-trip time in milliseconds | — |
| Response Size | Body size in bytes | — |
| Response Body | Full response body as string | — |
| Body Contains | Check if body contains a string | Search text |
| Body Is JSON | Check if body is valid JSON | — |
| Body Schema | Validate body against JSON schema | — |

#### JSON Group
| Source | Description | Property Field |
|--------|-------------|----------------|
| JSON Path | Extract a value from JSON response | Path expression |

#### Headers Group
| Source | Description | Property Field |
|--------|-------------|----------------|
| Header Value | Value of a specific response header | Header name |
| Content-Type | Content-Type header value | — |
| Content-Length | Content-Length header value | — |

### Operators

| Operator | Description | Works With |
|----------|-------------|------------|
| Equals | Exact match (type-aware: compares numbers as numbers) | All |
| Not Equals | Not an exact match | All |
| Greater Than | Numeric comparison | Numbers |
| Greater or Equal | Numeric comparison | Numbers |
| Less Than | Numeric comparison | Numbers |
| Less or Equal | Numeric comparison | Numbers |
| Contains | String contains substring | Strings |
| Not Contains | String does not contain substring | Strings |
| Matches (Regex) | Matches a regular expression | Strings |
| Not Matches | Does not match regex | Strings |
| Is Empty | Value is empty, null, or undefined | All |
| Is Not Empty | Value exists and is not empty | All |
| Exists | Value is present in response | JSON Path, Headers |
| Not Exists | Value is not present | JSON Path, Headers |
| Is Type | Check JavaScript type | All |

### Type Checking

Use the **Is Type** operator with one of these expected values:
- `string`
- `number`
- `boolean`
- `object`
- `array`

---

## JSON Path Expressions

JSON Path lets you navigate into the response body. Given this response:

```json
{
  "data": {
    "user": {
      "id": 42,
      "name": "Jane",
      "roles": ["admin", "editor"]
    },
    "items": [
      { "id": 1, "status": "active" },
      { "id": 2, "status": "inactive" }
    ]
  },
  "meta": {
    "total": 2
  }
}
```

| Path | Result |
|------|--------|
| `data.user.id` | `42` |
| `data.user.name` | `"Jane"` |
| `data.user.roles[0]` | `"admin"` |
| `data.items[1].status` | `"inactive"` |
| `meta.total` | `2` |
| `data.items[0]` | `{"id": 1, "status": "active"}` |

Bracket notation also works for keys with special characters:
- `data["user"]` — same as `data.user`
- `data["key with spaces"]` — keys containing spaces

---

## Example Test Configurations

### Basic API Validation
| Source | Property | Operator | Expected |
|--------|----------|----------|----------|
| Status Code | | Equals | `200` |
| Response Time (ms) | | Less Than | `1000` |
| Body Is JSON | | Equals | `true` |
| Content-Type | | Contains | `application/json` |

### JSON Response Validation
| Source | Property | Operator | Expected |
|--------|----------|----------|----------|
| JSON Path | `data.id` | Exists | |
| JSON Path | `data.name` | Equals | `John` |
| JSON Path | `data.email` | Matches | `^[^@]+@[^@]+$` |
| JSON Path | `data.age` | Greater Than | `0` |
| JSON Path | `data.roles` | Is Type | `array` |

### Error Response Testing
| Source | Property | Operator | Expected |
|--------|----------|----------|----------|
| Status Code | | Equals | `401` |
| JSON Path | `error` | Exists | |
| JSON Path | `error.code` | Equals | `UNAUTHORIZED` |
| JSON Path | `error.message` | Is Not Empty | |

### SLA / Performance Testing
| Source | Property | Operator | Expected |
|--------|----------|----------|----------|
| Status Code | | Equals | `200` |
| Response Time (ms) | | Less Than | `500` |
| Response Size | | Less Than | `102400` |

### Schema Validation

Set source to **Body Schema** and put a JSON Schema in the expected field:

```json
{
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string" },
    "active": { "type": "boolean" }
  }
}
```

Supported schema keywords: `type`, `required`, `properties`, `items` (for arrays).

---

## Set Variables

Extract values from responses and save them as environment variables for use in subsequent requests.

### Configuration

Each variable extraction row has:

| Field | Description |
|-------|-------------|
| **Source** | Where to extract from |
| **Property** | Path, header name, or regex pattern |
| **→ Variable** | Environment variable name to save as |

### Variable Sources

| Source | Property | Example |
|--------|----------|---------|
| JSON Path | Dot/bracket path into JSON body | `data.token` |
| Header | Response header name | `X-Request-Id` |
| Full Body | — (uses entire body) | — |
| Regex | Pattern with capture group | `"token":"([^"]+)"` |

### Regex Capture Groups

When using the **Regex** source, the first capture group `()` is extracted. If no capture group exists, the full match is used.

| Pattern | Response Body | Extracted Value |
|---------|--------------|-----------------|
| `"id":(\d+)` | `{"id":42,"name":"test"}` | `42` |
| `Bearer\s+(\S+)` | `Bearer abc123xyz` | `abc123xyz` |
| `version/(\d+\.\d+)` | `api/version/2.1/users` | `2.1` |

### Using Extracted Variables

After the request runs, extracted values are saved to your active environment. Use them in any subsequent request:

- URL: `{{base_url}}/users/{{user_id}}`
- Header: `Authorization: Bearer {{auth_token}}`
- Body: `{"parent_id": "{{extracted_id}}"}`

### Chaining Requests

1. **Login request** — extract token:
   - Source: JSON Path | Property: `data.token` | → Variable: `auth_token`

2. **Authenticated request** — use token:
   - Header: `Authorization: Bearer {{auth_token}}`
   - Source: JSON Path | Property: `data.user.id` | → Variable: `user_id`

3. **User detail request** — use extracted ID:
   - URL: `{{base_url}}/users/{{user_id}}`

---

## Viewing Test Results

After sending a request, click the **Tests** tab in the response panel (bottom).

### Results Display

- **Progress bar** — visual pass/fail ratio
- **Summary** — "N passed, N failed"
- **Per-test rows**:
  - ✅ Green left border — test passed
  - ❌ Red left border — test failed, shows actual vs expected values

### Test Results in History

Test results are saved with each history entry. Click a history item in the sidebar to review past test results.

---

## Legacy Script Tests

The **Scripts** tab still supports JavaScript-based tests for advanced scenarios:

```javascript
// Pre-request script
request.headers["X-Timestamp"] = Date.now().toString();

// Test script
console.assert(response.status === 200, "Expected 200");
const body = response.json();
console.assert(body.data.length > 0, "Should have data");
environment.set("count", String(body.data.length));
```

GUI tests run first, then script tests. Both results appear in the response.
