/**
 * Recursively replaces {{variable}} placeholders with values from the variables map.
 */
export function interpolateVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

/**
 * Resolves variables across scopes (request > collection > workspace > global).
 * Later scopes are overridden by earlier ones.
 */
export function resolveVariables(
  ...scopes: Record<string, string>[]
): Record<string, string> {
  const resolved: Record<string, string> = {};
  // Apply from lowest priority to highest (last arg = highest priority)
  for (const scope of scopes) {
    Object.assign(resolved, scope);
  }
  return resolved;
}
