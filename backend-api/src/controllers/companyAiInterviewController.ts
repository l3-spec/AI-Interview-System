import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { toMediaUrl } from '../utils/ossUtils';

type Authed = Request & { user?: { id: string; type?: string } };

/**
 * 企业端：仅可查看关联本企业 Job 的 AI 面试会话
 */
export async function listCompanyAiInterviewSessions(req: Authed, res: Response) {
  try {
    if (req.user?.type !== 'company') {
      return res.status(403).json({ success: false, message: '仅企业账号可访问' });
    }
    const companyId = req.user.id;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20));
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();

    const where: any = {
      jobId: { not: null },
      job: { companyId },
    };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { jobTarget: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.aIInterviewSession.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          job: { select: { id: true, title: true } },
          analysisReport: { select: { overallScore: true, analysisStatus: true } },
        },
      }),
      prisma.aIInterviewSession.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        list: list.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          userName: s.user?.name,
          userEmail: s.user?.email,
          userAvatar: toMediaUrl(s.user?.avatar) ?? s.user?.avatar,
          jobTarget: s.jobTarget,
          jobTitle: s.job?.title,
          status: s.status,
          createdAt: s.createdAt,
          duration: s.duration,
          overallScore: s.analysisReport?.overallScore,
          analysisStatus: s.analysisReport?.analysisStatus,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (e) {
    console.error('listCompanyAiInterviewSessions', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

export async function getCompanyAiInterviewSessionDetail(req: Authed, res: Response) {
  try {
    if (req.user?.type !== 'company') {
      return res.status(403).json({ success: false, message: '仅企业账号可访问' });
    }
    const companyId = req.user.id;
    const { sessionId } = req.params;

    const session = await prisma.aIInterviewSession.findFirst({
      where: {
        id: sessionId,
        jobId: { not: null },
        job: { companyId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            experience: true,
            skills: true,
          },
        },
        job: { select: { id: true, title: true } },
        questions: { orderBy: { questionIndex: 'asc' } },
        conversationTurns: { orderBy: { sequence: 'asc' } },
        analysisReport: true,
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: '会话不存在或无权查看' });
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          jobTarget: session.jobTarget,
          jobTitle: (session as any).job?.title,
          status: session.status,
          createdAt: session.createdAt,
          duration: session.duration,
          user: session.user
            ? {
                ...session.user,
                avatar: toMediaUrl(session.user.avatar) ?? session.user.avatar,
              }
            : session.user,
        },
        questions: session.questions.map((q: any) => ({
          index: q.questionIndex,
          text: q.questionText,
          answer: q.answerText,
          videoUrl: toMediaUrl(q.answerVideoUrl) ?? q.answerVideoUrl,
          duration: q.answerDuration,
        })),
        conversationTurns: session.conversationTurns.map((t: any) => ({
          id: t.id,
          sequence: t.sequence,
          speaker: t.speaker,
          avatarText: t.avatarText,
          candidateText: t.candidateText,
          candidateVideoUrl: toMediaUrl(t.candidateVideoUrl) ?? t.candidateVideoUrl,
          questionIndex: t.questionIndex,
          createdAt: t.createdAt,
        })),
        report: session.analysisReport || null,
      },
    });
  } catch (e) {
    console.error('getCompanyAiInterviewSessionDetail', e);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}
