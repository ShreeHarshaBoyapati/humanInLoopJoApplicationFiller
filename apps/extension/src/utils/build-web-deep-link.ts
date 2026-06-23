/**
 * Builds the web deep-link URL for any web route so the extension can open it
 * in a new tab. Supports:
 *  - the legacy persona/resumes deep link (`{ personaId, resumeId }`)
 *  - arbitrary path + query (`{ path: '/dashboard' }` or `{ path: '/job-tracker', search: { status: 'applied' } }`)
 */
type LegacyDeepLink = { personaId?: string; resumeId?: string };
type GenericDeepLink = { path: string; search?: Record<string, string | undefined> };

export function buildWebDeepLink(params: LegacyDeepLink | GenericDeepLink): string {
  const baseUrl = import.meta.env.VITE_WEB_APP_URL || 'http://localhost';
  const port = import.meta.env.VITE_WEB_APP_PORT;
  const fullBaseUrl = port ? `${baseUrl}:${port}` : baseUrl;

  if (isLegacyParams(params)) {
    const search = new URLSearchParams();
    if (params.personaId) search.set('personaId', params.personaId);
    if (params.resumeId) search.set('resumeId', params.resumeId);
    const query = search.toString();
    return query ? `${fullBaseUrl}/persona-resumes?${query}` : `${fullBaseUrl}/persona-resumes`;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params.search ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  const normalizedPath = params.path.startsWith('/') ? params.path : `/${params.path}`;
  return query ? `${fullBaseUrl}${normalizedPath}?${query}` : `${fullBaseUrl}${normalizedPath}`;
}

function isLegacyParams(params: LegacyDeepLink | GenericDeepLink): params is LegacyDeepLink {
  return 'personaId' in params || 'resumeId' in params;
}
