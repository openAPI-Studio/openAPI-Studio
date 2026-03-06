// Re-export shared types for webview usage
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'xml' | 'graphql' | 'binary';
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'aws-sigv4';

export interface KeyValue { key: string; value: string; enabled: boolean; }

export interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  oauth2?: { grantType: 'authorization_code' | 'client_credentials'; authUrl: string; tokenUrl: string; clientId: string; clientSecret: string; scope: string; accessToken?: string };
  awsSigV4?: { accessKey: string; secretKey: string; region: string; service: string };
}

export interface FormDataItem extends KeyValue {
  fieldType: 'text' | 'file';
  filePath?: string;
  fileName?: string;
}

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string | null;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | null;
  createdAt: string;
}

export interface RequestBody {
  type: BodyType;
  raw?: string;
  formData?: KeyValue[];
  formDataFiles?: FormDataItem[];
  graphql?: { query: string; variables: string };
  binaryPath?: string;
  binaryName?: string;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: RequestBody;
  auth: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  cookies?: CookieEntry[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface Collection {
  id: string;
  name: string;
  folders: { id: string; name: string; requests: ApiRequest[]; folders: never[] }[];
  requests: ApiRequest[];
  variables: KeyValue[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: ApiRequest;
  response: ApiResponse;
}

// VS Code webview API
interface VsCodeApi {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

export function postMessage(msg: unknown) {
  vscode.postMessage(msg);
}

export function onMessage(handler: (msg: unknown) => void) {
  window.addEventListener('message', (e) => handler(e.data));
}
