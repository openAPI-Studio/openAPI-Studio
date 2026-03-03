import * as vscode from 'vscode';
import { loadHistory, saveHistory } from '../storage/fileStore';
import { HistoryEntry, ApiRequest } from '../core/types';

class HistoryItem extends vscode.TreeItem {
  constructor(public readonly entry: HistoryEntry) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    super(`${entry.request.method} ${entry.request.url}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${entry.response.status} · ${entry.response.time}ms · ${time}`;
    this.iconPath = new vscode.ThemeIcon(
      entry.response.status < 300 ? 'pass' : entry.response.status < 400 ? 'warning' : 'error'
    );
    this.command = {
      command: 'openPost.openRequest',
      title: 'Open Request',
      arguments: [entry.request],
    };
  }
}

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HistoryItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: HistoryItem) { return element; }

  getChildren(): HistoryItem[] {
    return loadHistory().reverse().map(e => new HistoryItem(e));
  }

  clear() {
    saveHistory([]);
    this.refresh();
  }
}
