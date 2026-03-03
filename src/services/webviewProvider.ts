import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MessageToExtension, MessageToWebview, Collection, HistoryEntry, ApiRequest } from '../core/types';
import { executeRequest } from '../core/httpClient';
import { applyAuth } from '../auth/authHandler';
import { runScript } from '../scripting/sandbox';
import * as store from '../storage/fileStore';

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

  public sendToWebview(msg: MessageToWebview | { type: 'loadRequest'; data: ApiRequest }) {
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

          const response = await executeRequest(request, envVars);

          // Test script
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
      case 'saveRequest': {
        const collections = store.loadCollections();
        const col = collections.find(c => c.id === msg.data.collectionId);
        if (col) {
          const existing = col.requests.findIndex(r => r.id === msg.data.request.id);
          if (existing >= 0) { col.requests[existing] = msg.data.request; }
          else { col.requests.push(msg.data.request); }
          store.saveCollections(collections);
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
<body><h2>⚡ Open Post</h2><p>Webview not built. Run <code>npm run build:webview</code> first.</p></body>
</html>`;
    }
  }

  private dispose() {
    OpenPostPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) { d.dispose(); }
  }
}
