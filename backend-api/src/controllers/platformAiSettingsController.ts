import { Request, Response } from 'express';
import {
  getPlatformAiSettingsForAdmin,
  updatePlatformAiSettingsInDb,
  getMergedPlatformAiConfig,
  publishPlatformAiPatch,
  PlatformAiSettingsPayload,
} from '../services/platformAiSettings.service';
import { dashScopeService } from '../services/dashscope.service';
import { deepseekService } from '../services/deepseekService';

/**
 * GET /admin/platform-ai-settings — 当前生效配置（密钥脱敏）
 */
export async function getPlatformAiSettings(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getPlatformAiSettingsForAdmin();
    res.json({
      success: true,
      data,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || '读取平台 AI 配置失败' });
  }
}

/**
 * PUT /admin/platform-ai-settings — 更新 DB 并刷新本进程 + Redis 通知微服务
 */
export async function putPlatformAiSettings(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as PlatformAiSettingsPayload;
    await updatePlatformAiSettingsInDb(body);

    const cfg = await getMergedPlatformAiConfig();
    dashScopeService.refreshFromPlatformConfig(cfg);
    deepseekService.refreshFromPlatformConfig(cfg);
    await publishPlatformAiPatch(cfg);

    const data = await getPlatformAiSettingsForAdmin();
    res.json({
      success: true,
      message: '已保存。ASR/TTS 微服务在配置 Redis 时会自动同步环境变量（新会话生效）。',
      data,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || '保存平台 AI 配置失败' });
  }
}
