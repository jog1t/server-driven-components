/**
 * Automatic Component ID Generation
 *
 * Generates unique IDs for reactive server components without requiring
 * manual ID passing. Uses Error stack traces to determine component location.
 */

const componentRegistry = new Map<string, number>();

/**
 * Generate a unique component ID automatically
 *
 * Uses the call stack to determine the component's file location and
 * generates a unique ID based on that. Multiple instances of the same
 * component get incrementing suffixes.
 *
 * @param prefix - Optional prefix for the ID
 * @returns Unique component ID
 */
export function generateComponentId(prefix?: string): string {
  // Get call stack to find component location
  const stack = new Error().stack || '';
  const stackLines = stack.split('\n');

  // Find the line that called this function (skip Error, generateComponentId, and immediate caller)
  const callerLine = stackLines[3] || stackLines[2] || '';

  // Extract file path and line number
  // Example: "at ServerClock (/path/to/server-clock.tsx:15:25)"
  const match = callerLine.match(/\((.+?):(\d+):(\d+)\)/) || callerLine.match(/at (.+?):(\d+):(\d+)/);

  let componentKey: string;

  if (match) {
    const filePath = match[1];
    const lineNumber = match[2];

    // Extract just the filename (not full path)
    const fileName = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'unknown';

    componentKey = `${fileName}:${lineNumber}`;
  } else {
    // Fallback if we can't parse stack
    componentKey = `component-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // Add instance counter for multiple instances of same component
  const instanceCount = componentRegistry.get(componentKey) || 0;
  componentRegistry.set(componentKey, instanceCount + 1);

  const instanceSuffix = instanceCount > 0 ? `-${instanceCount}` : '';

  const id = prefix
    ? `${prefix}-${componentKey}${instanceSuffix}`
    : `${componentKey}${instanceSuffix}`;

  console.log(`[ComponentID] Generated: ${id}`);

  return id;
}

/**
 * Reset the component registry (useful for testing)
 */
export function resetComponentRegistry(): void {
  componentRegistry.clear();
}
