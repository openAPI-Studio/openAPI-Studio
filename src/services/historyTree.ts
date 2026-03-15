import * as vscode from 'vscode';
import { loadHistory, saveHistory, loadGlobalHistory, saveGlobalHistory } from '../storage/fileStore';
import { HistoryEntry } from '../core/types';

const METHOD_ICONS: Record<string, string> = {
  GET: 'arrow-down', POST: 'arrow-up', PUT: 'arrow-swap', PATCH: 'edit',
  DELETE: 'close', HEAD: 'eye', OPTIONS: 'settings-gear',
};

class ScopeGroupItem extends vscode.TreeItem {
  constructor(public readonly scope: 'local' | 'global') {
    super(scope === 'local' ? 'Local' : 'Global', vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = scope === 'local' ? 'localHistoryScope' : 'globalHistoryScope';
    this.iconPath = new vscode.ThemeIcon(scope === 'local' ? 'folder' : 'globe');
  }
}

class HistoryItem extends vscode.TreeItem {
  constructor(public readonly entry: HistoryEntry, public readonly scope: 'local' | 'global') {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const url = entry.request.url.replace(/^https?:\/\//, '');
    super(`${entry.request.method} ${url}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${entry.response.status} · ${entry.response.time}ms · ${time}`;
    this.contextValue = scope === 'local' ? 'historyItem' : 'globalHistoryItem';
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

type HistoryTreeNode = ScopeGroupItem | HistoryItem;

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryTreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HistoryTreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: HistoryTreeNode) { return element; }

  getChildren(element?: HistoryTreeNode): HistoryTreeNode[] {
    if (!element) {
      return [new ScopeGroupItem('local'), new ScopeGroupItem('global')];
    }
    if (element instanceof ScopeGroupItem) {
      const entries = element.scope === 'local' ? loadHistory() : loadGlobalHistory();
      return entries.reverse().map(e => new HistoryItem(e, element.scope));
    }
    return [];
  }

  clear(scope: 'local' | 'global' = 'local') {
    scope === 'local' ? saveHistory([]) : saveGlobalHistory([]);
    this.refresh();
  }

  deleteEntry(id: string, scope: 'local' | 'global' = 'local') {
    if (scope === 'local') { saveHistory(loadHistory().filter(e => e.id !== id)); }
    else { saveGlobalHistory(loadGlobalHistory().filter(e => e.id !== id)); }
    this.refresh();
  }
}
