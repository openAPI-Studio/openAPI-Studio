import React from 'react';
import { useRequestStore } from '../stores/requestStore';
import { BodyType } from '../types/messages';
import { KeyValueEditor } from './KeyValueEditor';

const bodyTypes: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'raw', label: 'Raw' },
  { value: 'xml', label: 'XML' },
  { value: 'graphql', label: 'GraphQL' },
];

export function BodyEditor() {
  const body = useRequestStore((s) => s.body);
  const setBody = useRequestStore((s) => s.setBody);

  return (
    <div className="flex flex-col gap-2">
      <select
        value={body.type}
        onChange={(e) => setBody({ ...body, type: e.target.value as BodyType })}
        className="px-2 py-1 rounded text-sm w-48"
        style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
      >
        {bodyTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {body.type === 'none' && (
        <p className="text-sm opacity-50">This request does not have a body.</p>
      )}

      {(body.type === 'json' || body.type === 'raw' || body.type === 'xml') && (
        <textarea
          className="w-full h-48 px-3 py-2 rounded text-sm font-mono resize-y"
          style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
          placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Enter body content...'}
          value={body.raw || ''}
          onChange={(e) => setBody({ ...body, raw: e.target.value })}
        />
      )}

      {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && (
        <KeyValueEditor
          items={body.formData || [{ key: '', value: '', enabled: true }]}
          onChange={(formData) => setBody({ ...body, formData })}
        />
      )}

      {body.type === 'graphql' && (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full h-32 px-3 py-2 rounded text-sm font-mono resize-y"
            style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
            placeholder={'query {\n  users {\n    id\n    name\n  }\n}'}
            value={body.graphql?.query || ''}
            onChange={(e) => setBody({ ...body, graphql: { query: e.target.value, variables: body.graphql?.variables || '{}' } })}
          />
          <label className="text-xs opacity-70">Variables (JSON)</label>
          <textarea
            className="w-full h-20 px-3 py-2 rounded text-sm font-mono resize-y"
            style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}
            placeholder='{}'
            value={body.graphql?.variables || '{}'}
            onChange={(e) => setBody({ ...body, graphql: { query: body.graphql?.query || '', variables: e.target.value } })}
          />
        </div>
      )}
    </div>
  );
}
