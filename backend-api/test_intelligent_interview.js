#!/usr/bin/env node

/**
 * 智能面试系统完整功能测试
 * 测试内容：
 * 1. TTS音频生成功能
 * 2. NLP自然语言解析功能
 * 3. 智能面试会话创建功能
 * 4. 端到端面试流程测试
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'test@example.com',
  password: '12345678'
};

// 测试用例
const TEST_CASES = [
  {
    name: '标准Java开发工程师面试',
    input: '我想面试阿里巴巴的Java开发工程师，我有3年Java经验，熟悉Spring框架',
    expectedJob: 'Java开发工程师',
    expectedCompany: '阿里巴巴'
  },
  {
    name: '前端开发工程师面试',
    input: '应聘腾讯前端开发，会React和Vue，有2年工作经验',
    expectedJob: '前端开发工程师',
    expectedCompany: '腾讯'
  },
  {
    name: '简短描述测试',
    input: 'Python后端开发，5年经验',
    expectedJob: 'Python开发工程师',
    expectedCompany: '科技公司'
  },
  {
    name: 'AI工程师面试',
    input: '想做AI工程师，我学过机器学习和深度学习，希望能进入字节跳动',
    expectedJob: 'AI工程师',
    expectedCompany: '字节跳动'
  }
];

class IntelligentInterviewTester {
  constructor() {
    this.authToken = null;
    this.results = {
      tts: { success: 0, failed: 0, details: [] },
      nlp: { success: 0, failed: 0, details: [] },
      interview: { success: 0, failed: 0, details: [] },
      endToEnd: { success: 0, failed: 0, details: [] }
    };
  }

  /**
   * 执行完整测试流程
   */
  async runTests() {
    console.log('🚀 开始智能面试系统功能测试...\n');
    
    try {
      // 1. 获取认证token
      await this.authenticate();
      
      // 2. 测试TTS功能
      console.log('📢 测试TTS音频生成功能...');
      await this.testTTS();
      
      // 3. 测试NLP解析功能
      console.log('\n🧠 测试NLP解析功能...');
      await this.testNLP();
      
      // 4. 测试智能面试会话创建
      console.log('\n🎯 测试智能面试会话创建...');
      await this.testIntelligentInterview();
      
      // 5. 端到端测试
      console.log('\n🔄 执行端到端测试...');
      await this.testEndToEnd();
      
      // 6. 输出测试报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 用户认证
   */
  async authenticate() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
      this.authToken = response.data.token;
      console.log('✅ 用户认证成功');
    } catch (error) {
      throw new Error(`认证失败: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 获取认证头
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 测试TTS功能
   */
  async testTTS() {
    const testTexts = [
      '请简单介绍一下您自己。',
      '谈谈您在Java开发中最有挑战性的一个项目。',
      '您为什么想要应聘我们公司？',
      '您对未来的职业规划是什么？'
    ];

    for (const text of testTexts) {
      try {
        console.log(`  测试文本: "${text.substring(0, 20)}..."`);
        
        const response = await axios.post(
          `${API_BASE_URL}/ai-interview/test-tts`,
          { text },
          { headers: this.getAuthHeaders() }
        );

        if (response.data.success) {
          const audioUrl = response.data.audioUrl;
          const duration = response.data.duration;
          const fileSize = response.data.fileSize;
          
          console.log(`    ✅ 生成成功: ${audioUrl}, 时长: ${duration}s, 大小: ${Math.round(fileSize/1024)}KB`);
          
          this.results.tts.success++;
          this.results.tts.details.push({
            text: text.substring(0, 30),
            success: true,
            audioUrl,
            duration,
            fileSize
          });
        } else {
          throw new Error(response.data.error || '未知错误');
        }
        
      } catch (error) {
        console.log(`    ❌ 生成失败: ${error.response?.data?.message || error.message}`);
        this.results.tts.failed++;
        this.results.tts.details.push({
          text: text.substring(0, 30),
          success: false,
          error: error.response?.data?.message || error.message
        });
      }
    }
  }

  /**
   * 测试NLP解析功能
   */
  async testNLP() {
    // 1. 测试配置状态
    try {
      const configResponse = await axios.get(
        `${API_BASE_URL}/nlp/config-status`,
        { headers: this.getAuthHeaders() }
      );
      
      console.log(`  配置状态: ${configResponse.data.message}`);
      
      if (configResponse.data.data.isConfigured) {
        console.log(`    提供商: ${configResponse.data.data.configDetails.provider}`);
      } else {
        console.log(`    兜底模式: ${configResponse.data.data.fallbackMode}`);
      }
    } catch (error) {
      console.log(`  ⚠️  配置检查失败: ${error.message}`);
    }

    // 2. 测试解析功能
    for (const testCase of TEST_CASES) {
      try {
        console.log(`  测试用例: ${testCase.name}`);
        console.log(`    输入: "${testCase.input}"`);
        
        const response = await axios.post(
          `${API_BASE_URL}/nlp/parse-job-description`,
          { userInput: testCase.input },
          { headers: this.getAuthHeaders() }
        );

        if (response.data.success) {
          const result = response.data.data;
          const confidence = Math.round(result.confidence * 100);
          
          console.log(`    ✅ 解析成功 (置信度: ${confidence}%)`);
          console.log(`      职位: ${result.jobTarget}`);
          console.log(`      公司: ${result.companyTarget}`);
          console.log(`      背景: ${result.background}`);
          console.log(`      问题数: ${result.questionCount}`);
          
          // 验证解析准确性
          const jobMatch = result.jobTarget.includes(testCase.expectedJob.split('开发工程师')[0]);
          const companyMatch = result.companyTarget === testCase.expectedCompany;
          
          this.results.nlp.success++;
          this.results.nlp.details.push({
            testCase: testCase.name,
            success: true,
            result,
            jobMatch,
            companyMatch,
            confidence
          });
        } else {
          throw new Error(response.data.error || '解析失败');
        }
        
      } catch (error) {
        console.log(`    ❌ 解析失败: ${error.response?.data?.message || error.message}`);
        this.results.nlp.failed++;
        this.results.nlp.details.push({
          testCase: testCase.name,
          success: false,
          error: error.response?.data?.message || error.message
        });
      }
    }
  }

  /**
   * 测试智能面试会话创建
   */
  async testIntelligentInterview() {
    for (const testCase of TEST_CASES.slice(0, 2)) { // 只测试前两个用例，避免过多API调用
      try {
        console.log(`  创建会话: ${testCase.name}`);
        console.log(`    输入: "${testCase.input}"`);
        
        const response = await axios.post(
          `${API_BASE_URL}/ai-interview/smart-create-session`,
          { 
            userInput: testCase.input,
            questionCount: 3 // 测试用较少问题数
          },
          { headers: this.getAuthHeaders() }
        );

        if (response.data.success) {
          const sessionId = response.data.data.sessionId;
          const parseResult = response.data.data.parseResult;
          const questions = response.data.data.questions;
          
          console.log(`    ✅ 会话创建成功`);
          console.log(`      会话ID: ${sessionId}`);
          console.log(`      解析置信度: ${Math.round(parseResult.confidence * 100)}%`);
          console.log(`      生成问题数: ${questions.length}`);
          
          // 验证问题是否包含音频
          const hasAudio = questions.every(q => q.audioUrl && q.duration > 0);
          console.log(`      音频生成: ${hasAudio ? '✅' : '❌'}`);
          
          this.results.interview.success++;
          this.results.interview.details.push({
            testCase: testCase.name,
            success: true,
            sessionId,
            parseResult,
            questionCount: questions.length,
            hasAudio
          });
        } else {
          throw new Error(response.data.error || '会话创建失败');
        }
        
      } catch (error) {
        console.log(`    ❌ 会话创建失败: ${error.response?.data?.message || error.message}`);
        this.results.interview.failed++;
        this.results.interview.details.push({
          testCase: testCase.name,
          success: false,
          error: error.response?.data?.message || error.message
        });
      }
    }
  }

  /**
   * 端到端测试
   */
  async testEndToEnd() {
    const testInput = "我想面试一个Java开发的岗位，我有2年经验";
    
    try {
      console.log(`  端到端测试: "${testInput}"`);
      
      // 1. 解析预览
      console.log('    步骤1: 解析预览');
      const previewResponse = await axios.post(
        `${API_BASE_URL}/ai-interview/preview-parse`,
        { userInput: testInput },
        { headers: this.getAuthHeaders() }
      );
      
      if (!previewResponse.data.success) {
        throw new Error('解析预览失败');
      }
      
      const parseResult = previewResponse.data.data;
      console.log(`      解析结果: ${parseResult.jobTarget} @ ${parseResult.companyTarget}`);
      
      // 2. 创建会话
      console.log('    步骤2: 创建面试会话');
      const sessionResponse = await axios.post(
        `${API_BASE_URL}/ai-interview/smart-create-session`,
        { 
          userInput: testInput,
          questionCount: 2
        },
        { headers: this.getAuthHeaders() }
      );
      
      if (!sessionResponse.data.success) {
        throw new Error('会话创建失败');
      }
      
      const sessionId = sessionResponse.data.data.sessionId;
      console.log(`      会话ID: ${sessionId}`);
      
      // 3. 获取第一个问题
      console.log('    步骤3: 获取面试问题');
      const questionResponse = await axios.get(
        `${API_BASE_URL}/ai-interview/next-question/${sessionId}`,
        { headers: this.getAuthHeaders() }
      );
      
      if (!questionResponse.data.success) {
        throw new Error('获取问题失败');
      }
      
      const question = questionResponse.data.question;
      console.log(`      问题: ${question.questionText.substring(0, 50)}...`);
      console.log(`      音频: ${question.audioUrl}`);
      
      // 4. 提交答案
      console.log('    步骤4: 提交答案');
      const answerResponse = await axios.post(
        `${API_BASE_URL}/ai-interview/submit-answer`,
        {
          sessionId,
          questionIndex: question.questionIndex,
          answerText: "我是一名Java开发工程师，有2年的开发经验...",
          answerDuration: 30
        },
        { headers: this.getAuthHeaders() }
      );
      
      if (!answerResponse.data.success) {
        throw new Error('提交答案失败');
      }
      
      console.log('    ✅ 端到端测试成功完成');
      
      this.results.endToEnd.success++;
      this.results.endToEnd.details.push({
        testInput,
        success: true,
        sessionId,
        steps: ['解析预览', '创建会话', '获取问题', '提交答案']
      });
      
    } catch (error) {
      console.log(`    ❌ 端到端测试失败: ${error.response?.data?.message || error.message}`);
      this.results.endToEnd.failed++;
      this.results.endToEnd.details.push({
        testInput,
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 智能面试系统测试报告');
    console.log('='.repeat(60));
    
    const total = {
      success: this.results.tts.success + this.results.nlp.success + 
                this.results.interview.success + this.results.endToEnd.success,
      failed: this.results.tts.failed + this.results.nlp.failed + 
              this.results.interview.failed + this.results.endToEnd.failed
    };
    
    console.log(`\n📈 总体统计:`);
    console.log(`  总测试数: ${total.success + total.failed}`);
    console.log(`  成功: ${total.success} ✅`);
    console.log(`  失败: ${total.failed} ❌`);
    console.log(`  成功率: ${Math.round(total.success / (total.success + total.failed) * 100)}%`);
    
    console.log(`\n📢 TTS音频生成测试:`);
    console.log(`  成功: ${this.results.tts.success}/${this.results.tts.success + this.results.tts.failed}`);
    
    console.log(`\n🧠 NLP解析测试:`);
    console.log(`  成功: ${this.results.nlp.success}/${this.results.nlp.success + this.results.nlp.failed}`);
    
    console.log(`\n🎯 智能面试会话测试:`);
    console.log(`  成功: ${this.results.interview.success}/${this.results.interview.success + this.results.interview.failed}`);
    
    console.log(`\n🔄 端到端测试:`);
    console.log(`  成功: ${this.results.endToEnd.success}/${this.results.endToEnd.success + this.results.endToEnd.failed}`);
    
    // 详细结果
    if (this.results.nlp.details.length > 0) {
      console.log(`\n🔍 NLP解析详细结果:`);
      this.results.nlp.details.forEach((detail, index) => {
        if (detail.success) {
          console.log(`  ${index + 1}. ${detail.testCase}`);
          console.log(`     职位匹配: ${detail.jobMatch ? '✅' : '❌'}`);
          console.log(`     公司匹配: ${detail.companyMatch ? '✅' : '❌'}`);
          console.log(`     置信度: ${detail.confidence}%`);
        }
      });
    }
    
    console.log('\n✨ 测试完成！');
    
    // 生成JSON报告
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: total.success + total.failed,
        success: total.success,
        failed: total.failed,
        successRate: Math.round(total.success / (total.success + total.failed) * 100)
      },
      details: this.results
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test-report.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('📄 详细报告已保存到 test-report.json');
  }
}

// 执行测试
const tester = new IntelligentInterviewTester();
tester.runTests().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
}); 