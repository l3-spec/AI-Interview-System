import { Request, Response } from 'express';
import { nlpParsingService } from '../services/nlpParsingService';

/**
 * NLP解析控制器
 * 处理自然语言解析相关的API请求
 */

/**
 * 解析用户描述为面试会话数据
 * POST /api/nlp/parse-job-description
 */
export const parseJobDescription = async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;

    // 参数验证
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的用户描述'
      });
    }

    if (userInput.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: '用户描述至少需要5个字符'
      });
    }

    if (userInput.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '用户描述不能超过1000字符'
      });
    }

    console.log(`收到解析请求: "${userInput}"`);

    // 调用解析服务
    const parseResult = await nlpParsingService.parseJobDescription(userInput.trim());

    // 验证解析结果
    if (!nlpParsingService.validateParseResult(parseResult)) {
      return res.status(500).json({
        success: false,
        error: '解析结果验证失败，请重试'
      });
    }

    // 返回解析结果
    res.json({
      success: true,
      data: parseResult,
      message: `解析成功 (置信度: ${Math.round(parseResult.confidence * 100)}%)`
    });

  } catch (error) {
    console.error('解析用户描述失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '解析失败，请稍后重试'
    });
  }
};

/**
 * 批量解析用户描述
 * POST /api/nlp/batch-parse
 */
export const batchParseJobDescriptions = async (req: Request, res: Response) => {
  try {
    const { userInputs } = req.body;

    // 参数验证
    if (!Array.isArray(userInputs)) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的用户描述数组'
      });
    }

    if (userInputs.length === 0) {
      return res.status(400).json({
        success: false,
        error: '用户描述数组不能为空'
      });
    }

    if (userInputs.length > 10) {
      return res.status(400).json({
        success: false,
        error: '批量解析最多支持10个描述'
      });
    }

    // 验证每个输入
    for (let i = 0; i < userInputs.length; i++) {
      const input = userInputs[i];
      if (!input || typeof input !== 'string' || input.trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: `第${i + 1}个描述无效，至少需要5个字符`
        });
      }
    }

    console.log(`收到批量解析请求: ${userInputs.length}个描述`);

    // 调用批量解析服务
    const parseResults = await nlpParsingService.batchParse(userInputs.map(input => input.trim()));

    // 验证所有解析结果
    const validResults = parseResults.filter(result => nlpParsingService.validateParseResult(result));

    res.json({
      success: true,
      data: parseResults,
      summary: {
        total: parseResults.length,
        valid: validResults.length,
        averageConfidence: Math.round(
          (parseResults.reduce((sum, result) => sum + result.confidence, 0) / parseResults.length) * 100
        )
      },
      message: `批量解析完成，${validResults.length}/${parseResults.length}个结果有效`
    });

  } catch (error) {
    console.error('批量解析失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量解析失败，请稍后重试'
    });
  }
};

/**
 * 获取解析示例
 * GET /api/nlp/parse-examples
 */
export const getParseExamples = async (req: Request, res: Response) => {
  try {
    const examples = nlpParsingService.getParsingExamples();

    res.json({
      success: true,
      data: examples,
      message: '获取解析示例成功'
    });

  } catch (error) {
    console.error('获取解析示例失败:', error);
    res.status(500).json({
      success: false,
      error: '获取解析示例失败'
    });
  }
};

/**
 * 验证解析配置
 * GET /api/nlp/config-status
 */
export const getConfigStatus = async (req: Request, res: Response) => {
  try {
    // 检查AI服务配置状态
    const aiProvider = process.env.AI_PROVIDER || 'deepseek';
    let isConfigured = false;
    let configDetails: any = {};

    switch (aiProvider) {
      case 'deepseek':
        isConfigured = !!(process.env.DEEPSEEK_API_KEY);
        configDetails = {
          provider: 'DeepSeek',
          apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
          model: 'deepseek-chat'
        };
        break;
      case 'openai':
        isConfigured = !!(process.env.OPENAI_API_KEY);
        configDetails = {
          provider: 'OpenAI',
          apiUrl: 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-3.5-turbo'
        };
        break;
      case 'azure':
        isConfigured = !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
        configDetails = {
          provider: 'Azure OpenAI',
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo'
        };
        break;
    }

    res.json({
      success: true,
      data: {
        aiProvider,
        isConfigured,
        configDetails,
        fallbackMode: !isConfigured ? '规则引擎' : null,
        supportedProviders: ['deepseek', 'openai', 'azure']
      },
      message: isConfigured ? 
        `${configDetails.provider} AI解析服务已配置` : 
        '未配置AI服务，将使用规则引擎解析'
    });

  } catch (error) {
    console.error('获取配置状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置状态失败'
    });
  }
};

/**
 * 测试解析功能
 * POST /api/nlp/test-parse
 */
export const testParse = async (req: Request, res: Response) => {
  try {
    const testInputs = [
      "我想面试阿里巴巴的Java开发工程师，我有3年Java经验，熟悉Spring框架",
      "刚毕业，想找个前端的工作，会React和Vue",
      "有5年Python经验，想去字节跳动做后端开发",
      "想做AI工程师，我学过机器学习和深度学习"
    ];

    console.log('开始解析功能测试...');

    const results = [];
    for (const input of testInputs) {
      try {
        const result = await nlpParsingService.parseJobDescription(input);
        results.push({
          input,
          result,
          success: true
        });
      } catch (error) {
        results.push({
          input,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const averageConfidence = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.result?.confidence || 0), 0) / successCount;

    res.json({
      success: true,
      data: results,
      summary: {
        total: testInputs.length,
        successful: successCount,
        failed: testInputs.length - successCount,
        averageConfidence: Math.round(averageConfidence * 100)
      },
      message: `测试完成: ${successCount}/${testInputs.length} 成功`
    });

  } catch (error) {
    console.error('测试解析功能失败:', error);
    res.status(500).json({
      success: false,
      error: '测试解析功能失败'
    });
  }
};

/**
 * 获取支持的职位和公司列表
 * GET /api/nlp/supported-keywords
 */
export const getSupportedKeywords = async (req: Request, res: Response) => {
  try {
    const keywords = {
      positions: [
        'Java开发工程师', 'Python开发工程师', 'JavaScript开发工程师',
        'React前端工程师', 'Vue前端工程师', 'Angular前端工程师',
        '前端开发工程师', '后端开发工程师', '全栈开发工程师',
        'AI工程师', '机器学习工程师', '算法工程师',
        '产品经理', '测试工程师', '运维工程师', 'DevOps工程师',
        '数据分析师', '系统架构师'
      ],
      companies: [
        '阿里巴巴', '腾讯', '百度', '字节跳动', '美团', '滴滴',
        '京东', '华为', '小米', '科技公司', '互联网公司', '创业公司'
      ],
      skills: [
        'Java', 'Python', 'JavaScript', 'React', 'Vue', 'Angular',
        'Spring', 'Spring Boot', 'Node.js', 'MySQL', 'Redis',
        '微服务', '分布式系统', '机器学习', '深度学习', 'TensorFlow',
        'PyTorch', 'Docker', 'Kubernetes', 'Git', 'Linux'
      ],
      experience: [
        '应届生', '1年', '2年', '3年', '5年', '8年', '10年以上'
      ]
    };

    res.json({
      success: true,
      data: keywords,
      message: '获取支持的关键词成功'
    });

  } catch (error) {
    console.error('获取支持的关键词失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支持的关键词失败'
    });
  }
}; 