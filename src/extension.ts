import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OpenPostPanel } from './services/webviewProvider';
import { CollectionTreeProvider } from './services/collectionTree';
import { EnvironmentTreeProvider } from './services/environmentTree';
import { HistoryTreeProvider } from './services/historyTree';
import { SnapshotTreeProvider, SnapshotItem, SnapshotRecordItem } from './services/snapshotTree';
import { ApiRequest } from './core/types';
import { parseOpenApiSpec } from './core/openApiParser';
import { loadCollections, saveCollections, loadEnvironments, saveEnvironments, loadHistory, loadSnapshots, getGlobalStoragePath, loadGlobalCollections, loadGlobalEnvironments, loadGlobalHistory, loadGlobalActiveEnvironmentId } from './storage/fileStore';

function syncGlobalToWebview() {
  const panel = OpenPostPanel.currentPanel;
  if (!panel) return;
  panel.sendToWebview({ type: 'globalCollections', data: loadGlobalCollections() });
  panel.sendToWebview({ type: 'globalEnvironments', data: loadGlobalEnvironments() });
  panel.sendToWebview({ type: 'globalHistory', data: loadGlobalHistory() });
  panel.sendToWebview({ type: 'globalActiveEnvironment', id: loadGlobalActiveEnvironmentId() });
}

function syncLocalToWebview() {
  const panel = OpenPostPanel.currentPanel;
  if (!panel) return;
  panel.sendToWebview({ type: 'collections', data: loadCollections() });
  panel.sendToWebview({ type: 'environments', data: loadEnvironments() });
  panel.sendToWebview({ type: 'history', data: loadHistory() });
}

function syncSettingsToWebview() {
  const panel = OpenPostPanel.currentPanel;
  if (!panel) return;
  const cfg = vscode.workspace.getConfiguration('openPost');
  panel.sendToWebview({
    type: 'vscodeSettings',
    data: {
      sslVerification: cfg.get<boolean>('sslVerification', true),
      cookiesEnabled: cfg.get<boolean>('cookiesEnabled', true),
      tabViewCollapsed: cfg.get<boolean>('collapsedTabs', false),
      tabGrouping: cfg.get<boolean>('groupedTabs', false),
      subtleContracts: cfg.get<boolean>('subtleContracts', false),
    },
  });
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Open Post');
  context.subscriptions.push(outputChannel);
  OpenPostPanel.outputChannel = outputChannel;

  // Expose settings sync so webview provider can call it
  OpenPostPanel.syncSettings = syncSettingsToWebview;

  const collectionTree = new CollectionTreeProvider();
  const environmentTree = new EnvironmentTreeProvider();
  const historyTree = new HistoryTreeProvider();
  const snapshotTree = new SnapshotTreeProvider();

  const collectionsView = vscode.window.createTreeView('openPost.collections', { treeDataProvider: collectionTree });
  vscode.window.createTreeView('openPost.environments', { treeDataProvider: environmentTree });
  vscode.window.createTreeView('openPost.history', { treeDataProvider: historyTree });
  vscode.window.createTreeView('openPost.snapshots', { treeDataProvider: snapshotTree });

  // Auto-open webview panel when sidebar becomes visible
  collectionsView.onDidChangeVisibility((e) => {
    if (e.visible) {
      OpenPostPanel.show(context.extensionUri);
    }
  });

  // Helper to run a tree action then sync webview
  const withSync = (fn: () => Promise<void> | void, scope: 'local' | 'global' | 'both' = 'both') => {
    return async () => {
      await fn();
      if (scope === 'local' || scope === 'both') syncLocalToWebview();
      if (scope === 'global' || scope === 'both') syncGlobalToWebview();
    };
  };

  context.subscriptions.push(
    // Open webview
    vscode.commands.registerCommand('openPost.open', () => OpenPostPanel.show(context.extensionUri)),
    vscode.commands.registerCommand('openPost.openCollection', () => OpenPostPanel.show(context.extensionUri)),

    // Open a specific request in the webview
    vscode.commands.registerCommand('openPost.openRequest', (request: ApiRequest, collectionId?: string, response?: unknown) => {
      OpenPostPanel.show(context.extensionUri);
      setTimeout(() => {
        OpenPostPanel.currentPanel?.sendToWebview({
          type: 'loadRequest',
          data: request,
          collectionId: collectionId || null,
          response: response || null,
        });
      }, 300);
    }),

    // Collection commands (work for both local and global via scope on tree item)
    vscode.commands.registerCommand('openPost.addCollection', async () => {
      await collectionTree.addCollection('local');
      syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.addGlobalCollection', async () => {
      await collectionTree.addCollection('global');
      syncGlobalToWebview();
    }),
    vscode.commands.registerCommand('openPost.deleteCollection', async (item) => {
      await collectionTree.deleteCollection(item);
      item.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.addRequest', async (item) => {
      await collectionTree.addRequest(item);
      item?.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.addFolder', async (item) => {
      await collectionTree.addFolder(item);
      item?.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.renameRequest', async (item) => {
      await collectionTree.renameRequest(item);
      item.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.exportCollection', (item) => collectionTree.exportCollection(item)),
    vscode.commands.registerCommand('openPost.importCollection', async () => {
      await collectionTree.importCollection('local');
      syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.importGlobalCollection', async () => {
      await collectionTree.importCollection('global');
      syncGlobalToWebview();
    }),

    // OpenAPI import
    vscode.commands.registerCommand('openPost.importOpenApi', async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'OpenAPI Spec': ['json', 'yaml', 'yml'] },
        openLabel: 'Import OpenAPI',
      });
      if (!uris || uris.length === 0) return;
      try {
        const content = fs.readFileSync(uris[0].fsPath, 'utf-8');
        const fileName = path.basename(uris[0].fsPath);
        const result = parseOpenApiSpec(content, fileName);
        const collections = loadCollections();
        collections.push(result.collection);
        saveCollections(collections);
        const envs = loadEnvironments();
        envs.push({ id: Date.now().toString(), name: result.environment.name, variables: result.environment.variables });
        saveEnvironments(envs);
        collectionTree.refresh();
        environmentTree.refresh();
        syncLocalToWebview();
        vscode.window.showInformationMessage(`Imported ${result.requestCount} requests from "${result.collection.name}". Environment created with base_url.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`OpenAPI import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }),

    // Environment commands
    vscode.commands.registerCommand('openPost.addEnvironment', async () => {
      await environmentTree.addEnvironment('local');
      syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.addGlobalEnvironment', async () => {
      await environmentTree.addEnvironment('global');
      syncGlobalToWebview();
    }),
    vscode.commands.registerCommand('openPost.deleteEnvironment', async (item) => {
      await environmentTree.deleteEnvironment(item);
      item.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.setActiveEnvironment', async (item) => {
      await environmentTree.setActive(item);
      item.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),

    // History commands
    vscode.commands.registerCommand('openPost.clearHistory', () => {
      historyTree.clear('local');
      syncLocalToWebview();
    }),
    vscode.commands.registerCommand('openPost.clearGlobalHistory', () => {
      historyTree.clear('global');
      syncGlobalToWebview();
    }),
    vscode.commands.registerCommand('openPost.deleteHistoryEntry', (item) => {
      historyTree.deleteEntry(item.entry.id, item.scope);
      item.scope === 'global' ? syncGlobalToWebview() : syncLocalToWebview();
    }),

    // Snapshot commands
    vscode.commands.registerCommand('openPost.openSnapshotRecord', (record) => {
      OpenPostPanel.show(context.extensionUri);
      setTimeout(() => {
        OpenPostPanel.currentPanel?.sendToWebview({
          type: 'loadRequest',
          data: record.request,
          collectionId: null,
          response: record.response,
        });
      }, 300);
    }),
    vscode.commands.registerCommand('openPost.deleteSnapshot', (item: SnapshotItem) => {
      snapshotTree.deleteSnapshot(item);
      OpenPostPanel.currentPanel?.sendToWebview({ type: 'snapshots', data: loadSnapshots() });
    }),
    vscode.commands.registerCommand('openPost.deleteSnapshotRecord', (item: SnapshotRecordItem) => {
      snapshotTree.deleteSnapshotRecord(item);
      OpenPostPanel.currentPanel?.sendToWebview({ type: 'snapshots', data: loadSnapshots() });
    }),
    vscode.commands.registerCommand('openPost.renameSnapshot', (item: SnapshotItem) => {
      snapshotTree.renameSnapshot(item);
      OpenPostPanel.currentPanel?.sendToWebview({ type: 'snapshots', data: loadSnapshots() });
    }),
  );

  // Refresh trees when webview makes changes
  OpenPostPanel.onDataChanged = () => {
    collectionTree.refresh();
    environmentTree.refresh();
    historyTree.refresh();
    snapshotTree.refresh();
  };

  // Watch global storage for cross-window sync
  const globalDir = getGlobalStoragePath();
  if (!fs.existsSync(globalDir)) { fs.mkdirSync(globalDir, { recursive: true }); }
  const globalWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(globalDir), '*.json')
  );
  let debounce: NodeJS.Timeout | undefined;
  const reloadGlobal = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      collectionTree.refresh();
      environmentTree.refresh();
      historyTree.refresh();
      syncGlobalToWebview();
    }, 500);
  };
  globalWatcher.onDidChange(reloadGlobal);
  globalWatcher.onDidCreate(reloadGlobal);
  globalWatcher.onDidDelete(reloadGlobal);
  context.subscriptions.push(globalWatcher);

  // Push VS Code settings to webview when they change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('openPost')) {
        syncSettingsToWebview();
      }
    })
  );
}
