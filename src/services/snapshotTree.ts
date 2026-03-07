import * as vscode from 'vscode';
import { loadSnapshots, saveSnapshots } from '../storage/fileStore';
import { Snapshot, SnapshotRecord } from '../core/types';

const METHOD_ICONS: Record<string, string> = {
  GET: 'arrow-down', POST: 'arrow-up', PUT: 'arrow-swap', PATCH: 'edit',
  DELETE: 'close', HEAD: 'eye', OPTIONS: 'settings-gear',
};

function statusColor(status: number): vscode.ThemeColor {
  if (status < 300) return new vscode.ThemeColor('testing.iconPassed');
  if (status < 400) return new vscode.ThemeColor('editorWarning.foreground');
  return new vscode.ThemeColor('editorError.foreground');
}

export class SnapshotItem extends vscode.TreeItem {
  public readonly snapshot: Snapshot;

  constructor(snapshot: Snapshot) {
    const date = new Date(snapshot.createdAt).toLocaleString();
    super(snapshot.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.snapshot = snapshot;
    this.description = `${date} · ${snapshot.records.length} record${snapshot.records.length !== 1 ? 's' : ''}`;
    this.iconPath = new vscode.ThemeIcon('bookmark');
    this.contextValue = 'snapshotItem';
    this.tooltip = `${snapshot.name}\nCreated: ${date}\n${snapshot.records.length} request record(s)`;
  }
}

export class SnapshotRecordItem extends vscode.TreeItem {
  public readonly snapshotId: string;
  public readonly record: SnapshotRecord;

  constructor(snapshotId: string, record: SnapshotRecord) {
    const time = new Date(record.timestamp).toLocaleString();
    const url = record.request.url.replace(/^https?:\/\//, '');
    super(`${record.request.method} ${url}`, vscode.TreeItemCollapsibleState.None);
    this.snapshotId = snapshotId;
    this.record = record;
    this.description = `${record.response.status} · ${record.response.time}ms · ${time}`;
    this.iconPath = new vscode.ThemeIcon(
      METHOD_ICONS[record.request.method] || 'symbol-event',
      statusColor(record.response.status),
    );
    this.contextValue = 'snapshotRecordItem';
    this.tooltip = `${record.request.method} ${record.request.url}\nStatus: ${record.response.status} ${record.response.statusText}\nTime: ${record.response.time}ms\nRecorded: ${time}`;
    this.command = {
      command: 'openPost.openSnapshotRecord',
      title: 'Open Snapshot Record',
      arguments: [record],
    };
  }
}

type SnapshotTreeNode = SnapshotItem | SnapshotRecordItem;

export class SnapshotTreeProvider implements vscode.TreeDataProvider<SnapshotTreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SnapshotTreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SnapshotTreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SnapshotTreeNode): SnapshotTreeNode[] {
    if (!element) {
      // Top level: all snapshots, newest first
      return loadSnapshots()
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(s => new SnapshotItem(s));
    }
    if (element instanceof SnapshotItem) {
      // Second level: records of this snapshot, newest first
      return element.snapshot.records
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(r => new SnapshotRecordItem(element.snapshot.id, r));
    }
    return [];
  }

  deleteSnapshot(item: SnapshotItem) {
    const snapshots = loadSnapshots().filter(s => s.id !== item.snapshot.id);
    saveSnapshots(snapshots);
    this.refresh();
  }

  deleteSnapshotRecord(item: SnapshotRecordItem) {
    const snapshots = loadSnapshots().map(s => {
      if (s.id !== item.snapshotId) { return s; }
      return { ...s, records: s.records.filter(r => r.id !== item.record.id) };
    });
    saveSnapshots(snapshots);
    this.refresh();
  }

  async renameSnapshot(item: SnapshotItem) {
    const newName = await vscode.window.showInputBox({
      prompt: 'Rename snapshot',
      value: item.snapshot.name,
      validateInput: v => v.trim() ? null : 'Name cannot be empty',
    });
    if (!newName || !newName.trim()) { return; }
    const snapshots = loadSnapshots().map(s =>
      s.id === item.snapshot.id ? { ...s, name: newName.trim() } : s,
    );
    saveSnapshots(snapshots);
    this.refresh();
  }
}
