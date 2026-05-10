import { deepseekService } from './src/services/deepseek.service';

async function testV4() {
    console.log('--- 测试 DeepSeek V4 Flash ---');
    try {
        const response = await deepseekService.generateInterviewerResponse({
            userMessage: "你好，请问你是谁？",
            sessionId: "test-v4-flash",
            context: {}
        });
        console.log('Flash 响应:', response.text);
    } catch (e) {
        console.error('Flash 测试失败:', e);
    }

    console.log('\n--- 测试 DeepSeek V4 Pro Thinking Mode ---');
    try {
        // analyzeResponse 内部已经配置为使用 thinking mode
        const analysis = await deepseekService.analyzeResponse(
            "测试岗位",
            "请谈谈你对 AI 的看法",
            "AI 是未来的核心驱动力，通过自动化和智能化提升效率。"
        );
        console.log('Thinking Mode 分析结果:', analysis);
    } catch (e) {
        console.error('Thinking Mode 测试失败:', e);
    }
}

testV4();
