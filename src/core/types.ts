// Shared types for Open Post

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'xml' | 'graphql' | 'binary';

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'aws-sigv4';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  oauth2?: {
    grantType: 'authorization_code' | 'client_credentials';
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    accessToken?: string;
  };
  awsSigV4?: { accessKey: string; secretKey: string; region: string; service: string };
}

export interface FormDataItem extends KeyValue {
  fieldType: 'text' | 'file';
  filePath?: string;
  fileName?: string;
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
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: ApiRequest[];
  folders: CollectionFolder[];
}

export interface Collection {
  id: string;
  name: string;
  folders: CollectionFolder[];
  requests: ApiRequest[];
  variables: KeyValue[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: ApiRequest;
  response: ApiResponse;
}

// Extension <-> Webview message protocol
export type MessageToWebview =
  | { type: 'response'; data: ApiResponse }
  | { type: 'error'; message: string }
  | { type: 'environments'; data: Environment[] }
  | { type: 'collections'; data: Collection[] }
  | { type: 'history'; data: HistoryEntry[] }
  | { type: 'activeEnvironment'; id: string | null }
  | { type: 'filePicked'; purpose: string; filePath: string; fileName: string };

export type MessageToExtension =
  | { type: 'sendRequest'; data: ApiRequest }
  | { type: 'saveRequest'; data: { collectionId: string; folderId?: string; request: ApiRequest } }
  | { type: 'loadCollections' }
  | { type: 'loadEnvironments' }
  | { type: 'saveEnvironment'; data: Environment }
  | { type: 'deleteEnvironment'; id: string }
  | { type: 'setActiveEnvironment'; id: string | null }
  | { type: 'loadHistory' }
  | { type: 'createCollection'; name: string }
  | { type: 'deleteCollection'; id: string }
  | { type: 'runPreRequestScript'; script: string; request: ApiRequest }
  | { type: 'runTestScript'; script: string; request: ApiRequest; response: ApiResponse }
  | { type: 'pickFile'; purpose: string };
