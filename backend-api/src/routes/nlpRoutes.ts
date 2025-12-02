import { Router } from 'express';
import {
  parseJobDescription,
  batchParseJobDescriptions,
  getParseExamples,
  getConfigStatus,
  testParse,
  getSupportedKeywords
} from '../controllers/nlpController';

const router = Router();

/**
 * NLP解析路由
 * 处理自然语言解析相关的API请求
 */

// 解析用户描述为面试会话数据
router.post('/parse-job-description', parseJobDescription);

// 批量解析用户描述
router.post('/batch-parse', batchParseJobDescriptions);

// 获取解析示例
router.get('/parse-examples', getParseExamples);

// 验证解析配置状态
router.get('/config-status', getConfigStatus);

// 测试解析功能
router.post('/test-parse', testParse);

// 获取支持的关键词
router.get('/supported-keywords', getSupportedKeywords);

export default router; 