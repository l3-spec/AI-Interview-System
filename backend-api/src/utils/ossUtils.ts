import { ossService } from '../services/ossService';

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
