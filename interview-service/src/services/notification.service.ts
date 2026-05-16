import { prisma } from '../lib/prisma';
import { smsService } from './smsService';

/**
 * 通知服务
 * 负责发送 App 通知、短信提醒等
 */
export class NotificationService {
    /**
     * 发送面试报告就绪通知
     * @param sessionId 会话ID
     */
    async sendReportReadyNotification(sessionId: string): Promise<void> {
        try {
            // 1. 获取会话和用户信息
            const session = await prisma.aIInterviewSession.findUnique({
                where: { id: sessionId },
                include: {
                    user: {
                        select: {
                            id: true,
                            phone: true,
                            name: true
                        }
                    }
                }
            });

            if (!session || !session.user || !session.user.phone) {
                console.warn(`[Notification] 无法发送通知：会话或用户手机号不存在 (sessionId: ${sessionId})`);
                return;
            }

            const phone = session.user.phone;
            const userName = session.user.name || '面试者';
            const jobTarget = session.jobTarget || 'AI面试岗位';

            // 2. 构造 Deep Link
            // 协议格式：ai-interview://report?sessionId=xxx
            const deepLink = `ai-interview://report?sessionId=${sessionId}`;
            
            // 3. 构造通知内容
            // 由于短信长度限制和链接点击，通常建议使用简短的描述
            // 在实际生产中，可能需要一个短链接转换服务，这里直接模拟
            const message = `【AI面试系统】${userName}您好，您参加的“${jobTarget}”面试报告已生成。点击链接直接查看报告详情：${deepLink}`;

            console.info(`[Notification] 准备向用户 ${phone} 发送报告就绪通知...`);

            // 4. 下发短信
            await smsService.sendInterviewReportNotification(phone, {
                userName,
                jobTitle: jobTarget,
                reportLink: deepLink
            });

            console.info(`[Notification] 报告就绪通知已提交至短信服务 (phone: ${phone})`);

        } catch (error) {
            console.error(`[Notification] 发送报告就绪通知异常:`, error);
        }
    }
}

export const notificationService = new NotificationService();
