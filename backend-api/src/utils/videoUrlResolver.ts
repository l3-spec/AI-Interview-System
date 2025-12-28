import { ossService } from '../services/ossService';

const DEFAULT_PREFIX = 'interview-videos';

const isHttpUrl = (value?: string | null) => {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
};

const normalizeObjectKey = (value: string) => value.replace(/^\/+/, '');

export const resolveVideoUrl = (params: {
  sessionId?: string | null;
  answerVideoUrl?: string | null;
  answerVideoPath?: string | null;
  questionIndex?: number | null;
}): string | null => {
  const { sessionId, answerVideoUrl, answerVideoPath } = params;

  if (isHttpUrl(answerVideoUrl)) {
    return answerVideoUrl as string;
  }

  if (isHttpUrl(answerVideoPath)) {
    return answerVideoPath as string;
  }

  const pathCandidate = answerVideoUrl || answerVideoPath;
  if (!pathCandidate) {
    return null;
  }

  let objectKey = normalizeObjectKey(pathCandidate);
  if (!objectKey.includes('/')) {
    if (!sessionId) {
      return null;
    }
    objectKey = `${DEFAULT_PREFIX}/${sessionId}/${objectKey}`;
  } else if (!objectKey.startsWith(`${DEFAULT_PREFIX}/`) && sessionId) {
    objectKey = `${DEFAULT_PREFIX}/${sessionId}/${objectKey.split('/').pop()}`;
  }

  const bucket = process.env.OSS_BUCKET || 'ai-interview-videos';
  const region = process.env.OSS_REGION || 'oss-cn-beijing';
  const cdnDomain = process.env.OSS_CDN_DOMAIN;
  const baseUrl = cdnDomain
    ? `https://${cdnDomain.replace(/^https?:\/\//, '')}`
    : `https://${bucket}.${region}.aliyuncs.com`;

  return `${baseUrl}/${objectKey}`;
};

export const extractObjectKeyFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return normalizeObjectKey(parsed.pathname);
  } catch (error) {
    if (url.includes('aliyuncs.com/')) {
      const parts = url.split('aliyuncs.com/');
      if (parts.length > 1) {
        return normalizeObjectKey(parts[1].split('?')[0]);
      }
    }
    return null;
  }
};

export const buildObjectKey = (params: {
  sessionId?: string | null;
  answerVideoUrl?: string | null;
  answerVideoPath?: string | null;
  questionIndex?: number | null;
}): string | null => {
  const { sessionId, answerVideoUrl, answerVideoPath } = params;
  const pathCandidate = answerVideoUrl || answerVideoPath;
  if (!pathCandidate) {
    return null;
  }
  if (isHttpUrl(pathCandidate)) {
    return extractObjectKeyFromUrl(pathCandidate) || null;
  }
  let objectKey = normalizeObjectKey(pathCandidate);
  if (!objectKey.includes('/')) {
    if (!sessionId) {
      return null;
    }
    objectKey = `${DEFAULT_PREFIX}/${sessionId}/${objectKey}`;
  } else if (!objectKey.startsWith(`${DEFAULT_PREFIX}/`) && sessionId) {
    objectKey = `${DEFAULT_PREFIX}/${sessionId}/${objectKey.split('/').pop()}`;
  }
  return objectKey;
};

export const resolveVideoAccessUrl = async (params: {
  sessionId?: string | null;
  answerVideoUrl?: string | null;
  answerVideoPath?: string | null;
  questionIndex?: number | null;
  expiresInSeconds?: number;
}): Promise<string | null> => {
  const directUrl = resolveVideoUrl(params);
  if (!directUrl) {
    return null;
  }

  if (isHttpUrl(params.answerVideoUrl) || isHttpUrl(params.answerVideoPath)) {
    return directUrl;
  }

  const objectKey = buildObjectKey(params);
  if (!objectKey) {
    return directUrl;
  }

  try {
    return await ossService.generateSignedUrl(objectKey, params.expiresInSeconds || 3600);
  } catch (error) {
    return directUrl;
  }
};
