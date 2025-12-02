import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger配置选项
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI面试系统 API文档',
      version: '1.0.0',
      description: `
# AI面试系统 API文档

## 🎯 系统功能
- **智能问题生成**: 基于Deepseek大模型，根据职位生成专业面试问题
- **语音合成**: 支持阿里云TTS，将问题转换为自然语音
- **完整面试流程**: 从会话创建到答案收集的全流程管理
- **视频答案**: 支持用户录制视频回答并自动上传OSS

## 🔑 测试账号信息

**测试账号1（求职者）:**
- 邮箱: \`user@aiinterview.com\`
- 密码: \`12345678\`
- 角色: 普通用户

**测试账号2（企业）:**
- 邮箱: \`company@example.com\`
- 密码: \`company123\`
- 角色: 企业用户

## 📋 使用步骤

1. **获取令牌**: 调用登录接口获取JWT令牌
2. **设置认证**: 点击右上角"Authorize"按钮，输入 \`Bearer your-token\`
3. **测试接口**: 直接在文档中测试各个API接口

## 💡 提示
- 所有需要认证的接口都需要在请求头中包含 \`Authorization: Bearer <token>\`
- 创建面试会话后会自动生成问题和语音文件
- 支持断点续传，未完成的面试可以恢复
      `,
      contact: {
        name: 'AI面试系统支持',
        email: 'support@aiinterview.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发环境'
      },
      {
        url: 'https://api.aiinterview.com',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '在此输入JWT令牌，格式: Bearer <your-token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            phone: { type: 'string', example: '13800138000' },
            name: { type: 'string', example: '张三' },
            avatar: { type: 'string', example: 'https://example.com/avatar.jpg' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['phone', 'code'],
          properties: {
            phone: {
              type: 'string',
              example: '13800138000',
              description: '11位手机号'
            },
            code: {
              type: 'string',
              example: '123456',
              description: '短信验证码（6位数字）'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: '登录成功' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                isNewUser: { type: 'boolean', example: false },
                user: { $ref: '#/components/schemas/User' }
              }
            }
          }
        },
        CreateSessionRequest: {
          type: 'object',
          required: ['jobTarget'],
          properties: {
            jobTarget: { 
              type: 'string', 
              example: '高级Java开发工程师',
              description: '目标职位'
            },
            companyTarget: { 
              type: 'string', 
              example: '腾讯',
              description: '目标公司（可选）'
            },
            background: { 
              type: 'string', 
              example: '5年Java开发经验，熟悉Spring框架',
              description: '个人背景（可选）'
            },
            questionCount: { 
              type: 'integer', 
              example: 5,
              minimum: 1,
              maximum: 10,
              description: '问题数量（1-10，默认5）'
            }
          }
        },
        CreateSessionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: '面试会话创建成功' },
            data: {
              type: 'object',
              properties: {
                sessionId: { type: 'string', example: 'uuid' },
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      questionIndex: { type: 'integer', example: 0 },
                      questionText: { type: 'string', example: '请简单介绍一下您自己' },
                      audioUrl: { type: 'string', example: '/uploads/audio/tts_uuid.mp3' },
                      duration: { type: 'integer', example: 8 }
                    }
                  }
                },
                totalQuestions: { type: 'integer', example: 5 }
              }
            }
          }
        },
        SubmitAnswerRequest: {
          type: 'object',
          required: ['sessionId', 'questionIndex'],
          properties: {
            sessionId: { 
              type: 'string', 
              example: 'uuid',
              description: '会话ID'
            },
            questionIndex: { 
              type: 'integer', 
              example: 0,
              description: '问题索引'
            },
            answerText: { 
              type: 'string', 
              example: '我是一名有5年经验的Java开发工程师...',
              description: '回答文本（可选）'
            },
            answerVideoUrl: { 
              type: 'string', 
              example: 'https://oss.example.com/video.mp4',
              description: '回答视频URL（可选）'
            },
            answerDuration: { 
              type: 'integer', 
              example: 120,
              description: '回答时长（秒）'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

/**
 * 设置Swagger API文档
 */
export const setupSwagger = (app: Express) => {
  const specs = swaggerJsdoc(swaggerOptions);
  
  // 自定义Swagger UI配置
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none', // 默认折叠
      filter: true, // 启用搜索
      showRequestDuration: true, // 显示请求时间
      tryItOutEnabled: true, // 启用试用功能
      requestInterceptor: (request: any) => {
        // 确保不覆盖已设置的 Content-Type（忽略大小写）
        const hasContentType = Object.keys(request.headers || {}).some(
          key => key.toLowerCase() === 'content-type'
        );

        // 仅在完全缺失时，且请求方法期望 JSON 时，才添加默认 Content-Type
        if ((request.method === 'POST' || request.method === 'PUT') && !hasContentType) {
          request.headers['Content-Type'] = 'application/json';
        }

        return request;
      }
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #3b82f6; }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .swagger-ui .auth-wrapper { margin-top: 20px; }
      .swagger-ui .btn.authorize { background-color: #10b981; border-color: #10b981; }
      .swagger-ui .btn.authorize:hover { background-color: #059669; }
    `,
    customSiteTitle: 'AI面试系统 API文档'
  };

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // 提供API规格的JSON端点
  app.get('/api/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}; 
