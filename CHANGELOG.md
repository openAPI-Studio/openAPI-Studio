# Changelog

## 0.9.36 — 2026-03-15
- Global collections, environments, and history now visible in VS Code native tree views (sidebar)
- "Local" and "Global" grouping nodes in Collections, Environments, and History panels
- Full CRUD support for global items from the tree view (create, delete, rename, export, import, add folder/request)
- VS Code Settings integration — all plugin settings (SSL, Cookies, Collapsed Tabs, Grouped Tabs, Subtle Contracts) now available in Settings > Extensions > Open Post
- Bidirectional sync between VS Code Settings UI and webview settings popup
- Inline action buttons (export, subfolder, new request, delete) on global tree items

## 0.9.34 — 2026-03-14
- Completely rewritten code export engine with auth injection support for all auth types
- Added code generation for 11 languages: cURL, JavaScript (Fetch & Axios), Python (Requests & http.client), Go, Java, C#, Ruby, PHP, Rust, Swift
- Code export now resolves environment variables and includes auth headers/params
- Added unit tests for code generation
- Bug fixes for OAuth 2.0 and AWS Signature V4 auth handling

## 0.9.32 — 2026-03-08
- Session persistence — open tabs are saved and restored when the panel is reopened
- Last response from history is hydrated on session restore so you see results immediately
- Multi-language syntax highlighting in response viewer with line numbers and code folding
- Response schema extraction and clean status bar with expanded language support

## 0.9.28 — 2026-03-08
- Global collections, environments, and history stored in `~/.openpost/global/`
- Cross-window sync via file system watcher — changes in one VS Code window reflect in others
- Source scope tracking so requests save back to the correct local or global collection
- Global data refresh button in webview sidebar

## 0.9.13 — 2026-03-08
- Snapshot contracts — track response structure changes over time
- Snapshot records with request/response pairs for comparison
- Response type contract detection with variant prompts
- Subtle contracts mode for non-intrusive notifications
- Snapshot CRUD in sidebar and tree view (create, rename, delete, delete record)
- Full project documentation (Architecture, API Reference, Codebase Guide, Features, Development)

## 0.9.0 — 2026-03-06
- Introduced test builder with assertion support
- Cookie jar with automatic cookie storage and sending
- Tab bar improvements with grouped and collapsed tab modes
- Tab settings persistence (collapsed, grouping)
- UI polish and sidebar fixes

## 0.8.17 — 2026-03-05
- Added AI Prompt generator with 5 dialects (Explain, Integrate, Debug, Test, Document)
- Added extension icon
- Code export now resolves environment variables
- Fixed code generation for all body types
- Settings menu with SSL verification toggle and clear history
- Sidebar environment editor inputs no longer overflow
- Sidebar tabs always show labels, truncate in narrow widths
- History entries load full request + response when clicked
- Light theme and high contrast VS Code compatibility
- Resizable sidebar with collapsible tree nodes

## 0.8.5 — 2026-03-05
- Code export panel supporting 12 languages
- Header autocomplete with standard HTTP header values
- Request rename support from sidebar
- Query parameter sync between URL bar and params editor
- Confirm dialog for destructive actions
- Toast notification system

## 0.8.0 — 2026-03-05
- Initial release
- Full HTTP client (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- 8 body types (JSON, Form Data, URL Encoded, Raw, XML, GraphQL, Binary)
- 6 auth types (Basic, Bearer, API Key, OAuth 2.0, AWS Sig V4)
- Environment variables with {{variable}} syntax
- Collections with folder organization
- Response viewer with pretty/raw/tree modes
- Pre-request and test scripts
- Request history with per-URL filtering
- VS Code native theme integration

## 0.4.0 — 2026-03-03
- OpenAPI / Swagger import with automatic collection and environment creation
- cURL import support
- Postman collection import/export (v2.1 format)

## 0.1.0 — 2026-03-02
- First packaged release
- Core HTTP client with basic request/response flow
- Collection and environment management
- VS Code webview panel integration
