const MESSAGE_TYPES = ['SYSTEM', 'INTERACTION', 'SUPPORT', 'INTERVIEW', 'CHAT'];
const MESSAGE_STATUS = ['UNREAD', 'READ', 'ARCHIVED'];

export const normalizeType = (raw?: string | null) => {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return MESSAGE_TYPES.includes(upper) ? upper : undefined;
};

export const normalizeStatus = (raw?: string | null) => {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return MESSAGE_STATUS.includes(upper) ? upper : undefined;
};

export const truncateContent = (content: string, limit = 120) => {
  const trimmed = content.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}…`;
};

export const parseJson = <T>(value?: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('消息元数据解析失败:', error);
    return null;
  }
};
