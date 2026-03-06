import React from 'react';
import { useRequestStore } from '../stores/requestStore';
import { TestRule, SetVariable, TestSource, TestOperator } from '../types/messages';
import { X, Plus } from 'lucide-react';

const SOURCES: { value: TestSource; label: string; group: string }[] = [
  { value: 'status', label: 'Status Code', group: 'Response' },
  { value: 'time', label: 'Response Time (ms)', group: 'Response' },
  { value: 'size', label: 'Response Size', group: 'Response' },
  { value: 'body', label: 'Response Body', group: 'Response' },
  { value: 'body-contains', label: 'Body Contains', group: 'Response' },
  { value: 'body-is-json', label: 'Body Is JSON', group: 'Response' },
  { value: 'body-schema', label: 'Body Schema', group: 'Response' },
  { value: 'jsonpath', label: 'JSON Path', group: 'JSON' },
  { value: 'header', label: 'Header Value', group: 'Headers' },
  { value: 'content-type', label: 'Content-Type', group: 'Headers' },
  { value: 'content-length', label: 'Content-Length', group: 'Headers' },
];

const OPERATORS: { value: TestOperator; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not-contains', label: 'Not Contains' },
  { value: 'matches', label: 'Matches (Regex)' },
  { value: 'not-matches', label: 'Not Matches' },
  { value: 'is-empty', label: 'Is Empty' },
  { value: 'is-not-empty', label: 'Is Not Empty' },
  { value: 'exists', label: 'Exists' },
  { value: 'not-exists', label: 'Not Exists' },
  { value: 'is-type', label: 'Is Type' },
];

const NUMERIC_SOURCES = new Set(['status', 'time', 'size', 'content-length']);
const NO_EXPECTED = new Set(['is-empty', 'is-not-empty', 'exists', 'not-exists']);
const NEEDS_PROPERTY = new Set(['jsonpath', 'header', 'body-contains']);

const VAR_SOURCES: { value: SetVariable['source']; label: string }[] = [
  { value: 'jsonpath', label: 'JSON Path' },
  { value: 'header', label: 'Header' },
  { value: 'body', label: 'Full Body' },
  { value: 'regex', label: 'Regex (capture group)' },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function TestBuilder() {
  const testRules = useRequestStore((s) => s.testRules);
  const setTestRules = useRequestStore((s) => s.setTestRules);
  const setVariables = useRequestStore((s) => s.setVariables);
  const setSetVariables = useRequestStore((s) => s.setSetVariables);

  const addRule = () => setTestRules([...testRules, { id: uid(), source: 'status', property: '', operator: 'eq', expected: '200', enabled: true }]);
  const updateRule = (id: string, updates: Partial<TestRule>) => setTestRules(testRules.map(r => r.id === id ? { ...r, ...updates } : r));
  const removeRule = (id: string) => setTestRules(testRules.filter(r => r.id !== id));

  const addVar = () => setSetVariables([...setVariables, { id: uid(), source: 'jsonpath', property: '', variableName: '', enabled: true }]);
  const updateVar = (id: string, updates: Partial<SetVariable>) => setSetVariables(setVariables.map(v => v.id === id ? { ...v, ...updates } : v));
  const removeVar = (id: string) => setSetVariables(setVariables.filter(v => v.id !== id));

  return (
    <div className="flex flex-col gap-3">
      {/* Test Rules */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Test Assertions</span>
          <button onClick={addRule} className="btn-ghost text-[11px] flex items-center gap-0.5 opacity-60 hover:opacity-100">
            <Plus size={10} /> Add Test
          </button>
        </div>
        {testRules.length === 0 && <p className="text-[11px] opacity-30 py-2">No tests configured. Click "Add Test" to start.</p>}
        <div className="flex flex-col gap-1">
          {testRules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-1 group">
              <input type="checkbox" checked={rule.enabled} onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })} className="shrink-0" />
              <select
                value={rule.source}
                onChange={(e) => updateRule(rule.id, { source: e.target.value as TestSource, property: '', expected: e.target.value === 'status' ? '200' : '' })}
                className="select-field text-[10px] py-0.5 w-[110px] shrink-0"
              >
                {Object.entries(
                  SOURCES.reduce<Record<string, typeof SOURCES>>((g, s) => { (g[s.group] = g[s.group] || []).push(s); return g; }, {})
                ).map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </optgroup>
                ))}
              </select>
              {NEEDS_PROPERTY.has(rule.source) && (
                <input
                  className="input-field text-[10px] py-0.5 w-[100px] shrink-0 min-w-0"
                  placeholder={rule.source === 'jsonpath' ? 'data.id' : rule.source === 'header' ? 'Header name' : 'Search text'}
                  value={rule.property}
                  onChange={(e) => updateRule(rule.id, { property: e.target.value })}
                />
              )}
              <select
                value={rule.operator}
                onChange={(e) => updateRule(rule.id, { operator: e.target.value as TestOperator })}
                className="select-field text-[10px] py-0.5 w-[100px] shrink-0"
              >
                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {!NO_EXPECTED.has(rule.operator) && (
                <input
                  className="input-field text-[10px] py-0.5 flex-1 min-w-0"
                  placeholder={rule.operator === 'matches' ? '/regex/' : rule.operator === 'is-type' ? 'string|number|boolean|object|array' : 'Expected value'}
                  value={rule.expected}
                  onChange={(e) => updateRule(rule.id, { expected: e.target.value })}
                />
              )}
              <button onClick={() => removeRule(rule.id)} className="shrink-0 p-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100"><X size={11} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Set Variables */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Set Variables</span>
          <button onClick={addVar} className="btn-ghost text-[11px] flex items-center gap-0.5 opacity-60 hover:opacity-100">
            <Plus size={10} /> Add Variable
          </button>
        </div>
        {setVariables.length === 0 && <p className="text-[11px] opacity-30 py-2">Extract response values into environment variables.</p>}
        <div className="flex flex-col gap-1">
          {setVariables.map((v) => (
            <div key={v.id} className="flex items-center gap-1 group">
              <input type="checkbox" checked={v.enabled} onChange={(e) => updateVar(v.id, { enabled: e.target.checked })} className="shrink-0" />
              <select
                value={v.source}
                onChange={(e) => updateVar(v.id, { source: e.target.value as SetVariable['source'] })}
                className="select-field text-[10px] py-0.5 w-[100px] shrink-0"
              >
                {VAR_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {v.source !== 'body' && (
                <input
                  className="input-field text-[10px] py-0.5 flex-1 min-w-0"
                  placeholder={v.source === 'jsonpath' ? 'data.token' : v.source === 'header' ? 'Header name' : 'Regex pattern'}
                  value={v.property}
                  onChange={(e) => updateVar(v.id, { property: e.target.value })}
                />
              )}
              <span className="text-[10px] opacity-30 shrink-0">→</span>
              <input
                className="input-field text-[10px] py-0.5 w-[100px] shrink-0 min-w-0"
                placeholder="{{variable}}"
                value={v.variableName}
                onChange={(e) => updateVar(v.id, { variableName: e.target.value })}
              />
              <button onClick={() => removeVar(v.id)} className="shrink-0 p-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100"><X size={11} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
