import type { ResumeData } from '@repo/shared-types';

// Delta type from jsondiffpatch
export type JsonDiff = jsondiffpatch.Delta | undefined;

// Compute the diff between two ResumeData objects using jsondiffpatch
export function computeJsonDiff(
  dataA: ResumeData | null | undefined,
  dataB: ResumeData | null | undefined
): JsonDiff {
  if (!dataA && !dataB) {
    return undefined;
  }

  return jsondiffpatch.diff(dataA ?? null, dataB ?? null);
}

// Check if there are any differences
export function hasDifferences(diff: JsonDiff): boolean {
  return diff !== undefined && Object.keys(diff).length > 0;
}

// Format a value for display (truncate long strings)
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    if (value.length > 50) {
      return `"${value.substring(0, 50)}..."`;
    }
    return `"${value}"`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
