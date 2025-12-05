export const buildAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  const base = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

  try {
    const apiUrl = new URL(base, window.location.origin);
    const origin = `${apiUrl.protocol}//${apiUrl.host}`;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${origin}${path}`;
  } catch (err) {
    return url;
  }
};
