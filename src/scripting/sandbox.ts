import * as vm from 'vm';
import { ApiRequest, ApiResponse } from '../core/types';

interface ScriptResult {
  logs: string[];
  error?: string;
  updatedRequest?: ApiRequest;
  environmentUpdates?: Record<string, string>;
}

export function runScript(
  script: string,
  context: {
    request: ApiRequest;
    response?: ApiResponse;
    environment: Record<string, string>;
  }
): ScriptResult {
  const logs: string[] = [];
  const envUpdates: Record<string, string> = {};

  const sandbox = {
    request: { ...context.request },
    response: context.response ? { ...context.response, json: () => JSON.parse(context.response!.body) } : undefined,
    environment: {
      get: (key: string) => context.environment[key] ?? '',
      set: (key: string, value: string) => { envUpdates[key] = value; },
    },
    console: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      assert: (condition: boolean, msg?: string) => {
        if (!condition) { logs.push(`Assertion failed: ${msg || ''}`); }
      },
    },
  };

  try {
    const ctx = vm.createContext(sandbox);
    vm.runInContext(script, ctx, { timeout: 5000 });
    return { logs, updatedRequest: sandbox.request as ApiRequest, environmentUpdates: envUpdates };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Script error';
    return { logs, error: message };
  }
}
