import * as vscode from 'vscode';
import * as fs from 'fs';
import { loadCollections, saveCollections, loadGlobalCollections, saveGlobalCollections } from '../storage/fileStore';
import { Collection, CollectionFolder, ApiRequest, KeyValue, AuthConfig } from '../core/types';

type TreeItem = ScopeGroupItem | CollectionItem | FolderItem | RequestItem;

const METHOD_ICONS: Record<string, string> = {
  GET: 'arrow-down', POST: 'arrow-up', PUT: 'arrow-swap', PATCH: 'edit',
  DELETE: 'close', HEAD: 'eye', OPTIONS: 'settings-gear',
};

class ScopeGroupItem extends vscode.TreeItem {
  constructor(public readonly scope: 'local' | 'global') {
    super(scope === 'local' ? 'Local' : 'Global', vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = scope === 'local' ? 'localScope' : 'globalScope';
    this.iconPath = new vscode.ThemeIcon(scope === 'local' ? 'folder' : 'globe');
  }
}

class CollectionItem extends vscode.TreeItem {
  constructor(public readonly collection: Collection, public readonly scope: 'local' | 'global') {
    const count = countRequests(collection);
    const hasChildren = collection.requests.length > 0 || collection.folders.length > 0;
    super(collection.name, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = scope === 'local' ? 'collection' : 'globalCollection';
    this.iconPath = new vscode.ThemeIcon('folder-library');
    this.description = `${count} request${count !== 1 ? 's' : ''}`;
  }
}

class FolderItem extends vscode.TreeItem {
  constructor(
    public readonly folder: Collection['folders'][0],
    public readonly collectionId: string,
    public readonly folderPath: string[],
    public readonly scope: 'local' | 'global',
  ) {
    const hasChildren = folder.requests.length > 0 || folder.folders.length > 0;
    super(folder.name, hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = scope === 'local' ? 'folder' : 'globalFolder';
    this.iconPath = new vscode.ThemeIcon('folder');
    this.description = `${folder.requests.length}`;
  }
}

class RequestItem extends vscode.TreeItem {
  constructor(public readonly request: ApiRequest, public readonly collectionId: string, public readonly scope: 'local' | 'global') {
    super(request.name || 'Untitled', vscode.TreeItemCollapsibleState.None);
    this.contextValue = scope === 'local' ? 'request' : 'globalRequest';
    this.description = `${request.method} ${request.url ? request.url.replace(/^https?:\/\//, '') : ''}`;
    this.iconPath = new vscode.ThemeIcon(METHOD_ICONS[request.method] || 'symbol-event');
    this.command = {
      command: 'openPost.openRequest',
      title: 'Open Request',
      arguments: [request, collectionId],
    };
  }
}

export class CollectionTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: TreeItem) { return element; }

  getChildren(element?: TreeItem): TreeItem[] {
    if (!element) {
      return [new ScopeGroupItem('local'), new ScopeGroupItem('global')];
    }
    if (element instanceof ScopeGroupItem) {
      const cols = element.scope === 'local' ? loadCollections() : loadGlobalCollections();
      return cols.map(c => new CollectionItem(c, element.scope));
    }
    if (element instanceof CollectionItem) {
      const folders = element.collection.folders.map(f => new FolderItem(f, element.collection.id, [f.id], element.scope));
      const requests = element.collection.requests.map(r => new RequestItem(r, element.collection.id, element.scope));
      return [...folders, ...requests];
    }
    if (element instanceof FolderItem) {
      const folders = element.folder.folders.map(f => new FolderItem(f, element.collectionId, [...element.folderPath, f.id], element.scope));
      const requests = element.folder.requests.map(r => new RequestItem(r, element.collectionId, element.scope));
      return [...folders, ...requests];
    }
    return [];
  }

  private loadCols(scope: 'local' | 'global') { return scope === 'local' ? loadCollections() : loadGlobalCollections(); }
  private saveCols(scope: 'local' | 'global', cols: Collection[]) { scope === 'local' ? saveCollections(cols) : saveGlobalCollections(cols); }

  async addFolder(item?: CollectionItem | FolderItem) {
    if (!item) { vscode.window.showInformationMessage('Right-click a collection or folder to create a folder.'); return; }
    const name = await vscode.window.showInputBox({ prompt: 'Folder name', placeHolder: 'Auth' });
    if (!name?.trim()) return;
    const scope = item.scope;
    const collections = this.loadCols(scope);
    const folder: CollectionFolder = { id: Date.now().toString(), name: name.trim(), requests: [], folders: [] };
    if (item instanceof CollectionItem) {
      const col = collections.find(c => c.id === item.collection.id);
      if (col) col.folders.push(folder);
    } else {
      const col = collections.find(c => c.id === item.collectionId);
      if (col) { const parent = resolveFolderByPath(col.folders, item.folderPath); if (parent) parent.folders.push(folder); }
    }
    this.saveCols(scope, collections);
    this.refresh();
  }

  async addCollection(scope: 'local' | 'global' = 'local') {
    const name = await vscode.window.showInputBox({ prompt: 'Collection name', placeHolder: 'My API' });
    if (!name) return;
    const collections = this.loadCols(scope);
    collections.push({ id: Date.now().toString(), name, folders: [], requests: [], variables: [] });
    this.saveCols(scope, collections);
    this.refresh();
  }

  async deleteCollection(item: CollectionItem) {
    const confirm = await vscode.window.showWarningMessage(`Delete collection "${item.collection.name}"?`, { modal: true }, 'Delete');
    if (confirm !== 'Delete') return;
    const collections = this.loadCols(item.scope).filter(c => c.id !== item.collection.id);
    this.saveCols(item.scope, collections);
    this.refresh();
  }

  async renameRequest(item: RequestItem) {
    const newName = await vscode.window.showInputBox({ prompt: 'Rename request', value: item.request.name });
    if (!newName || newName === item.request.name) return;
    const collections = this.loadCols(item.scope);
    for (const col of collections) {
      const found = findAndRenameRequest(col, item.request.id, newName);
      if (found) break;
    }
    this.saveCols(item.scope, collections);
    this.refresh();
  }

  async addRequest(item?: CollectionItem | FolderItem) {
    if (!item) { vscode.window.showInformationMessage('Right-click a collection or folder to create a request.'); return; }
    const name = await vscode.window.showInputBox({ prompt: 'Request name', placeHolder: 'Get Users' });
    if (!name) return;
    const scope = item.scope;
    const collections = this.loadCols(scope);
    const collectionId = item instanceof CollectionItem ? item.collection.id : item.collectionId;
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const request: ApiRequest = { id: Date.now().toString(), name, method: 'GET', url: '', params: [], headers: [], body: { type: 'none' }, auth: { type: 'none' } };
    if (item instanceof CollectionItem) { col.requests.push(request); }
    else { const parent = resolveFolderByPath(col.folders, item.folderPath); if (parent) parent.requests.push(request); }
    this.saveCols(scope, collections);
    this.refresh();
    vscode.commands.executeCommand('openPost.openRequest', request, col.id);
  }

  async exportCollection(item: CollectionItem) {
    const format = await vscode.window.showQuickPick(
      [{ label: 'Open Post JSON', value: 'openpost' }, { label: 'Postman Collection v2.1', value: 'postman' }],
      { placeHolder: 'Export format' }
    );
    if (!format) return;
    const defaultName = item.collection.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(`${defaultName}.json`), filters: { 'JSON': ['json'] } });
    if (!uri) return;
    const data = format.value === 'postman' ? JSON.stringify(toPostmanFormat(item.collection), null, 2) : JSON.stringify(item.collection, null, 2);
    fs.writeFileSync(uri.fsPath, data, 'utf-8');
    vscode.window.showInformationMessage(`Exported "${item.collection.name}" to ${uri.fsPath}`);
  }

  async importCollection(scope: 'local' | 'global' = 'local') {
    const uris = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'JSON': ['json'] }, openLabel: 'Import' });
    if (!uris || uris.length === 0) return;
    try {
      const raw = fs.readFileSync(uris[0].fsPath, 'utf-8');
      const json = JSON.parse(raw);
      const collections = this.loadCols(scope);
      if (json.info && json.info.schema && json.item) { collections.push(fromPostmanFormat(json)); }
      else if (json.id && json.name && json.requests !== undefined) { json.id = Date.now().toString(); collections.push(json as Collection); }
      else { vscode.window.showErrorMessage('Unrecognized collection format. Supports Open Post JSON and Postman v2.1.'); return; }
      this.saveCols(scope, collections);
      this.refresh();
      const count = countRequests(collections[collections.length - 1]);
      vscode.window.showInformationMessage(`Imported ${count} requests from ${uris[0].fsPath}`);
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}

// --- Helpers ---

function countRequests(col: { requests: unknown[]; folders: { requests: unknown[]; folders: any[] }[] }): number {
  let count = col.requests.length;
  for (const f of col.folders) { count += countRequests(f); }
  return count;
}

function resolveFolderByPath(folders: CollectionFolder[], path: string[]): CollectionFolder | undefined {
  let currentFolders = folders;
  let current: CollectionFolder | undefined;
  for (const id of path) {
    current = currentFolders.find(f => f.id === id);
    if (!current) return undefined;
    currentFolders = current.folders;
  }
  return current;
}

function findAndRenameRequest(col: { requests: ApiRequest[]; folders: CollectionFolder[] }, reqId: string, newName: string): boolean {
  const req = col.requests.find(r => r.id === reqId);
  if (req) { req.name = newName; return true; }
  for (const f of col.folders) { if (findAndRenameRequest(f, reqId, newName)) return true; }
  return false;
}

// --- Postman v2.1 conversion ---

export function toPostmanFormat(col: Collection): object {
  return {
    info: {
      name: col.name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: col.requests.map((r) => ({
      name: r.name,
      request: {
        method: r.method,
        header: r.headers.filter(h => h.enabled).map(h => ({ key: h.key, value: h.value })),
        url: { raw: r.url },
        body: r.body.type === 'json' ? { mode: 'raw', raw: r.body.raw || '', options: { raw: { language: 'json' } } }
          : r.body.type === 'x-www-form-urlencoded' ? { mode: 'urlencoded', urlencoded: (r.body.formData || []).map(f => ({ key: f.key, value: f.value })) }
          : r.body.type === 'form-data' ? { mode: 'formdata', formdata: (r.body.formData || []).map(f => ({ key: f.key, value: f.value })) }
          : r.body.type === 'raw' ? { mode: 'raw', raw: r.body.raw || '' }
          : undefined,
      },
    })),
  };
}

export function fromPostmanFormat(json: { info: { name: string }; item: PostmanItem[]; variable?: { key: string; value: string }[] }): Collection {
  const { folders, requests } = parsePostmanItems(json.item || []);
  const variables = (json.variable || []).map(v => ({ key: v.key, value: v.value, enabled: true }));
  return { id: Date.now().toString(), name: json.info.name || 'Imported Collection', folders, variables, requests };
}

function parsePostmanItems(items: PostmanItem[]): { folders: Collection['folders']; requests: ApiRequest[] } {
  const folders: Collection['folders'] = [];
  const requests: ApiRequest[] = [];
  for (const item of items) {
    const hasRequest = item.request !== undefined && item.request !== null;
    const hasChildren = item.item && Array.isArray(item.item) && item.item.length > 0;
    if (hasChildren) {
      const nested = parsePostmanItems(item.item!);
      folders.push({ id: Date.now().toString() + Math.random().toString(36).slice(2, 6), name: item.name || 'Folder', requests: nested.requests, folders: nested.folders });
    } else if (hasRequest) { requests.push(parsePostmanRequest(item)); }
  }
  return { folders, requests };
}

function parsePostmanRequest(item: PostmanItem): ApiRequest {
  const req = item.request;
  if (!req || typeof req === 'string') {
    return { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), name: item.name || 'Request', method: 'GET', url: typeof req === 'string' ? req : '', params: [], headers: [], body: { type: 'none' }, auth: { type: 'none' } };
  }
  const method = (req.method || 'GET').toUpperCase();
  let url = '';
  if (typeof req.url === 'string') { url = req.url; }
  else if (req.url) {
    if (req.url.raw) { url = req.url.raw; }
    else { const host = Array.isArray(req.url.host) ? req.url.host.join('.') : (req.url.host || ''); const pathParts = Array.isArray(req.url.path) ? req.url.path.join('/') : (req.url.path || ''); url = `${req.url.protocol || 'https'}://${host}/${pathParts}`; }
  }
  const headers = (req.header || []).map((h: { key: string; value: string; disabled?: boolean }) => ({ key: h.key || '', value: h.value || '', enabled: !h.disabled }));
  const params: KeyValue[] = [];
  if (typeof req.url === 'object' && req.url?.query) { for (const q of req.url.query) { params.push({ key: q.key || '', value: q.value || '', enabled: !q.disabled }); } }
  let body: ApiRequest['body'] = { type: 'none' };
  if (req.body) {
    if (req.body.mode === 'raw') { const lang = req.body.options?.raw?.language; body = { type: lang === 'json' ? 'json' : lang === 'xml' ? 'xml' : 'raw', raw: req.body.raw || '' }; }
    else if (req.body.mode === 'urlencoded') { body = { type: 'x-www-form-urlencoded', formData: (req.body.urlencoded || []).map((f: { key: string; value: string; disabled?: boolean }) => ({ key: f.key, value: f.value, enabled: !f.disabled })) }; }
    else if (req.body.mode === 'formdata') { body = { type: 'form-data', formData: (req.body.formdata || []).map((f: { key: string; value: string; disabled?: boolean }) => ({ key: f.key, value: f.value, enabled: !f.disabled })) }; }
    else if (req.body.mode === 'graphql' && req.body.graphql) { body = { type: 'graphql', graphql: { query: req.body.graphql.query || '', variables: req.body.graphql.variables || '{}' } }; }
  }
  let auth: AuthConfig = { type: 'none' };
  if (req.auth) {
    const a = req.auth;
    if (a.type === 'bearer' && a.bearer) { auth = { type: 'bearer', bearer: { token: a.bearer.find((b: { key: string; value: string }) => b.key === 'token')?.value || '' } }; }
    else if (a.type === 'basic' && a.basic) { auth = { type: 'basic', basic: { username: a.basic.find((b: { key: string; value: string }) => b.key === 'username')?.value || '', password: a.basic.find((b: { key: string; value: string }) => b.key === 'password')?.value || '' } }; }
    else if (a.type === 'apikey' && a.apikey) { const key = a.apikey.find((b: { key: string; value: string }) => b.key === 'key')?.value || ''; const value = a.apikey.find((b: { key: string; value: string }) => b.key === 'value')?.value || ''; const addTo = (a.apikey.find((b: { key: string; value: string }) => b.key === 'in')?.value === 'query' ? 'query' : 'header') as 'header' | 'query'; auth = { type: 'api-key', apiKey: { key, value, addTo } }; }
  }
  return { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), name: item.name || `${method} ${url}`, method: method as ApiRequest['method'], url, params, headers, body, auth };
}

interface PostmanItem {
  name?: string;
  item?: PostmanItem[];
  request?: {
    method?: string;
    url?: string | { raw?: string; protocol?: string; host?: string | string[]; path?: string | string[]; query?: { key: string; value?: string; disabled?: boolean }[] };
    header?: { key: string; value: string; disabled?: boolean }[];
    body?: { mode?: string; raw?: string; urlencoded?: { key: string; value: string; disabled?: boolean }[]; formdata?: { key: string; value: string; disabled?: boolean }[]; graphql?: { query?: string; variables?: string }; options?: { raw?: { language?: string } } };
    auth?: { type?: string; bearer?: { key: string; value: string }[]; basic?: { key: string; value: string }[]; apikey?: { key: string; value: string }[] };
  } | string;
}
