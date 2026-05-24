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
