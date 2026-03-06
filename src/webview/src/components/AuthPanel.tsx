import React from 'react';
import { useRequestStore } from '../stores/requestStore';
import { AuthType } from '../types/messages';

const authTypes: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'aws-sigv4', label: 'AWS Signature V4' },
];

export function AuthPanel() {
  const auth = useRequestStore((s) => s.auth);
  const setAuth = useRequestStore((s) => s.setAuth);

  return (
    <div className="flex flex-col gap-2.5">
      <select
        value={auth.type}
        onChange={(e) => setAuth({ ...auth, type: e.target.value as AuthType })}
        className="select-field w-48 text-xs"
      >
        {authTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {auth.type === 'none' && (
        <p className="text-[11px] opacity-40">No authentication will be used.</p>
      )}

      {auth.type === 'basic' && (
        <div className="flex flex-col gap-2">
          <Field label="Username" value={auth.basic?.username || ''}
            onChange={(v) => setAuth({ ...auth, basic: { username: v, password: auth.basic?.password || '' } })} />
          <Field label="Password" type="password" value={auth.basic?.password || ''}
            onChange={(v) => setAuth({ ...auth, basic: { username: auth.basic?.username || '', password: v } })} />
        </div>
      )}

      {auth.type === 'bearer' && (
        <Field label="Token" value={auth.bearer?.token || ''} placeholder="Enter bearer token"
          onChange={(v) => setAuth({ ...auth, bearer: { token: v } })} />
      )}

      {auth.type === 'api-key' && (
        <div className="flex flex-col gap-2">
          <Field label="Key" value={auth.apiKey?.key || ''} placeholder="X-API-Key"
            onChange={(v) => setAuth({ ...auth, apiKey: { ...auth.apiKey!, key: v, value: auth.apiKey?.value || '', addTo: auth.apiKey?.addTo || 'header' } })} />
          <Field label="Value" value={auth.apiKey?.value || ''} placeholder="API key value"
            onChange={(v) => setAuth({ ...auth, apiKey: { ...auth.apiKey!, value: v } })} />
          <div>
            <label className="text-[10px] uppercase tracking-wider opacity-35 font-medium block mb-0.5">Add to</label>
            <select className="select-field w-32 text-xs"
              value={auth.apiKey?.addTo || 'header'}
              onChange={(e) => setAuth({ ...auth, apiKey: { ...auth.apiKey!, addTo: e.target.value as 'header' | 'query' } })}
            >
              <option value="header">Header</option>
              <option value="query">Query Param</option>
            </select>
          </div>
        </div>
      )}

      {auth.type === 'oauth2' && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider opacity-35 font-medium block mb-0.5">Grant Type</label>
            <select className="select-field w-48 text-xs"
              value={auth.oauth2?.grantType || 'authorization_code'}
              onChange={(e) => setAuth({ ...auth, oauth2: { ...auth.oauth2!, grantType: e.target.value as 'authorization_code' | 'client_credentials' } })}
            >
              <option value="authorization_code">Authorization Code</option>
              <option value="client_credentials">Client Credentials</option>
            </select>
          </div>
          {[
            { key: 'authUrl', label: 'Auth URL' },
            { key: 'tokenUrl', label: 'Token URL' },
            { key: 'clientId', label: 'Client ID' },
            { key: 'clientSecret', label: 'Client Secret', type: 'password' },
            { key: 'scope', label: 'Scope' },
          ].map(({ key, label, type }) => (
            <Field key={key} label={label} type={type} value={(auth.oauth2 as Record<string, string>)?.[key] || ''}
              onChange={(v) => setAuth({ ...auth, oauth2: { ...auth.oauth2!, [key]: v } as typeof auth.oauth2 })} />
          ))}
          {auth.oauth2?.accessToken && (
            <Field label="Access Token (obtained)" value={auth.oauth2.accessToken} readOnly />
          )}
        </div>
      )}

      {auth.type === 'aws-sigv4' && (
        <div className="flex flex-col gap-2">
          {[
            { key: 'accessKey', label: 'Access Key' },
            { key: 'secretKey', label: 'Secret Key', type: 'password' },
            { key: 'region', label: 'Region' },
            { key: 'service', label: 'Service' },
          ].map(({ key, label, type }) => (
            <Field key={key} label={label} type={type} value={(auth.awsSigV4 as Record<string, string>)?.[key] || ''}
              onChange={(v) => setAuth({ ...auth, awsSigV4: { ...auth.awsSigV4!, [key]: v } as typeof auth.awsSigV4 })} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder, readOnly }: {
  label: string; value: string; onChange?: (v: string) => void; type?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider opacity-35 font-medium block mb-0.5">{label}</label>
      <input
        className="input-line w-full text-[12px]"
        type={type || 'text'}
        placeholder={placeholder || label}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
      />
    </div>
  );
}
