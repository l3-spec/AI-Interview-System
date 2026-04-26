import { ossService } from '../services/ossService';

const LOCAL_STATIC_PREFIXES = ['/uploads/', '/videos/', '/avatar/', '/models/'];
const LOCAL_UPLOAD_FOLDERS = new Set([
  'logos',
  'licenses',
  'resumes',
  'avatars',
  'posts',
  'others',
  'videos',
  'audio'
]);

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

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
  const normalized = ensureLeadingSlash(value.replace(/\\/g, '/').replace(/^\/+/, ''));

  if (!normalized.startsWith('/uploads/')) {
    return normalized;
  }

  const rest = normalized.slice('/uploads/'.length);
  const [firstSegment = '', ...remaining] = rest.split('/');

  if (!firstSegment) {
    return normalized;
  }

  if (LOCAL_UPLOAD_FOLDERS.has(firstSegment)) {
    return normalized;
  }

  if (remaining.length === 0) {
    const inferredFolder = inferUploadFolderFromFilename(firstSegment);
    if (inferredFolder) {
      return `/uploads/${inferredFolder}/${firstSegment}`;
    }
  }

  return normalized;
};

const isLocalStaticPath = (value: string) => {
  const localPrefixes = ['/static/', 'static/', '/avatar/', 'avatar/', '/models/', 'models/'];
  // 如果未配置 OSS，uploads/ 和 videos/ 也视为本地
  if (!isOSSConfigured()) {
    localPrefixes.push('/uploads/', 'uploads/', '/videos/', 'videos/');
  }
  return localPrefixes.some((prefix) => value.startsWith(prefix));
};

export const isOSSConfigured = () =>
  Boolean(
    process.env.OSS_ACCESS_KEY_ID &&
    process.env.OSS_ACCESS_KEY_SECRET &&
    process.env.OSS_BUCKET
  );

export const typeToFolder = (type?: string) => {
  switch (type) {
    case 'logo':
      return 'logos';
    case 'license':
      return 'licenses';
    case 'resume':
      return 'resumes';
    case 'avatar':
      return 'avatars';
    case 'banner':
      return 'banners';
    default:
      return 'others';
  }
};

// 将URL或本地路径转换为OSS objectKey（去掉域名和前导/）
export const toObjectKey = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return url.pathname.replace(/^\/+/, '');
    } catch (err) {
      return trimmed.replace(/^https?:\/\//i, '').replace(/^\/+/, '');
    }
  }

  return trimmed.replace(/^\/+/, '');
};

// 将 objectKey 转换为可访问的完整URL；如果已是完整URL则直接返回
export const toPublicUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const str = value.toString();
  if (/^https?:\/\//i.test(str)) return str;

  const key = str.replace(/^\/+/, '');
  if (!key) return undefined;

  // 统一通过后端代理输出，避免在前端暴露签名参数
  return `/api/oss/proxy?objectKey=${encodeURIComponent(key)}`;
};

export const toMediaUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.toString().trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const cdnDomain = (process.env.OSS_CDN_DOMAIN || '').replace(/^https?:\/\//, '');
      const isManagedOssUrl =
        parsed.hostname.includes('aliyuncs.com') ||
        (!!cdnDomain && parsed.hostname === cdnDomain);

      if (isManagedOssUrl) {
        const objectKey = parsed.pathname.replace(/^\/+/, '');
        return objectKey
          ? `/api/oss/proxy?objectKey=${encodeURIComponent(objectKey)}`
          : trimmed;
      }
    } catch (error) {
      return trimmed;
    }

    return trimmed;
  }

  if (trimmed.startsWith('/api/')) {
    return trimmed;
  }

  // 优先判断是否是本地路径（不包含 uploads/，除非没配 OSS）
  if (isLocalStaticPath(trimmed)) {
    return normalizeLegacyUploadPath(trimmed);
  }

  // 其他情况（如 uploads/ 开头且配了 OSS，或随机 key）走 OSS 代理
  return `/api/oss/proxy?objectKey=${encodeURIComponent(trimmed.replace(/^\/+/, ''))}`;
};
