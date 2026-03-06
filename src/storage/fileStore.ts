import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Collection, Environment, HistoryEntry, CookieEntry } from '../core/types';

function getStoragePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) { return undefined; }
  return path.join(folders[0].uri.fsPath, '.openpost');
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore parse errors */ }
  return fallback;
}

function writeJson(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Collections
export function loadCollections(): Collection[] {
  const dir = getStoragePath();
  if (!dir) { return []; }
  return readJson(path.join(dir, 'collections.json'), []);
}

export function saveCollections(collections: Collection[]) {
  const dir = getStoragePath();
  if (!dir) { return; }
  writeJson(path.join(dir, 'collections.json'), collections);
}

// Environments
export function loadEnvironments(): Environment[] {
  const dir = getStoragePath();
  if (!dir) { return []; }
  return readJson(path.join(dir, 'environments.json'), []);
}

export function saveEnvironments(environments: Environment[]) {
  const dir = getStoragePath();
  if (!dir) { return; }
  writeJson(path.join(dir, 'environments.json'), environments);
}

// History
export function loadHistory(): HistoryEntry[] {
  const dir = getStoragePath();
  if (!dir) { return []; }
  return readJson(path.join(dir, 'history.json'), []);
}

export function saveHistory(history: HistoryEntry[]) {
  const dir = getStoragePath();
  if (!dir) { return; }
  // Cap at 500 entries
  const trimmed = history.slice(-500);
  writeJson(path.join(dir, 'history.json'), trimmed);
}

// Active environment
export function loadActiveEnvironmentId(): string | null {
  const dir = getStoragePath();
  if (!dir) { return null; }
  const config = readJson<{ activeEnvironmentId?: string }>(path.join(dir, 'config.json'), {});
  return config.activeEnvironmentId || null;
}

export function saveActiveEnvironmentId(id: string | null) {
  const dir = getStoragePath();
  if (!dir) { return; }
  const config = readJson<Record<string, unknown>>(path.join(dir, 'config.json'), {});
  writeJson(path.join(dir, 'config.json'), { ...config, activeEnvironmentId: id });
}

// Cookies
export function loadCookies(): CookieEntry[] {
  const dir = getStoragePath();
  if (!dir) { return []; }
  const cookies = readJson<CookieEntry[]>(path.join(dir, 'cookies.json'), []);
  // Remove expired cookies
  const now = new Date().toISOString();
  return cookies.filter(c => !c.expires || c.expires > now);
}

export function saveCookies(cookies: CookieEntry[]) {
  const dir = getStoragePath();
  if (!dir) { return; }
  writeJson(path.join(dir, 'cookies.json'), cookies);
}

// Cookies enabled setting
export function loadCookiesEnabled(): boolean {
  const dir = getStoragePath();
  if (!dir) { return true; }
  const config = readJson<{ cookiesEnabled?: boolean }>(path.join(dir, 'config.json'), {});
  return config.cookiesEnabled !== false;
}

export function saveCookiesEnabled(enabled: boolean) {
  const dir = getStoragePath();
  if (!dir) { return; }
  const config = readJson<Record<string, unknown>>(path.join(dir, 'config.json'), {});
  writeJson(path.join(dir, 'config.json'), { ...config, cookiesEnabled: enabled });
}

// Tab settings
export function loadTabSettings(): { tabViewCollapsed: boolean; tabGrouping: boolean } {
  const dir = getStoragePath();
  if (!dir) { return { tabViewCollapsed: false, tabGrouping: false }; }
  const config = readJson<{ tabViewCollapsed?: boolean; tabGrouping?: boolean }>(path.join(dir, 'config.json'), {});
  return { tabViewCollapsed: !!config.tabViewCollapsed, tabGrouping: !!config.tabGrouping };
}

export function saveTabSetting(key: 'tabViewCollapsed' | 'tabGrouping', value: boolean) {
  const dir = getStoragePath();
  if (!dir) { return; }
  const config = readJson<Record<string, unknown>>(path.join(dir, 'config.json'), {});
  writeJson(path.join(dir, 'config.json'), { ...config, [key]: value });
}
