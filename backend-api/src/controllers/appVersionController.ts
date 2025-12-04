import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const parsePlatform = (platform?: string) => {
  const value = (platform || '').toUpperCase();
  return value === 'IOS' ? 'IOS' : 'ANDROID';
};

const parseNumber = (value: any, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

let appVersionTableReady = false;

const ensureAppVersionTable = async () => {
  if (appVersionTableReady) return;
  try {
    await prisma.appVersion.count();
    appVersionTableReady = true;
  } catch (error: any) {
    const message = (error?.message || '').toLowerCase();
    const tableMissing = message.includes('app_versions') || error?.code === 'P2021';
    if (!tableMissing) throw error;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_versions (
        id VARCHAR(191) NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'ANDROID',
        version_name VARCHAR(50) NOT NULL,
        version_code INTEGER NOT NULL,
        download_url VARCHAR(500) NOT NULL,
        release_notes TEXT NULL,
        is_mandatory BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        INDEX idx_app_versions_platform_active (platform, is_active),
        INDEX idx_app_versions_version_code (version_code)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    appVersionTableReady = true;
  }
};

export const getLatestAppVersion = async (req: Request, res: Response) => {
  try {
    await ensureAppVersionTable();
    const platform = parsePlatform(req.query.platform as string);
    const currentVersionCode = parseNumber(req.query.currentVersionCode, 0);

    const latest = await prisma.appVersion.findFirst({
      where: { platform, isActive: true },
      orderBy: [
        { versionCode: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (!latest) {
      return res.json({
        success: true,
        data: null,
        message: '暂无版本配置'
      });
    }

    const shouldUpdate = currentVersionCode > 0
      ? currentVersionCode < latest.versionCode
      : true;

    res.json({
      success: true,
      data: {
        id: latest.id,
        platform: latest.platform,
        versionName: latest.versionName,
        versionCode: latest.versionCode,
        downloadUrl: latest.downloadUrl,
        releaseNotes: latest.releaseNotes,
        isMandatory: latest.isMandatory,
        isActive: latest.isActive,
        shouldUpdate,
        forceUpdate: shouldUpdate && latest.isMandatory,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt
      }
    });
  } catch (error: any) {
    console.error('获取应用版本失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应用版本失败',
      error: error?.message || '服务器错误'
    });
  }
};

export const listAppVersions = async (req: Request, res: Response) => {
  try {
    await ensureAppVersionTable();
    const platform = req.query.platform ? parsePlatform(req.query.platform as string) : undefined;
    const page = Math.max(parseNumber(req.query.page, 1), 1);
    const pageSize = Math.max(Math.min(parseNumber(req.query.pageSize, 20), 100), 1);

    const where: any = {};
    if (platform) {
      where.platform = platform;
    }

    const [list, total] = await Promise.all([
      prisma.appVersion.findMany({
        where,
        orderBy: [
          { isActive: 'desc' },
          { versionCode: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.appVersion.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize
      }
    });
  } catch (error: any) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取版本列表失败',
      error: error?.message || '服务器错误'
    });
  }
};

export const createAppVersion = async (req: Request, res: Response) => {
  try {
    await ensureAppVersionTable();
    const platform = parsePlatform(req.body.platform);
    const versionName = req.body.versionName as string;
    const versionCode = parseNumber(req.body.versionCode);
    const downloadUrl = req.body.downloadUrl as string;
    const releaseNotes = req.body.releaseNotes as string | undefined;
    const isMandatory = Boolean(req.body.isMandatory);
    const isActive = req.body.isActive === undefined ? true : Boolean(req.body.isActive);

    const version = await prisma.appVersion.create({
      data: {
        platform,
        versionName,
        versionCode,
        downloadUrl,
        releaseNotes: releaseNotes ?? null,
        isMandatory,
        isActive
      }
    });

    if (isActive) {
      await prisma.appVersion.updateMany({
        where: {
          platform,
          NOT: { id: version.id }
        },
        data: { isActive: false }
      });
    }

    res.status(201).json({
      success: true,
      data: version,
      message: '版本创建成功'
    });
  } catch (error: any) {
    console.error('创建应用版本失败:', error);
    res.status(500).json({
      success: false,
      message: '创建应用版本失败',
      error: error?.message || '服务器错误'
    });
  }
};

export const updateAppVersion = async (req: Request, res: Response) => {
  try {
    await ensureAppVersionTable();
    const { id } = req.params;
    const data: any = {};

    if (req.body.platform !== undefined) data.platform = parsePlatform(req.body.platform);
    if (req.body.versionName !== undefined) data.versionName = req.body.versionName;
    if (req.body.versionCode !== undefined) data.versionCode = parseNumber(req.body.versionCode);
    if (req.body.downloadUrl !== undefined) data.downloadUrl = req.body.downloadUrl;
    if (req.body.releaseNotes !== undefined) data.releaseNotes = req.body.releaseNotes ?? null;
    if (req.body.isMandatory !== undefined) data.isMandatory = Boolean(req.body.isMandatory);
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

    const updated = await prisma.appVersion.update({
      where: { id },
      data
    });

    if (data.isActive) {
      await prisma.appVersion.updateMany({
        where: {
          platform: updated.platform,
          NOT: { id }
        },
        data: { isActive: false }
      });
    }

    res.json({
      success: true,
      data: updated,
      message: '版本更新成功'
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }
    console.error('更新应用版本失败:', error);
    res.status(500).json({
      success: false,
      message: '更新应用版本失败',
      error: error?.message || '服务器错误'
    });
  }
};

export const activateAppVersion = async (req: Request, res: Response) => {
  try {
    await ensureAppVersionTable();
    const { id } = req.params;

    const version = await prisma.appVersion.update({
      where: { id },
      data: { isActive: true }
    });

    await prisma.appVersion.updateMany({
      where: {
        platform: version.platform,
        NOT: { id }
      },
      data: { isActive: false }
    });

    res.json({
      success: true,
      data: version,
      message: '已设为当前生效版本'
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }
    console.error('激活应用版本失败:', error);
    res.status(500).json({
      success: false,
      message: '激活应用版本失败',
      error: error?.message || '服务器错误'
    });
  }
};
