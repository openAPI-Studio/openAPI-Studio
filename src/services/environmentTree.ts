import * as vscode from 'vscode';
import { loadEnvironments, saveEnvironments, loadActiveEnvironmentId, saveActiveEnvironmentId, loadGlobalEnvironments, saveGlobalEnvironments, loadGlobalActiveEnvironmentId, saveGlobalActiveEnvironmentId } from '../storage/fileStore';
import { Environment } from '../core/types';

class ScopeGroupItem extends vscode.TreeItem {
  constructor(public readonly scope: 'local' | 'global') {
    super(scope === 'local' ? 'Local' : 'Global', vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = scope === 'local' ? 'localEnvScope' : 'globalEnvScope';
    this.iconPath = new vscode.ThemeIcon(scope === 'local' ? 'folder' : 'globe');
  }
}

class EnvironmentItem extends vscode.TreeItem {
  constructor(public readonly env: Environment, isActive: boolean, public readonly scope: 'local' | 'global') {
    super(env.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = scope === 'local' ? 'environment' : 'globalEnvironment';
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
      return [new ScopeGroupItem('local'), new ScopeGroupItem('global')];
    }
    if (element instanceof ScopeGroupItem) {
      if (element.scope === 'local') {
        const activeId = loadActiveEnvironmentId();
        return loadEnvironments().map(e => new EnvironmentItem(e, e.id === activeId, 'local'));
      }
      const activeId = loadGlobalActiveEnvironmentId();
      return loadGlobalEnvironments().map(e => new EnvironmentItem(e, e.id === activeId, 'global'));
    }
    if (element instanceof EnvironmentItem) {
      return element.env.variables.map(v => new VariableItem(v.key, v.value, v.enabled));
    }
    return [];
  }

  async addEnvironment(scope: 'local' | 'global' = 'local') {
    const name = await vscode.window.showInputBox({ prompt: 'Environment name', placeHolder: 'Development' });
    if (!name) return;
    const varsInput = await vscode.window.showInputBox({ prompt: 'Variables (comma-separated key=value pairs)', placeHolder: 'base_url=http://localhost:3000, token=abc123' });
    const variables = (varsInput || '').split(',').map(s => s.trim()).filter(Boolean).map(pair => {
      const [key, ...rest] = pair.split('=');
      return { key: key.trim(), value: rest.join('=').trim(), enabled: true };
    });
    const envs = scope === 'local' ? loadEnvironments() : loadGlobalEnvironments();
    envs.push({ id: Date.now().toString(), name, variables });
    scope === 'local' ? saveEnvironments(envs) : saveGlobalEnvironments(envs);
    this.refresh();
  }

  async deleteEnvironment(item: EnvironmentItem) {
    const confirm = await vscode.window.showWarningMessage(`Delete environment "${item.env.name}"?`, { modal: true }, 'Delete');
    if (confirm !== 'Delete') return;
    if (item.scope === 'local') {
      saveEnvironments(loadEnvironments().filter(e => e.id !== item.env.id));
    } else {
      saveGlobalEnvironments(loadGlobalEnvironments().filter(e => e.id !== item.env.id));
    }
    this.refresh();
  }

  async setActive(item: EnvironmentItem) {
    if (item.scope === 'local') { saveActiveEnvironmentId(item.env.id); }
    else { saveGlobalActiveEnvironmentId(item.env.id); }
    this.refresh();
    vscode.window.showInformationMessage(`Active environment: ${item.env.name}`);
  }
}
