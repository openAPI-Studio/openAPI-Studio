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

  const inputStyle = { background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' };
  const inputClass = "w-full px-2 py-1 rounded text-sm";

  return (
    <div className="flex flex-col gap-3">
      <select
        value={auth.type}
        onChange={(e) => setAuth({ ...auth, type: e.target.value as AuthType })}
        className="px-2 py-1 rounded text-sm w-48"
        style={inputStyle}
      >
        {authTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {auth.type === 'none' && (
        <p className="text-sm opacity-50">No authentication will be used.</p>
      )}

      {auth.type === 'basic' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs opacity-70">Username</label>
          <input className={inputClass} style={inputStyle} placeholder="Username"
            value={auth.basic?.username || ''}
            onChange={(e) => setAuth({ ...auth, basic: { username: e.target.value, password: auth.basic?.password || '' } })}
          />
          <label className="text-xs opacity-70">Password</label>
          <input className={inputClass} style={inputStyle} type="password" placeholder="Password"
            value={auth.basic?.password || ''}
            onChange={(e) => setAuth({ ...auth, basic: { username: auth.basic?.username || '', password: e.target.value } })}
          />
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs opacity-70">Token</label>
          <input className={inputClass} style={inputStyle} placeholder="Enter bearer token"
            value={auth.bearer?.token || ''}
            onChange={(e) => setAuth({ ...auth, bearer: { token: e.target.value } })}
          />
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs opacity-70">Key</label>
          <input className={inputClass} style={inputStyle} placeholder="X-API-Key"
            value={auth.apiKey?.key || ''}
            onChange={(e) => setAuth({ ...auth, apiKey: { ...auth.apiKey!, key: e.target.value, value: auth.apiKey?.value || '', addTo: auth.apiKey?.addTo || 'header' } })}
          />
          <label className="text-xs opacity-70">Value</label>
          <input className={inputClass} style={inputStyle} placeholder="API key value"
            value={auth.apiKey?.value || ''}
            onChange={(e) => setAuth({ ...auth, apiKey: { ...auth.apiKey!, value: e.target.value } })}
          />
          <label className="text-xs opacity-70">Add to</label>
          <select className="px-2 py-1 rounded text-sm w-32" style={inputStyle}
            value={auth.apiKey?.addTo || 'header'}
            onChange={(e) => setAuth({ ...auth, apiKey: { ...auth.apiKey!, addTo: e.target.value as 'header' | 'query' } })}
          >
            <option value="header">Header</option>
            <option value="query">Query Param</option>
          </select>
        </div>
      )}

      {auth.type === 'oauth2' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs opacity-70">Grant Type</label>
          <select className="px-2 py-1 rounded text-sm w-48" style={inputStyle}
            value={auth.oauth2?.grantType || 'authorization_code'}
            onChange={(e) => setAuth({ ...auth, oauth2: { ...auth.oauth2!, grantType: e.target.value as 'authorization_code' | 'client_credentials' } })}
          >
            <option value="authorization_code">Authorization Code</option>
            <option value="client_credentials">Client Credentials</option>
          </select>
          {['authUrl', 'tokenUrl', 'clientId', 'clientSecret', 'scope'].map((field) => (
            <div key={field}>
              <label className="text-xs opacity-70">{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
              <input className={inputClass} style={inputStyle}
                type={field.includes('Secret') ? 'password' : 'text'}
                placeholder={field}
                value={(auth.oauth2 as Record<string, string>)?.[field] || ''}
                onChange={(e) => setAuth({ ...auth, oauth2: { ...auth.oauth2!, [field]: e.target.value } as typeof auth.oauth2 })}
              />
            </div>
          ))}
          {auth.oauth2?.accessToken && (
            <div>
              <label className="text-xs opacity-70">Access Token (obtained)</label>
              <input className={inputClass} style={inputStyle} readOnly value={auth.oauth2.accessToken} />
            </div>
          )}
        </div>
      )}

      {auth.type === 'aws-sigv4' && (
        <div className="flex flex-col gap-2">
          {['accessKey', 'secretKey', 'region', 'service'].map((field) => (
            <div key={field}>
              <label className="text-xs opacity-70">{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
              <input className={inputClass} style={inputStyle}
                type={field.includes('ecret') ? 'password' : 'text'}
                placeholder={field}
                value={(auth.awsSigV4 as Record<string, string>)?.[field] || ''}
                onChange={(e) => setAuth({ ...auth, awsSigV4: { ...auth.awsSigV4!, [field]: e.target.value } as typeof auth.awsSigV4 })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
