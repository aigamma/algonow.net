const configuredMediaBaseUrl = import.meta.env?.VITE_MEDIA_BASE_URL?.trim() || '';

export const MEDIA_BASE_URL = configuredMediaBaseUrl.replace(/\/+$/, '');

export function mediaUrl(objectKey, baseUrl = MEDIA_BASE_URL) {
  const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!cleanBase || typeof objectKey !== 'string' || !objectKey.trim()) return '';

  const encodedKey = objectKey
    .trim()
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${cleanBase}/${encodedKey}`;
}
