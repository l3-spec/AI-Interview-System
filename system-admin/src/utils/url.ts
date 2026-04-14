const KNOWN_LOCAL_PREFIXES = ['/api/', '/uploads/', '/videos/', '/avatar/', '/models/'];
const KNOWN_UPLOAD_FOLDERS = new Set([
  'logos',
  'licenses',
  'resumes',
  'avatars',
  'posts',
  'others',
  'videos',
  'audio',
]);

const inferUploadFolderFromFilename = (filename: string) => {
  if (filename.startsWith('logo-')) return 'logos';
  if (filename.startsWith('businessLicense-')) return 'licenses';
  if (filename.startsWith('resume-')) return 'resumes';
  if (filename.startsWith('avatar-')) return 'avatars';
  if (filename.startsWith('postImages-')) return 'posts';
  if (filename.startsWith('video-')) return 'videos';
  return '';
};

const normalizeLegacyUploadPath = (value: string) => {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '/');

  if (!normalized.startsWith('/uploads/')) {
    return normalized;
  }

  const rest = normalized.slice('/uploads/'.length);
  const [firstSegment = '', ...remaining] = rest.split('/');

  if (!firstSegment || KNOWN_UPLOAD_FOLDERS.has(firstSegment) || remaining.length > 0) {
    return normalized;
  }

  const inferredFolder = inferUploadFolderFromFilename(firstSegment);
  return inferredFolder ? `/uploads/${inferredFolder}/${firstSegment}` : normalized;
};

export const buildAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname.includes('aliyuncs.com')) {
        return buildAssetUrl(parsed.pathname.replace(/^\/+/, ''));
      }
    } catch (err) {
      return trimmed;
    }
    return trimmed;
  }

  const base = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

  try {
    const apiUrl = new URL(base, window.location.origin);
    const origin = `${apiUrl.protocol}//${apiUrl.host}`;
    const isKnownLocalPath = KNOWN_LOCAL_PREFIXES.some(
      (prefix) => trimmed.startsWith(prefix) || trimmed.startsWith(prefix.slice(1))
    );

    if (isKnownLocalPath) {
      const path = normalizeLegacyUploadPath(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
      return `${origin}${path}`;
    }

    return `${origin}/api/oss/proxy?objectKey=${encodeURIComponent(trimmed.replace(/^\/+/, ''))}`;
  } catch (err) {
    return trimmed;
  }
};
