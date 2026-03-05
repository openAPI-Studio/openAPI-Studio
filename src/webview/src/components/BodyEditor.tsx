import React, { useEffect } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { BodyType, FormDataItem, postMessage, onMessage } from '../types/messages';
import { KeyValueEditor } from './KeyValueEditor';
import { Upload, X, File } from 'lucide-react';

const bodyTypes: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'raw', label: 'Raw' },
  { value: 'xml', label: 'XML' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'binary', label: 'Binary' },
];

export function BodyEditor() {
  const body = useRequestStore((s) => s.body);
  const setBody = useRequestStore((s) => s.setBody);

  useEffect(() => {
    const handler = (msg: unknown) => {
      const m = msg as { type: string; purpose?: string; filePath?: string; fileName?: string };
      if (m.type !== 'filePicked') return;
      if (m.purpose === 'binary') {
        setBody({ ...useRequestStore.getState().body, binaryPath: m.filePath, binaryName: m.fileName });
      } else if (m.purpose?.startsWith('formdata-')) {
        const idx = parseInt(m.purpose.split('-')[1], 10);
        const items = [...(useRequestStore.getState().body.formDataFiles || [])];
        if (items[idx]) {
          items[idx] = { ...items[idx], filePath: m.filePath!, fileName: m.fileName!, value: m.fileName! };
          setBody({ ...useRequestStore.getState().body, formDataFiles: items });
        }
      }
    };
    onMessage(handler);
  }, []);

  const formItems = body.formDataFiles || (body.formData || [{ key: '', value: '', enabled: true }]).map(
    kv => ({ ...kv, fieldType: 'text' as const })
  );

  const updateFormItem = (index: number, updates: Partial<FormDataItem>) => {
    const items = formItems.map((item, i) => i === index ? { ...item, ...updates } : item);
    setBody({ ...body, formDataFiles: items });
  };

  const removeFormItem = (index: number) => {
    const items = formItems.filter((_, i) => i !== index);
    if (items.length === 0) items.push({ key: '', value: '', enabled: true, fieldType: 'text' });
    setBody({ ...body, formDataFiles: items });
  };

  return (
    <div className="flex flex-col gap-2">
      <select
        value={body.type}
        onChange={(e) => setBody({ ...body, type: e.target.value as BodyType })}
        className="select-field w-44 text-xs"
      >
        {bodyTypes.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {body.type === 'none' && (
        <p className="text-[11px] opacity-40">This request does not have a body.</p>
      )}

      {(body.type === 'json' || body.type === 'raw' || body.type === 'xml') && (
        <textarea
          className="input-field w-full h-44 font-mono text-[11px] resize-y"
          placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Enter body content...'}
          value={body.raw || ''}
          onChange={(e) => setBody({ ...body, raw: e.target.value })}
        />
      )}

      {body.type === 'x-www-form-urlencoded' && (
        <KeyValueEditor
          items={body.formData || [{ key: '', value: '', enabled: true }]}
          onChange={(formData) => setBody({ ...body, formData })}
        />
      )}

      {body.type === 'form-data' && (
        <div className="flex flex-col gap-1">
          {formItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1 group">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => updateFormItem(i, { enabled: e.target.checked })}
                className="shrink-0"
              />
              <select
                value={item.fieldType}
                onChange={(e) => updateFormItem(i, { fieldType: e.target.value as 'text' | 'file', value: '', filePath: undefined, fileName: undefined })}
                className="select-field text-[10px] shrink-0 w-14 py-1"
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
              <input
                className="input-field w-28 text-[11px] py-1"
                placeholder="Key"
                value={item.key}
                onChange={(e) => updateFormItem(i, { key: e.target.value })}
              />
              {item.fieldType === 'file' ? (
                <button
                  onClick={() => postMessage({ type: 'pickFile', purpose: `formdata-${i}` })}
                  className="input-field flex-1 flex items-center gap-1 text-[11px] py-1 cursor-pointer truncate"
                >
                  {item.fileName ? <><File size={11} /> {item.fileName}</> : <><Upload size={11} className="opacity-40" /> Choose file</>}
                </button>
              ) : (
                <input
                  className="input-field flex-1 text-[11px] py-1"
                  placeholder="Value"
                  value={item.value}
                  onChange={(e) => updateFormItem(i, { value: e.target.value })}
                />
              )}
              <button
                onClick={() => removeFormItem(i)}
                className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setBody({ ...body, formDataFiles: [...formItems, { key: '', value: '', enabled: true, fieldType: 'text' }] })}
            className="btn-ghost self-start text-[11px] opacity-60"
          >
            + Add
          </button>
        </div>
      )}

      {body.type === 'binary' && (
        <div
          className="flex flex-col items-center justify-center gap-2 py-6 rounded cursor-pointer transition-colors duration-150 hover:opacity-80"
          style={{ background: 'var(--vsc-input-bg)', border: '2px dashed var(--vsc-input-border)' }}
          onClick={() => postMessage({ type: 'pickFile', purpose: 'binary' })}
        >
          {body.binaryName ? (
            <>
              <File size={22} className="opacity-50" />
              <span className="text-xs">{body.binaryName}</span>
              <span className="text-[10px] opacity-30">Click to change file</span>
            </>
          ) : (
            <>
              <Upload size={22} className="opacity-30" />
              <span className="text-xs opacity-40">Click to select a file</span>
            </>
          )}
        </div>
      )}

      {body.type === 'graphql' && (
        <div className="flex flex-col gap-2">
          <textarea
            className="input-field w-full h-28 font-mono text-[11px] resize-y"
            placeholder={'query {\n  users {\n    id\n    name\n  }\n}'}
            value={body.graphql?.query || ''}
            onChange={(e) => setBody({ ...body, graphql: { query: e.target.value, variables: body.graphql?.variables || '{}' } })}
          />
          <label className="text-[10px] opacity-50">Variables (JSON)</label>
          <textarea
            className="input-field w-full h-16 font-mono text-[11px] resize-y"
            placeholder='{}'
            value={body.graphql?.variables || '{}'}
            onChange={(e) => setBody({ ...body, graphql: { query: body.graphql?.query || '', variables: e.target.value } })}
          />
        </div>
      )}
    </div>
  );
}
