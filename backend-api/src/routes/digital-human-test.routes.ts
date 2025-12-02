/**
 * 数字人测试路由
 * 提供简单的 HTTP 接口测试数字人对话功能
 */

import express from 'express';
import path from 'path';
import { ttsService } from '../services/ttsService';
import { deepseekService } from '../services/deepseekService';

const router = express.Router();

/**
 * 测试页面
 */
router.get('/test/digital-human', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public/test/digital-human.html');
  res.sendFile(htmlPath);
});

/**
 * 文本对话接口（用于测试）
 */
router.post('/api/digital-human/chat', async (req, res) => {
  try {
    const { sessionId, text, userId, jobPosition } = req.body;

    if (!text || !sessionId) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: text 和 sessionId'
      });
    }

    console.log(`📝 收到文本消息: ${text} (Session: ${sessionId})`);

    // 1. 调用 DeepSeek 生成回复
    console.log('🤖 调用 DeepSeek...');
    const reply = await deepseekService.generateResponse({
      userMessage: text,
      sessionId,
      context: {
        userId,
        jobPosition: jobPosition || '软件工程师',
      },
    });

    console.log(`✅ DeepSeek 回复: ${reply}`);

    // 2. 调用 TTS 合成语音
    console.log('🔊 调用 TTS...');
    const ttsResult = await ttsService.textToSpeech({
      text: reply,
      sessionId,
    });

    if (!ttsResult.success) {
      throw new Error('TTS 合成失败');
    }

    console.log(`✅ TTS 完成: ${ttsResult.audioUrl}`);

    // 3. 返回结果
    res.json({
      success: true,
      text: reply,
      audioUrl: ttsResult.audioUrl,
      sessionId,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ 处理消息失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '处理失败',
    });
  }
});

/**
 * 健康检查
 */
router.get('/api/digital-human/health', (req, res) => {
  res.json({
    status: 'OK',
    services: {
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      tts: !!(process.env.ALIYUN_TTS_ACCESS_KEY_ID || process.env.AZURE_TTS_KEY),
      asr: !!(process.env.VOLC_APP_ID || process.env.AGORA_APP_ID),
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;

