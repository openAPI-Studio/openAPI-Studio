import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MessageToExtension, MessageToWebview, Collection, CollectionFolder, HistoryEntry, ApiRequest, CookieEntry } from '../core/types';
import { executeRequest } from '../core/httpClient';
import { applyAuth } from '../auth/authHandler';
import { runScript } from '../scripting/sandbox';
import { parseSetCookieHeader, getMatchingCookies, mergeCookies, serializeCookieHeader } from '../core/cookieJar';
import { evaluateTests, extractVariables } from '../core/testRunner';
import * as store from '../storage/fileStore';

/** Resolve a folder path like ['folderId1', 'folderId2'] to the nested folder node */
function resolveFolder(col: Collection, folderPath?: string[]): { folders: CollectionFolder[]; requests: ApiRequest[] } | null {
  if (!folderPath || folderPath.length === 0) return col;
  let current: { folders: CollectionFolder[]; requests: ApiRequest[] } = col;
  for (const fid of folderPath) {
    const found = current.folders.find(f => f.id === fid);
    if (!found) return null;
    current = found;
  }
  return current;
}

export class OpenPostPanel {
  public static currentPanel: OpenPostPanel | undefined;
  public static onDataChanged: (() => void) | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg: MessageToExtension) => this.handleMessage(msg),
      null,
      this.disposables
    );
  }

  public static show(extensionUri: vscode.Uri) {
    if (OpenPostPanel.currentPanel) {
      OpenPostPanel.currentPanel.panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'openPost',
      'Open Post',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      }
    );
    OpenPostPanel.currentPanel = new OpenPostPanel(panel, extensionUri);
  }

  public sendToWebview(msg: MessageToWebview | { type: 'loadRequest'; data: ApiRequest; collectionId: string | null }) {
    this.panel.webview.postMessage(msg);
  }

  private postMessage(msg: MessageToWebview) {
    this.panel.webview.postMessage(msg);
  }

  private notifyDataChanged() {
    OpenPostPanel.onDataChanged?.();
  }

  private async handleMessage(msg: MessageToExtension) {
    switch (msg.type) {
      case 'sendRequest': {
        try {
          const envs = store.loadEnvironments();
          const activeId = store.loadActiveEnvironmentId();
          const activeEnv = envs.find(e => e.id === activeId);
          const envVars: Record<string, string> = {};
          if (activeEnv) {
            for (const v of activeEnv.variables.filter(v => v.enabled)) {
              envVars[v.key] = v.value;
            }
          }

          let request = msg.data;

          // Apply auth
          const authResult = applyAuth(request, envVars);
          for (const [k, v] of Object.entries(authResult.headers)) {
            request.headers.push({ key: k, value: v, enabled: true });
          }
          for (const [k, v] of Object.entries(authResult.queryParams)) {
            request.params.push({ key: k, value: v, enabled: true });
          }

          // Pre-request script
          if (request.preRequestScript) {
            const result = runScript(request.preRequestScript, { request, environment: envVars });
            if (result.updatedRequest) { request = result.updatedRequest; }
            if (result.environmentUpdates) {
              Object.assign(envVars, result.environmentUpdates);
            }
          }

          // Attach cookies from jar
          const cookiesEnabled = store.loadCookiesEnabled();
          if (cookiesEnabled) {
            const jar = store.loadCookies();
            const resolvedUrl = request.url.replace(/\{\{(\w+)\}\}/g, (_, k) => envVars[k] ?? `{{${k}}}`);
            const matching = getMatchingCookies(jar, resolvedUrl);
            if (matching.length) {
              const existing = request.headers.find(h => h.enabled && h.key.toLowerCase() === 'cookie');
              if (existing) {
                existing.value = existing.value + '; ' + serializeCookieHeader(matching);
              } else {
                request.headers.push({ key: 'Cookie', value: serializeCookieHeader(matching), enabled: true });
              }
            }
          }

          const rawResponse = await executeRequest(request, envVars, msg.sslVerification !== false);
          const response = rawResponse as typeof rawResponse & { setCookieHeaders?: string[] };

          // Parse and store response cookies
          let responseCookies: CookieEntry[] = [];
          if (cookiesEnabled && response.setCookieHeaders?.length) {
            const resolvedUrl = request.url.replace(/\{\{(\w+)\}\}/g, (_, k) => envVars[k] ?? `{{${k}}}`);
            responseCookies = response.setCookieHeaders
              .map(h => parseSetCookieHeader(h, resolvedUrl))
              .filter((c): c is CookieEntry => c !== null);
            if (responseCookies.length) {
              const jar = store.loadCookies();
              store.saveCookies(mergeCookies(jar, responseCookies));
            }
          }
          response.cookies = responseCookies;
          delete (response as any).setCookieHeaders;

          // Extract variables from response
          if (request.setVariables?.length) {
            const extracted = extractVariables(request.setVariables, response);
            if (Object.keys(extracted).length && activeEnv) {
              for (const [k, v] of Object.entries(extracted)) {
                const existing = activeEnv.variables.find(ev => ev.key === k);
                if (existing) { existing.value = v; }
                else { activeEnv.variables.push({ key: k, value: v, enabled: true }); }
              }
              store.saveEnvironments(envs);
              this.postMessage({ type: 'environments', data: envs });
            }
          }

          // Evaluate GUI test rules
          if (request.testRules?.length) {
            response.testResults = evaluateTests(request.testRules, response);
          }

          // Test script (legacy)
          if (request.testScript) {
            const result = runScript(request.testScript, { request, response, environment: envVars });
            if (result.logs.length > 0) {
              response.body = response.body + '\n\n--- Test Output ---\n' + result.logs.join('\n');
            }
          }

          // Save to history
          const history = store.loadHistory();
          history.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            request,
            response,
          });
          store.saveHistory(history);
          this.notifyDataChanged();

          this.postMessage({ type: 'response', data: response });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          this.postMessage({ type: 'error', message });
        }
        break;
      }
      case 'loadCollections':
        this.postMessage({ type: 'collections', data: store.loadCollections() });
        break;
      case 'createCollection': {
        const collections = store.loadCollections();
        collections.push({ id: Date.now().toString(), name: msg.name, folders: [], requests: [], variables: [] });
        store.saveCollections(collections);
        this.postMessage({ type: 'collections', data: collections });
        this.notifyDataChanged();
        break;
      }
      case 'deleteCollection': {
        const collections = store.loadCollections().filter(c => c.id !== msg.id);
        store.saveCollections(collections);
        this.postMessage({ type: 'collections', data: collections });
        this.notifyDataChanged();
        break;
      }
      case 'deleteRequest': {
        const collections = store.loadCollections();
        const col = collections.find(c => c.id === msg.collectionId);
        if (col) {
          const parent = resolveFolder(col, msg.folderPath);
          if (parent) {
            parent.requests = parent.requests.filter(r => r.id !== msg.requestId);
            store.saveCollections(collections);
            this.postMessage({ type: 'collections', data: collections });
            this.notifyDataChanged();
          }
        }
        break;
      }
      case 'createFolder': {
        const collections = store.loadCollections();
        const col = collections.find(c => c.id === msg.collectionId);
        if (col) {
          const parent = resolveFolder(col, msg.parentPath);
          if (parent) {
            parent.folders.push({ id: Date.now().toString(), name: msg.name, requests: [], folders: [] });
            store.saveCollections(collections);
            this.postMessage({ type: 'collections', data: collections });
            this.notifyDataChanged();
          }
        }
        break;
      }
      case 'deleteFolder': {
        const collections = store.loadCollections();
        const col = collections.find(c => c.id === msg.collectionId);
        if (col && msg.folderPath.length > 0) {
          const parentPath = msg.folderPath.slice(0, -1);
          const folderId = msg.folderPath[msg.folderPath.length - 1];
          const parent = resolveFolder(col, parentPath);
          if (parent) {
            parent.folders = parent.folders.filter(f => f.id !== folderId);
            store.saveCollections(collections);
            this.postMessage({ type: 'collections', data: collections });
            this.notifyDataChanged();
          }
        }
        break;
      }
      case 'saveRequest': {
        const collections = store.loadCollections();
        const col = collections.find(c => c.id === msg.data.collectionId);
        if (col) {
          const parent = resolveFolder(col, msg.data.folderPath);
          if (parent) {
            const existing = parent.requests.findIndex(r => r.id === msg.data.request.id);
            if (existing >= 0) { parent.requests[existing] = msg.data.request; }
            else { parent.requests.push(msg.data.request); }
            store.saveCollections(collections);
          }
        }
        this.postMessage({ type: 'collections', data: collections });
        this.notifyDataChanged();
        break;
      }
      case 'loadEnvironments':
        this.postMessage({ type: 'environments', data: store.loadEnvironments() });
        this.postMessage({ type: 'activeEnvironment', id: store.loadActiveEnvironmentId() });
        break;
      case 'saveEnvironment': {
        const envs = store.loadEnvironments();
        const idx = envs.findIndex(e => e.id === msg.data.id);
        if (idx >= 0) { envs[idx] = msg.data; } else { envs.push(msg.data); }
        store.saveEnvironments(envs);
        this.postMessage({ type: 'environments', data: envs });
        this.notifyDataChanged();
        break;
      }
      case 'deleteEnvironment': {
        const envs = store.loadEnvironments().filter(e => e.id !== msg.id);
        store.saveEnvironments(envs);
        this.postMessage({ type: 'environments', data: envs });
        this.notifyDataChanged();
        break;
      }
      case 'setActiveEnvironment':
        store.saveActiveEnvironmentId(msg.id);
        this.postMessage({ type: 'activeEnvironment', id: msg.id });
        this.notifyDataChanged();
        break;
      case 'loadHistory':
        this.postMessage({ type: 'history', data: store.loadHistory() });
        break;
      case 'clearHistory':
        store.saveHistory([]);
        this.postMessage({ type: 'history', data: [] });
        this.notifyDataChanged();
        break;
      case 'pickFile': {
        const uris = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Select File' });
        if (uris && uris.length > 0) {
          const filePath = uris[0].fsPath;
          const fileName = path.basename(filePath);
          this.panel.webview.postMessage({ type: 'filePicked', purpose: msg.purpose, filePath, fileName });
        }
        break;
      }
      case 'loadCookies':
        this.postMessage({ type: 'cookies', data: store.loadCookies() });
        break;
      case 'saveCookie': {
        const jar = store.loadCookies();
        const idx = jar.findIndex(c => c.domain === msg.data.domain && c.path === msg.data.path && c.name === msg.data.name);
        if (idx >= 0) { jar[idx] = msg.data; } else { jar.push(msg.data); }
        store.saveCookies(jar);
        this.postMessage({ type: 'cookies', data: jar });
        break;
      }
      case 'deleteCookie': {
        const jar = store.loadCookies().filter(c => !(c.domain === msg.domain && c.name === msg.name && c.path === msg.path));
        store.saveCookies(jar);
        this.postMessage({ type: 'cookies', data: jar });
        break;
      }
      case 'clearCookies':
        store.saveCookies([]);
        this.postMessage({ type: 'cookies', data: [] });
        break;
      case 'setCookiesEnabled':
        store.saveCookiesEnabled(msg.enabled);
        break;
      case 'exportCollection': {
        const { toPostmanFormat } = require('./collectionTree');
        const collections = store.loadCollections();
        const col = collections.find((c: any) => c.id === msg.collectionId);
        if (!col) break;
        const format = await vscode.window.showQuickPick(
          [{ label: 'Open Post JSON', value: 'openpost' }, { label: 'Postman v2.1', value: 'postman' }],
          { placeHolder: 'Export format' }
        );
        if (!format) break;
        const defaultName = col.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(`${defaultName}.json`), filters: { 'JSON': ['json'] } });
        if (!uri) break;
        const data = format.value === 'postman' ? JSON.stringify(toPostmanFormat(col), null, 2) : JSON.stringify(col, null, 2);
        fs.writeFileSync(uri.fsPath, data, 'utf-8');
        vscode.window.showInformationMessage(`Exported "${col.name}"`);
        break;
      }
      case 'importCollection': {
        const { fromPostmanFormat } = require('./collectionTree');
        const uris = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'JSON': ['json'] }, openLabel: 'Import' });
        if (!uris || uris.length === 0) break;
        try {
          const raw = fs.readFileSync(uris[0].fsPath, 'utf-8');
          const json = JSON.parse(raw);
          const collections = store.loadCollections();
          if (json.info && json.info.schema && json.item) {
            collections.push(fromPostmanFormat(json));
          } else if (json.id && json.name && json.requests !== undefined) {
            json.id = Date.now().toString();
            collections.push(json);
          } else {
            vscode.window.showErrorMessage('Unrecognized format. Supports Open Post JSON and Postman v2.1.');
            break;
          }
          store.saveCollections(collections);
          this.postMessage({ type: 'collections', data: collections });
          this.notifyDataChanged();
          vscode.window.showInformationMessage(`Collection imported`);
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        break;
      }
    }
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
    const indexPath = vscode.Uri.joinPath(distPath, 'index.html');

    try {
      let html = fs.readFileSync(indexPath.fsPath, 'utf-8');
      const baseUri = webview.asWebviewUri(distPath);
      html = html.replace(/(href|src)="\.?\/?/g, `$1="${baseUri}/`);
      return html;
    } catch {
      return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Open Post</title>
<style>body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px;}code{background:var(--vscode-textCodeBlock-background);padding:2px 6px;border-radius:3px;}</style>
</head>
<body><h2><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>Open Post</h2><p>Webview not built. Run <code>npm run build:webview</code> first.</p></body>
</html>`;
    }
  }

  private dispose() {
    OpenPostPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) { d.dispose(); }
  }
}
