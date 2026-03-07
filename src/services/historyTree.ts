import * as vscode from 'vscode';
import { loadHistory, saveHistory } from '../storage/fileStore';
import { HistoryEntry } from '../core/types';

const METHOD_ICONS: Record<string, string> = {
  GET: 'arrow-down', POST: 'arrow-up', PUT: 'arrow-swap', PATCH: 'edit',
  DELETE: 'close', HEAD: 'eye', OPTIONS: 'settings-gear',
};

class HistoryItem extends vscode.TreeItem {
  constructor(public readonly entry: HistoryEntry) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const url = entry.request.url.replace(/^https?:\/\//, '');
    super(`${entry.request.method} ${url}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${entry.response.status} · ${entry.response.time}ms · ${time}`;
    this.contextValue = 'historyItem';
    this.iconPath = new vscode.ThemeIcon(
      METHOD_ICONS[entry.request.method] || 'symbol-event',
      new vscode.ThemeColor(
        entry.response.status < 300 ? 'testing.iconPassed'
          : entry.response.status < 400 ? 'editorWarning.foreground'
          : 'editorError.foreground'
      )
    );
    this.command = {
      command: 'openPost.openRequest',
      title: 'Open Request',
      arguments: [entry.request, undefined, entry.response],
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

  deleteEntry(id: string) {
    saveHistory(loadHistory().filter(entry => entry.id !== id));
    this.refresh();
  }
}
