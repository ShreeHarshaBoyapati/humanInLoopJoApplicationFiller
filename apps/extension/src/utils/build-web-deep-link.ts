// Builds the web deep-link URL for the persona-resumes route so the extension's
// info banner can open the matching persona/resume on the web side.
export function buildWebDeepLink(params: { personaId?: string; resumeId?: string }): string {
  const baseUrl = import.meta.env.VITE_WEB_APP_URL || 'http://localhost';
  const port = import.meta.env.VITE_WEB_APP_PORT;
  const fullBaseUrl = port ? `${baseUrl}:${port}` : baseUrl;
  const search = new URLSearchParams();
  if (params.personaId) search.set('personaId', params.personaId);
  if (params.resumeId) search.set('resumeId', params.resumeId);
  const query = search.toString();
  return query ? `${fullBaseUrl}/persona-resumes?${query}` : `${fullBaseUrl}/persona-resumes`;
}
