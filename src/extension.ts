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
import { loadCollections, saveCollections, loadEnvironments, saveEnvironments, loadHistory, loadSnapshots } from './storage/fileStore';

export function activate(context: vscode.ExtensionContext) {
  const collectionTree = new CollectionTreeProvider();
  const environmentTree = new EnvironmentTreeProvider();
  const historyTree = new HistoryTreeProvider();
  const snapshotTree = new SnapshotTreeProvider();

  vscode.window.registerTreeDataProvider('openPost.collections', collectionTree);
  vscode.window.registerTreeDataProvider('openPost.environments', environmentTree);
  vscode.window.registerTreeDataProvider('openPost.history', historyTree);
  vscode.window.registerTreeDataProvider('openPost.snapshots', snapshotTree);

  // Open webview
  context.subscriptions.push(
    vscode.commands.registerCommand('openPost.open', () => {
      OpenPostPanel.show(context.extensionUri);
    }),
    vscode.commands.registerCommand('openPost.openCollection', () => {
      OpenPostPanel.show(context.extensionUri);
    }),

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

    // Collection commands
    vscode.commands.registerCommand('openPost.addCollection', () => {
      collectionTree.addCollection();
    }),
    vscode.commands.registerCommand('openPost.deleteCollection', (item) => {
      collectionTree.deleteCollection(item);
    }),
    vscode.commands.registerCommand('openPost.addRequest', (item) => {
      collectionTree.addRequest(item);
    }),
    vscode.commands.registerCommand('openPost.renameRequest', (item) => {
      collectionTree.renameRequest(item);
    }),
    vscode.commands.registerCommand('openPost.exportCollection', (item) => {
      collectionTree.exportCollection(item);
    }),
    vscode.commands.registerCommand('openPost.importCollection', () => {
      collectionTree.importCollection();
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

        // Save collection
        const collections = loadCollections();
        collections.push(result.collection);
        saveCollections(collections);

        // Save environment
        const envs = loadEnvironments();
        envs.push({
          id: Date.now().toString(),
          name: result.environment.name,
          variables: result.environment.variables,
        });
        saveEnvironments(envs);

        collectionTree.refresh();
        environmentTree.refresh();
        vscode.window.showInformationMessage(
          `Imported ${result.requestCount} requests from "${result.collection.name}". Environment created with base_url.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`OpenAPI import failed: ${msg}`);
      }
    }),

    // Environment commands
    vscode.commands.registerCommand('openPost.addEnvironment', () => {
      environmentTree.addEnvironment();
    }),
    vscode.commands.registerCommand('openPost.deleteEnvironment', (item) => {
      environmentTree.deleteEnvironment(item);
    }),
    vscode.commands.registerCommand('openPost.setActiveEnvironment', (item) => {
      environmentTree.setActive(item);
    }),

    // History commands
    vscode.commands.registerCommand('openPost.clearHistory', () => {
      historyTree.clear();
      OpenPostPanel.currentPanel?.sendToWebview({ type: 'history', data: loadHistory() });
    }),
    vscode.commands.registerCommand('openPost.deleteHistoryEntry', (item) => {
      historyTree.deleteEntry(item.entry.id);
      OpenPostPanel.currentPanel?.sendToWebview({ type: 'history', data: loadHistory() });
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
}

export function deactivate() {}
