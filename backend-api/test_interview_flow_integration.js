#!/usr/bin/env node

/**
 * 面试流程集成测试
 * 测试完整的两阶段面试流程
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE = 'http://localhost:3001/api';

class InterviewFlowTester {
    constructor() {
        this.sessionId = null;
        this.currentRound = 0;
        this.totalRounds = 0;
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch (type) {
            case 'success':
                console.log(`[${timestamp}] ✅ ${message}`.green);
                break;
            case 'error':
                console.log(`[${timestamp}] ❌ ${message}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] ℹ️  ${message}`.blue);
        }
    }

    async testPhase1Introduction() {
        await this.log('🚀 开始测试第一阶段：数字人介绍和信息收集');
        
        try {
            // 1. 启动面试流程
            await this.log('1. 启动面试流程...');
            const startResponse = await axios.post(`${API_BASE}/interview/start`, {
                userId: 'test_user_001',
                userName: '测试用户',
                isFirstTime: true
            });
            
            this.sessionId = startResponse.data.data.sessionId;
            await this.log(`✅ 面试启动成功，会话ID: ${this.sessionId}`, 'success');

            // 2. 收集用户信息
            await this.log('2. 收集用户信息...');
            const infoResponse = await axios.post(`${API_BASE}/interview/${this.sessionId}/info`, {
                targetJob: '前端开发工程师',
                background: '计算机科学专业，2年Vue开发经验',
                experience: '参与过电商项目，熟悉React和Vue',
                skills: ['JavaScript', 'Vue', 'React', 'Node.js']
            });

            await this.log('✅ 用户信息收集成功', 'success');
            await this.log(`📋 用户信息: ${JSON.stringify(infoResponse.data.data.userInfo, null, 2)}`, 'info');

            return true;
        } catch (error) {
            await this.log(`第一阶段测试失败: ${error.response?.data?.error?.message || error.message}`, 'error');
            return false;
        }
    }

    async testPhase2AIInterview() {
        await this.log('🤖 开始测试第二阶段：AI面试内容生成');
        
        try {
            // 1. 启动AI面试阶段
            await this.log('1. 启动AI面试阶段...');
            const phaseResponse = await axios.post(`${API_BASE}/interview/${this.sessionId}/phase`);
            
            this.totalRounds = phaseResponse.data.data.totalRounds;
            await this.log(`✅ AI面试阶段启动成功，总轮次: ${this.totalRounds}`, 'success');

            // 2. 模拟多轮面试
            await this.log('2. 开始模拟多轮面试...');
            
            for (let round = 1; round <= this.totalRounds; round++) {
                await this.log(`🎯 开始第 ${round} 轮面试...`);
                
                // 获取当前轮次问题
                const nextResponse = await axios.post(`${API_BASE}/interview/${this.sessionId}/next`);
                
                if (nextResponse.data.data.isCompleted) {
                    await this.log('✅ 面试已完成', 'success');
                    break;
                }

                const currentRound = nextResponse.data.data;
                await this.log(`📄 第 ${currentRound.currentRound} 轮问题: ${currentRound.question}`, 'info');
                await this.log(`🎵 音频URL: ${currentRound.audioUrl}`, 'info');

                // 模拟用户回答
                const mockResponses = [
                    '我对前端开发充满热情，具备扎实的JavaScript基础，熟悉Vue和React框架。',
                    '在上一个项目中，我负责开发了用户管理系统，使用Vue3和TypeScript实现，提高了开发效率30%。',
                    '我认为前端开发的核心是用户体验，技术只是实现目标的工具。',
                    '我的职业规划是成为全栈工程师，目前正在学习后端Node.js和数据库技术。',
                    '对于团队协作，我倾向于使用Git进行版本控制，积极参与代码审查。'
                ];

                const response = mockResponses[round - 1] || '这是一个很好的问题，让我思考一下...';
                
                await this.log(`💬 用户回答: ${response}`, 'info');

                // 提交回答
                const answerResponse = await axios.post(`${API_BASE}/interview/${this.sessionId}/response`, {
                    response: response,
                    audioUrl: `mock_audio_${round}.wav`,
                    duration: 120 + Math.floor(Math.random() * 60)
                });

                await this.log(`✅ 第 ${round} 轮回答已提交，反馈: ${answerResponse.data.data.feedback}`, 'success');
                
                // 稍作等待
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return true;
        } catch (error) {
            await this.log(`第二阶段测试失败: ${error.response?.data?.error?.message || error.message}`, 'error');
            return false;
        }
    }

    async testSessionStatus() {
        await this.log('📊 测试会话状态查询...');
        
        try {
            const statusResponse = await axios.get(`${API_BASE}/interview/${this.sessionId}/status`);
            await this.log(`✅ 会话状态查询成功`, 'success');
            await this.log(`📋 会话详情: ${JSON.stringify(statusResponse.data.data, null, 2)}`, 'info');
            return true;
        } catch (error) {
            await this.log(`状态查询失败: ${error.message}`, 'error');
            return false;
        }
    }

    async testInterviewSummary() {
        await this.log('📈 测试面试总结生成...');
        
        try {
            const summaryResponse = await axios.post(`${API_BASE}/interview/${this.sessionId}/end`);
            await this.log('✅ 面试总结生成成功', 'success');
            await this.log(`📊 面试总结: ${JSON.stringify(summaryResponse.data.data, null, 2)}`, 'info');
            return true;
        } catch (error) {
            await this.log(`总结生成失败: ${error.message}`, 'error');
            return false;
        }
    }

    async runQuickTest() {
        await this.log('⚡ 运行快速测试...');
        
        const results = [];
        
        results.push(await this.testPhase1Introduction());
        results.push(await this.testSessionStatus());
        
        const passed = results.filter(r => r).length;
        const total = results.length;
        
        await this.log(`🎯 快速测试完成: ${passed}/${total} 通过`, 
            passed === total ? 'success' : 'warning');
        
        return passed === total;
    }

    async runFullTest() {
        await this.log('🔄 运行完整测试...');
        
        const tests = [
            { name: '第一阶段测试', test: () => this.testPhase1Introduction() },
            { name: '第二阶段测试', test: () => this.testPhase2AIInterview() },
            { name: '状态查询测试', test: () => this.testSessionStatus() },
            { name: '总结生成测试', test: () => this.testInterviewSummary() }
        ];

        const results = [];
        
        for (const { name, test } of tests) {
            await this.log(`🧪 开始测试: ${name}`);
            const result = await test();
            results.push({ name, result });
            await this.log(`${result ? '✅' : '❌'} ${name}: ${result ? '通过' : '失败'}`, 
                result ? 'success' : 'error');
            
            if (!result) {
                await this.log(`⚠️  ${name} 测试失败，跳过后续测试...`, 'warning');
                break;
            }
        }

        const passed = results.filter(r => r.result).length;
        const total = results.length;
        
        await this.log(`🎯 完整测试完成: ${passed}/${total} 通过`, 
            passed === total ? 'success' : 'warning');
        
        return results;
    }

    async runLoadTest() {
        await this.log('📊 运行负载测试...');
        
        const concurrentUsers = 3;
        const promises = [];
        
        for (let i = 0; i < concurrentUsers; i++) {
            promises.push(this.simulateUserSession(`load_user_${i}`));
        }

        try {
            const results = await Promise.allSettled(promises);
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            
            await this.log(`📊 负载测试完成: ${successCount}/${concurrentUsers} 成功`, 
                successCount === concurrentUsers ? 'success' : 'warning');
            
            return successCount === concurrentUsers;
        } catch (error) {
            await this.log(`负载测试失败: ${error.message}`, 'error');
            return false;
        }
    }

    async simulateUserSession(userId) {
        try {
            const sessionResponse = await axios.post(`${API_BASE}/interview/start`, {
                userId: userId,
                userName: `用户${userId}`,
                isFirstTime: Math.random() > 0.5
            });

            const sessionId = sessionResponse.data.data.sessionId;
            
            await axios.post(`${API_BASE}/interview/${sessionId}/info`, {
                targetJob: '软件工程师',
                background: '测试背景',
                experience: '测试经验',
                skills: ['测试技能']
            });

            await axios.post(`${API_BASE}/interview/${sessionId}/phase`);
            
            return true;
        } catch (error) {
            await this.log(`用户 ${userId} 会话失败: ${error.message}`, 'error');
            return false;
        }
    }
}

async function main() {
    const tester = new InterviewFlowTester();
    
    const args = process.argv.slice(2);
    const isQuick = args.includes('--quick');
    const isLoad = args.includes('--load');
    
    try {
        // 检查服务状态
        await tester.log('🔍 检查服务状态...');
        const healthResponse = await axios.get(`${API_BASE}/health`);
        await tester.log('✅ 服务运行正常', 'success');
        
        let result;
        if (isLoad) {
            result = await tester.runLoadTest();
        } else if (isQuick) {
            result = await tester.runQuickTest();
        } else {
            result = await tester.runFullTest();
        }
        
        process.exit(result ? 0 : 1);
    } catch (error) {
        await tester.log(`❌ 测试失败: ${error.message}`, 'error');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { InterviewFlowTester };