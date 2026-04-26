import { RedisOptions } from 'ioredis';
import config from './index';

const redisUrl = config.redis.url.trim();

const parseRedisUrl = (url: string) => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error(`无效的 Redis URL: ${url}`);
  }

  const protocol = parsed.protocol.replace(/:$/, '').toLowerCase();

  if (protocol !== 'redis' && protocol !== 'rediss') {
    throw new Error(`不支持的 Redis 协议: ${protocol}`);
  }

  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

  const host = parsed.hostname || 'localhost';

  const portString = parsed.port;
  const port = portString ? Number(portString) : 6379;

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Redis 端口无效: ${portString || port}. 端口必须在 0 到 65535 之间。`);
  }

  const dbPath = parsed.pathname?.replace(/^\//, '') || '';
  let db: number | undefined;

  if (dbPath) {
    const parsedDb = Number(dbPath);
    if (!Number.isInteger(parsedDb) || parsedDb < 0) {
      throw new Error(`Redis 数据库索引无效: ${dbPath}`);
    }
    db = parsedDb;
  }

  return {
    host,
    port,
    username,
    password,
    db,
    isTls: protocol === 'rediss',
  };
};

const { host, port, username, password, db, isTls } = parseRedisUrl(redisUrl);

const redisOptions: RedisOptions = {
  host,
  port,
  username,
  password,
  tls: isTls ? {} : undefined,
};

if (db !== undefined) {
  redisOptions.db = db;
}

export const redisConnection: RedisOptions = redisOptions;
