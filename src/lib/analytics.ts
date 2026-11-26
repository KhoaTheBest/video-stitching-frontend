/**
 * Cloudflare Web Analytics: cookieless page-view analytics, no cookie banner needed.
 * Off unless VITE_CF_ANALYTICS_TOKEN is set at build time. The beacon tracks
 * client-side route changes (history API) by itself.
 */
export const CF_BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function analyticsToken(env: { VITE_CF_ANALYTICS_TOKEN?: string } = import.meta.env): string | null {
  const token = env.VITE_CF_ANALYTICS_TOKEN?.trim();
  return token ? token : null;
}

export const analyticsEnabled = analyticsToken() !== null;

/** Adds the beacon script once. Returns whether analytics is on. */
export function initAnalytics(token: string | null = analyticsToken(), doc: Document = document): boolean {
  if (!token) return false;
  if (doc.querySelector(`script[src="${CF_BEACON_SRC}"]`)) return true;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = CF_BEACON_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  doc.head.appendChild(script);
  return true;
}
