import * as vscode from 'vscode';
import { loadEnvironments, saveEnvironments, loadActiveEnvironmentId, saveActiveEnvironmentId } from '../storage/fileStore';
import { Environment } from '../core/types';

class EnvironmentItem extends vscode.TreeItem {
  constructor(public readonly env: Environment, isActive: boolean) {
    super(env.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'environment';
    this.iconPath = new vscode.ThemeIcon(isActive ? 'pass-filled' : 'globe');
    this.description = isActive ? '● active' : `${env.variables.length} vars`;
  }
}

class VariableItem extends vscode.TreeItem {
  constructor(key: string, value: string, enabled: boolean) {
    super(key, vscode.TreeItemCollapsibleState.None);
    this.description = enabled ? value : `(disabled) ${value}`;
    this.iconPath = new vscode.ThemeIcon('symbol-variable');
  }
}

export class EnvironmentTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh() { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: vscode.TreeItem) { return element; }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      const activeId = loadActiveEnvironmentId();
      return loadEnvironments().map(e => new EnvironmentItem(e, e.id === activeId));
    }
    if (element instanceof EnvironmentItem) {
      return element.env.variables.map(v => new VariableItem(v.key, v.value, v.enabled));
    }
    return [];
  }

  async addEnvironment() {
    const name = await vscode.window.showInputBox({ prompt: 'Environment name', placeHolder: 'Development' });
    if (!name) return;

    const varsInput = await vscode.window.showInputBox({
      prompt: 'Variables (comma-separated key=value pairs)',
      placeHolder: 'base_url=http://localhost:3000, token=abc123',
    });

    const variables = (varsInput || '').split(',').map(s => s.trim()).filter(Boolean).map(pair => {
      const [key, ...rest] = pair.split('=');
      return { key: key.trim(), value: rest.join('=').trim(), enabled: true };
    });

    const envs = loadEnvironments();
    envs.push({ id: Date.now().toString(), name, variables });
    saveEnvironments(envs);
    this.refresh();
  }

  async deleteEnvironment(item: EnvironmentItem) {
    const confirm = await vscode.window.showWarningMessage(
      `Delete environment "${item.env.name}"?`, { modal: true }, 'Delete'
    );
    if (confirm !== 'Delete') return;
    const envs = loadEnvironments().filter(e => e.id !== item.env.id);
    saveEnvironments(envs);
    this.refresh();
  }

  async setActive(item: EnvironmentItem) {
    saveActiveEnvironmentId(item.env.id);
    this.refresh();
    vscode.window.showInformationMessage(`Active environment: ${item.env.name}`);
  }
}
