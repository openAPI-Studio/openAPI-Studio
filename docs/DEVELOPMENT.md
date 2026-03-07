# Development Guide

How to build, run, debug, test, and contribute to Open Post.

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Node.js | 18.x | [nodejs.org](https://nodejs.org) |
| npm | 9.x | Bundled with Node.js |
| VS Code | 1.85.0 | [code.visualstudio.com](https://code.visualstudio.com) |
| Git | Any | [git-scm.com](https://git-scm.com) |

---

## Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/open-post/open-post.git
cd open-post

# 2. Install extension dependencies
npm install

# 3. Install webview dependencies
cd src/webview
npm install
cd ../..
```

---

## Project Scripts

All scripts are run from the **project root** unless noted.

### Root `package.json`

| Script | Command | What it does |
|---|---|---|
| `npm run build` | `npm run build:ext && npm run build:webview` | Full build (extension + webview) |
| `npm run build:ext` | `esbuild src/extension.ts --bundle ...` | Build extension only → `dist/extension.js` |
| `npm run build:webview` | `cd src/webview && npm run build` | Build React app only → `dist/webview/` |
| `npm run watch` | `npm run build:ext -- --watch` | Watch-rebuild extension on file changes |
| `npm run lint` | `eslint src --ext .ts,.tsx` | Lint all TypeScript |
| `npm run format` | `prettier --write "src/**/*.{ts,tsx}"` | Auto-format all source |
| `npm run test` | `vitest run` | Run the test suite |
| `npm run package` | `vsce package` | Produce a `.vsix` installer |

### Webview `src/webview/package.json`

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (browser preview only) |
| `npm run build` | Production build → `../../dist/webview/` |
| `npm run preview` | Preview the production build in a browser |

---

## Running During Development

### Step 1: Build everything

```bash
npm run build
```

### Step 2: Launch the Extension Development Host

1. Open the project root in VS Code (`code .`)
2. Press **F5** — or go to **Run → Start Debugging**
3. VS Code opens a **second window** called the *Extension Development Host*
4. In that second window, open any folder (`File → Open Folder`)
5. Press `Ctrl+Alt+P` / `Cmd+Alt+P` — or click the ⚡ icon in the activity bar

The extension running in the debug host is the one you built from source.

### Making Changes and Seeing Them

**Extension TypeScript changes** (`src/*.ts`, `src/**/*.ts` except webview):
```bash
# Option A: manual rebuild
npm run build:ext
# Then: Ctrl+Shift+F5 in VS Code to restart the Extension Development Host

# Option B: use watch mode (auto-rebuilds on save)
npm run watch
# You still need to Ctrl+Shift+F5 to restart the host after each rebuild
```

**WebView React changes** (`src/webview/src/**`):
```bash
npm run build:webview
# Then: in the Extension Development Host, right-click the Open Post panel → Reload WebView
# or press Ctrl+R inside the panel
```

> **Why can't I use Vite's HMR (hot reload)?** Vite's dev server serves assets over HTTP, but VS Code WebView requires assets to be served from the `vscode-webview://` scheme. HMR is not compatible with this constraint. Every webview change requires a rebuild + reload.

---

## Directory Structure of the Build Output

```
dist/
├── extension.js         → Bundled extension (all Node.js source in one file)
├── extension.js.map     → Source map for debugging
└── webview/
    ├── index.html       → WebView HTML shell
    └── assets/
        ├── main.js      → Bundled React app
        └── main.css     → Tailwind styles
```

Filenames are **deterministic (no content hashes)**. This is required because `webviewProvider.ts` rewrites paths inside `index.html` using a simple regex — hashed filenames would break this.

---

## esbuild Configuration (Extension)

The extension is bundled by **esbuild** (not tsc directly):

```bash
esbuild src/extension.ts \
  --bundle \
  --outfile=dist/extension.js \
  --external:vscode \      # VS Code API is provided at runtime — don't bundle it
  --format=cjs \           # CommonJS — required by VS Code Extension Host
  --platform=node \        # Target Node.js built-ins
  --sourcemap
```

The `--bundle` flag means all `import`s are resolved and inlined — the output is a single file.

---

## Vite Configuration (WebView)

`src/webview/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/webview',  // Output relative to src/webview/
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Deterministic filenames — required for WebView URI rewriting
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
```

---

## TypeScript Configuration

### Extension (`tsconfig.json` at root)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "exclude": ["src/webview", "node_modules"]
}
```

The webview directory is **excluded** from the root tsconfig — it has its own compiler config.

### WebView (`src/webview/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Key difference: `DOM` lib (browser APIs) and `jsx: "react-jsx"` are present here but not in the extension config.

---

## Debugging

### Extension-Side Logs

Use `console.log()` anywhere in the extension source. In VS Code:

```
View → Output → select "Open Post" from the dropdown
```

Or use VS Code's built-in debugger — F5 attaches the debugger to the extension host automatically. Set breakpoints in `.ts` files and they will be hit via source maps.

### WebView-Side Logs

Use `console.log()` anywhere in React components or utilities. In the Extension Development Host:

```
Right-click the Open Post panel → "Open WebView Developer Tools"
```

This opens a Chromium DevTools window where you can inspect the DOM, set breakpoints in the bundled JS, and see console output.

### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Panel shows "Webview not built" | `dist/webview/` is missing | Run `npm run build:webview` |
| Changes not visible | Old build still loaded | Rebuild + reload extension host |
| `{{variable}}` shown literally in response URL | No active environment selected | Pick an environment in the top bar dropdown |
| Script output not visible | Script ran without `console.log` | Add `console.log()` calls; output appears after `--- Test Output ---` in the response body |
| Collections not saving | No workspace folder open | Open a folder in VS Code — without one, `.openpost/` has nowhere to live |
| SSL error on HTTPS request | Self-signed cert | Disable SSL Verification in ⚙ Settings |

---

## Testing

```bash
npm run test
```

Tests use **Vitest**. Test files live alongside source files as `*.test.ts`.

Currently tested areas:
- `curlParser.ts` — cURL command parsing
- `interpolation.ts` — variable interpolation
- `openApiParser.ts` — OpenAPI spec parsing

---

## Packaging for Distribution

```bash
# Install the vsce CLI if needed
npm install -g @vscode/vsce

# Build first
npm run build

# Package → produces open-post-x.x.x.vsix
npm run package
```

### Install the .vsix locally

```bash
code --install-extension open-post-x.x.x.vsix
```

Or: VS Code → Extensions panel → `...` menu → **Install from VSIX...**

### Publishing to Marketplace

```bash
vsce publish
```

Requires a Personal Access Token set up at [marketplace.visualstudio.com](https://marketplace.visualstudio.com).

---

## How to Add a New Feature

### New VS Code command

1. Register in `src/extension.ts`:
   ```typescript
   vscode.commands.registerCommand('openPost.myCommand', () => { /* handler */ })
   ```
2. Declare in `package.json` under `contributes.commands`:
   ```json
   { "command": "openPost.myCommand", "title": "My Command", "category": "Open Post" }
   ```
3. Optionally bind a key in `contributes.keybindings`.

### New WebView → Extension message type

1. Add to `MessageToExtension` union in `src/core/types.ts`
2. Add the same type to `src/webview/src/types/messages.ts`
3. Handle in `webviewProvider.ts` inside `handleMessage()`:
   ```typescript
   case 'myNewType': {
     // handle msg.someField
     break;
   }
   ```
4. Post the message from a React component:
   ```typescript
   import { postMessage } from '../types/messages';
   postMessage({ type: 'myNewType', someField: value });
   ```

### New code export language

1. Add to `CodeLanguage` union in `src/webview/src/utils/codeGen.ts`
2. Add to the `LANGUAGES` array
3. Write a generator function `genMyLang(req, url, hdrs, body, response)`
4. Add the `case` in `generateCode()`:
   ```typescript
   case 'my-lang': return genMyLang(req, url, hdrs, body, response);
   ```

### New auth type

1. Add to `AuthType` in `src/core/types.ts` and `src/webview/src/types/messages.ts`
2. Add config fields to `AuthConfig`
3. Add UI form in `src/webview/src/components/AuthPanel.tsx`
4. Add handling in `src/auth/authHandler.ts` inside `applyAuth()`
5. Update `describeAuth()` in `src/webview/src/utils/promptGen.ts`

---

## Contributing

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/open-post.git
cd open-post

# Create a feature branch
git checkout -b feat/my-feature

# Make changes, build, and test
npm run build
# Press F5 to test in Extension Development Host

# Run lint and tests before committing
npm run lint
npm run test

# Commit using conventional commits
git commit -m "feat: add HMAC auth support"

# Push and open a Pull Request
git push origin feat/my-feature
```

### Commit Message Convention

| Prefix | When to use |
|---|---|
| `feat:` | New user-facing feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code restructure with no behaviour change |
| `test:` | Adding or updating tests |
| `chore:` | Build scripts, dependencies, config |

### Code Style Rules

- **Strict TypeScript** — no `any`, no type assertions unless unavoidable
- **No external HTTP client** — use Node.js built-in `http`/`https`
- **No CSS-in-JS** — use Tailwind utility classes and VS Code CSS variables
- Keep React components **small and single-purpose** — extract sub-components when a file exceeds ~200 lines
- Types defined in `src/core/types.ts` must be manually mirrored in `src/webview/src/types/messages.ts` — keep them in sync
