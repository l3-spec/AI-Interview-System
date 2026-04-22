import { Request, Response } from 'express';
import { getClientRuntimeConfig } from '../services/clientRuntimeConfig.service';

/**
 * GET /api/public/client-runtime-config
 * Android 启动时拉取：API 与 ASR/TTS 等微服务地址、Qwen/音色/指令及第三方密钥（可通过 HIDE_CLIENT_RUNTIME_SECRETS 关闭明文下发）。
 */
export const getClientRuntimeConfigHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await getClientRuntimeConfig(req);
    res.json({ success: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'getClientRuntimeConfig failed';
    res.status(500).json({ success: false, message, data: null });
  }
};
