import React, { useState, useEffect } from 'react';
import {
    Table,
    Card,
    Tag,
    Button,
    Space,
    Modal,
    Descriptions,
    Typography,
    Progress,
    List,
    message,
    Input,
    Select,
    Tabs,
    Collapse,
    Timeline
} from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined, PlayCircleOutlined, DownloadOutlined, RedoOutlined } from '@ant-design/icons';
import { aiInterviewApi } from '../services/api';
import { buildAssetUrl } from '../utils/url';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface InterviewSession {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    jobTarget: string;
    jobCategory?: string;
    status: string;
    createdAt: string;
    overallScore?: number;
    analysisStatus?: string;
    duration?: number;
}

interface AnalysisTask {
    id: string;
    sessionId: string;
    userName: string;
    jobTarget: string;
    status: string;
    priority: number;
    retryCount: number;
    maxRetries: number;
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface Question {
    index: number;
    text: string;
    answer?: string;
    videoUrl?: string;
    duration?: number;
}

interface ConversationTurn {
    sequence: number;
    speaker: string;
    avatarText?: string | null;
    candidateText?: string | null;
    candidateVideoUrl?: string | null;
    questionIndex?: number | null;
    createdAt: string;
}

interface AnalysisLog {
    id: string;
    action: string;
    module: string;
    description: string;
    result: 'SUCCESS' | 'FAILED' | 'WARNING';
    errorMsg?: string | null;
    createdAt: string;
}

interface AnalysisReport {
    overallScore: number;
    competencies: {
        name: string;
        score: number;
        level: string;
        description: string;
    }[];
    strengths: string[];
    improvements: string[];
    jobMatch: {
        title: string;
        description: string;
        ratio: number;
    };
    tips: string;
    metrics?: {
        videoConfidenceScore?: number | null;
        emotionDistribution?: Record<string, number> | null;
        emotionStability?: number | null;
        speechQuality?: number | null;
        bodyLanguageScore?: number | null;
        postureStability?: number | null;
        gazeFocus?: number | null;
    };
    integrity?: {
        checks?: Array<{
            key: string;
            label: string;
            status: 'PASS' | 'WARN' | 'FAIL';
            required: boolean;
            message: string;
        }>;
        summary?: {
            totalQuestions: number;
            answeredVideoCount: number;
            resolvedVideoCount: number;
            audioExtractedCount: number;
            asrCompletedCount: number;
            frameAnalysisReadyCount: number;
            voiceprintReadyCount: number;
        };
        questions?: Array<{
            questionIndex?: number;
            hasVideo: boolean;
            videoResolved: boolean;
            audioExtracted: boolean;
            asrCompleted: boolean;
            transcriptSource: string;
            frameAnalysisReady: boolean;
            voiceprintReady: boolean;
            issues: string[];
        }>;
    } | null;
    voiceprint?: {
        enabled: boolean;
        status: 'CONSISTENT' | 'INCONSISTENT' | 'INSUFFICIENT' | 'DISABLED';
        threshold: number;
        analyzedSampleCount: number;
        consistencyScore?: number | null;
        baselineQuestionIndex?: number | null;
        questions: Array<{
            questionIndex?: number;
            analyzed: boolean;
            similarityToBaseline?: number | null;
            durationSec?: number | null;
            issue?: string;
        }>;
    } | null;
    insights?: {
        video?: Array<{
            frameMetrics?: Array<{
                timeMs: number;
                pose?: { pitch: number; yaw: number; roll: number } | null;
                gaze?: { pitch: number; yaw: number; roll: number } | null;
                eyeOpen?: number | null;
                faceQuality?: number | null;
                faceRect?: { left: number; top: number; width: number; height: number } | null;
                rawFace?: Record<string, any> | null;
            }>;
        }>;
    };
    status: string;
    error?: string;
    generatedAt: string;
}

const InterviewAnalysisManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('sessions');

    // Sessions State
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsData, setSessionsData] = useState<InterviewSession[]>([]);
    const [sessionsPagination, setSessionsPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [sessionsFilters, setSessionsFilters] = useState({
        status: undefined as string | undefined,
        search: ''
    });

    // Tasks State
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksData, setTasksData] = useState<AnalysisTask[]>([]);
    const [tasksPagination, setTasksPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [tasksFilters, setTasksFilters] = useState({
        status: undefined as string | undefined
    });

    // Detail State
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
    const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [analysisActionLoading, setAnalysisActionLoading] = useState(false);
    const [analysisLogs, setAnalysisLogs] = useState<AnalysisLog[]>([]);
    const [analysisLogsLoading, setAnalysisLogsLoading] = useState(false);
    const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
    const [detailActiveTab, setDetailActiveTab] = useState('questions');
    const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');

    const renderCheckStatus = (status?: 'PASS' | 'WARN' | 'FAIL') => {
        if (status === 'PASS') {
            return <Tag color="success">通过</Tag>;
        }
        if (status === 'WARN') {
            return <Tag color="warning">降级</Tag>;
        }
        if (status === 'FAIL') {
            return <Tag color="error">失败</Tag>;
        }
        return <Tag>未知</Tag>;
    };

    const renderVoiceprintStatus = (status?: 'CONSISTENT' | 'INCONSISTENT' | 'INSUFFICIENT' | 'DISABLED') => {
        if (status === 'CONSISTENT') {
            return <Tag color="success">一致</Tag>;
        }
        if (status === 'INCONSISTENT') {
            return <Tag color="error">不一致</Tag>;
        }
        if (status === 'INSUFFICIENT') {
            return <Tag color="warning">样本不足</Tag>;
        }
        if (status === 'DISABLED') {
            return <Tag>未启用</Tag>;
        }
        return <Tag>未知</Tag>;
    };

    const buildFrameMetricsRows = () => {
        const rawVideos = analysisReport?.insights?.video;
        const videos = Array.isArray(rawVideos) ? rawVideos : [];
        if (!videos.length) {
            return [];
        }
        const rows: Array<Record<string, any>> = [];
        videos.forEach((video, videoIndex) => {
            const frames = Array.isArray(video.frameMetrics) ? video.frameMetrics : [];
            frames.forEach((frame, frameIndex) => {
                rows.push({
                    videoIndex,
                    frameIndex,
                    timeMs: frame.timeMs ?? '',
                    pose_pitch: frame.pose?.pitch ?? '',
                    pose_yaw: frame.pose?.yaw ?? '',
                    pose_roll: frame.pose?.roll ?? '',
                    gaze_pitch: frame.gaze?.pitch ?? '',
                    gaze_yaw: frame.gaze?.yaw ?? '',
                    gaze_roll: frame.gaze?.roll ?? '',
                    eyeOpen: frame.eyeOpen ?? '',
                    faceQuality: frame.faceQuality ?? '',
                    faceRect_left: frame.faceRect?.left ?? '',
                    faceRect_top: frame.faceRect?.top ?? '',
                    faceRect_width: frame.faceRect?.width ?? '',
                    faceRect_height: frame.faceRect?.height ?? '',
                    rawFace: frame.rawFace ? JSON.stringify(frame.rawFace) : ''
                });
            });
        });
        return rows;
    };

    const escapeCsvValue = (value: any) => {
        if (value === null || value === undefined) {
            return '';
        }
        const text = String(value);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const handleExportFrameMetrics = () => {
        const rows = buildFrameMetricsRows();
        if (!rows.length) {
            message.warning('暂无 frameMetrics 数据可导出');
            return;
        }
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(',')];
        rows.forEach((row) => {
            csvLines.push(headers.map((key) => escapeCsvValue(row[key])).join(','));
        });
        const csvContent = `\uFEFF${csvLines.join('\n')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `frame_metrics_${currentSession?.id || 'analysis'}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const buildRawFaceSnapshot = () => {
        const rawVideos = analysisReport?.insights?.video;
        const videos = Array.isArray(rawVideos) ? rawVideos : [];
        if (!videos.length) {
            return [];
        }
        return videos.map((video, videoIndex) => ({
            videoIndex,
            frames: (video.frameMetrics || []).map((frame, frameIndex) => ({
                frameIndex,
                timeMs: frame.timeMs,
                rawFace: frame.rawFace || null
            }))
        }));
    };

    const fetchSessions = async (page = 1, pageSize = 10) => {
        setSessionsLoading(true);
        try {
            const res = await aiInterviewApi.getSessions({
                page,
                pageSize,
                status: sessionsFilters.status,
                search: sessionsFilters.search
            });
            if (res.success && res.data) {
                setSessionsData(res.data.list);
                setSessionsPagination({
                    current: res.data.page,
                    pageSize: res.data.pageSize,
                    total: res.data.total
                });
            }
        } catch (error) {
            message.error('获取面试列表失败');
        } finally {
            setSessionsLoading(false);
        }
    };

    const fetchTasks = async (page = 1, pageSize = 10) => {
        setTasksLoading(true);
        try {
            const res = await aiInterviewApi.getAnalysisTasks({
                page,
                pageSize,
                status: tasksFilters.status
            });
            if (res.success && res.data) {
                setTasksData(res.data.list);
                setTasksPagination({
                    current: res.data.page,
                    pageSize: res.data.pageSize,
                    total: res.data.total
                });
            }
        } catch (error) {
            message.error('获取任务列表失败');
        } finally {
            setTasksLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchSessions(sessionsPagination.current, sessionsPagination.pageSize);
        } else {
            fetchTasks(tasksPagination.current, tasksPagination.pageSize);
        }
    }, [activeTab, sessionsFilters, tasksFilters]);

    const fetchAnalysisDetail = async (sessionId: string) => {
        setDetailLoading(true);
        try {
            const res = await aiInterviewApi.getSessionAnalysis(sessionId);
            if (res.success && res.data) {
                setAnalysisReport(res.data.report);
                setQuestions(
                    (res.data.questions || []).map((question: Question) => ({
                        ...question,
                        videoUrl: question.videoUrl ? buildAssetUrl(question.videoUrl) : question.videoUrl,
                    }))
                );
                const rawTurns = (res.data.conversationTurns || []) as ConversationTurn[];
                setConversationTurns(
                    rawTurns.map((t) => ({
                        ...t,
                        candidateVideoUrl: t.candidateVideoUrl
                            ? buildAssetUrl(t.candidateVideoUrl)
                            : t.candidateVideoUrl,
                    }))
                );
            } else {
                setAnalysisReport(null);
                setQuestions([]);
                setConversationTurns([]);
            }
        } catch (error) {
            message.error('获取分析详情失败');
        } finally {
            setDetailLoading(false);
        }
    };

    const fetchAnalysisLogs = async (sessionId: string) => {
        setAnalysisLogsLoading(true);
        try {
            const res = await aiInterviewApi.getAnalysisLogs(sessionId);
            if (res.success && res.data) {
                const list = res.data.list || res.data.logs || [];
                setAnalysisLogs(list);
            } else {
                setAnalysisLogs([]);
            }
        } catch (error) {
            message.error('获取分析日志失败');
            setAnalysisLogs([]);
        } finally {
            setAnalysisLogsLoading(false);
        }
    };

    const handleViewAnalysis = async (record: InterviewSession) => {
        setCurrentSession(record);
        setDetailVisible(true);
        setDetailActiveTab('questions'); // 默认显示问题标签页
        setVideoPlayerVisible(false); // 关闭视频播放器
        setAnalysisLogs([]);
        setConversationTurns([]);
        await Promise.all([
            fetchAnalysisDetail(record.id),
            fetchAnalysisLogs(record.id)
        ]);
    };

    const handleRefreshAnalysis = async () => {
        if (!currentSession) {
            return;
        }
        await Promise.all([
            fetchAnalysisDetail(currentSession.id),
            fetchAnalysisLogs(currentSession.id)
        ]);
    };

    const handleRefreshAnalysisLogs = async () => {
        if (!currentSession) {
            return;
        }
        await fetchAnalysisLogs(currentSession.id);
    };

    const handleGenerateAnalysis = async () => {
        if (!currentSession) {
            return;
        }
        setAnalysisActionLoading(true);
        try {
            const res = await aiInterviewApi.retryAnalysisTask(currentSession.id);
            if (res.success) {
                message.success(res.message || '分析任务已加入队列');
                await fetchAnalysisLogs(currentSession.id);
            } else {
                message.error(res.message || '生成分析报告失败');
            }
        } catch (error) {
            const serverMessage = (error as any)?.response?.data?.message;
            message.error(serverMessage || '生成分析报告失败');
        } finally {
            setAnalysisActionLoading(false);
        }
    };

    const handlePlayVideo = (videoUrl: string) => {
        setCurrentVideoUrl(buildAssetUrl(videoUrl));
        setVideoPlayerVisible(true);
    };

    const handleRetryTask = async (record: AnalysisTask) => {
        Modal.confirm({
            title: '确认重试',
            content: `确定要重试任务 ${record.id.substring(0, 8)}... 吗？此操作将重置重试次数并重新加入队列。`,
            onOk: async () => {
                try {
                    const res = await aiInterviewApi.retryAnalysisTask(record.sessionId);
                    if (res.success) {
                        message.success('任务已重新加入队列');
                        // 刷新任务列表
                        fetchTasks(tasksPagination.current, tasksPagination.pageSize);
                    } else {
                        message.error('重试失败');
                    }
                } catch (error) {
                    const serverMessage = (error as any)?.response?.data?.message;
                    const fallback = error instanceof Error ? error.message : '未知错误';
                    message.error(`重试失败：${serverMessage || fallback}`);
                }
            }
        });
    };

    const sessionColumns = [
        {
            title: '求职者',
            dataIndex: 'userName',
            key: 'userName',
            render: (text: string, record: InterviewSession) => (
                <Space>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.userEmail}</Text>
                </Space>
            )
        },
        {
            title: '目标职位',
            dataIndex: 'jobTarget',
            key: 'jobTarget',
        },
        {
            title: '面试状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    COMPLETED: 'green',
                    IN_PROGRESS: 'blue',
                    PREPARING: 'orange',
                    CANCELLED: 'default'
                };
                return <Tag color={colors[status] || 'default'}>{status}</Tag>;
            }
        },
        {
            title: '分析状态',
            dataIndex: 'analysisStatus',
            key: 'analysisStatus',
            render: (status: string) => {
                if (!status) return '-';
                const colors: Record<string, string> = {
                    COMPLETED: 'success',
                    PROCESSING: 'processing',
                    FAILED: 'error'
                };
                return <Tag color={colors[status] || 'default'}>{status}</Tag>;
            }
        },
        {
            title: '综合评分',
            dataIndex: 'overallScore',
            key: 'overallScore',
            render: (score: number) => score ? <Text strong style={{ color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f' }}>{score}</Text> : '-'
        },
        {
            title: '提交时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text: string) => new Date(text).toLocaleString()
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: InterviewSession) => (
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewAnalysis(record)}
                >
                    查看详情
                </Button>
            )
        }
    ];

    const taskColumns = [
        {
            title: '任务ID',
            dataIndex: 'id',
            key: 'id',
            width: 100,
            ellipsis: true
        },
        {
            title: '求职者',
            dataIndex: 'userName',
            key: 'userName',
        },
        {
            title: '目标职位',
            dataIndex: 'jobTarget',
            key: 'jobTarget',
        },
        {
            title: '任务状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, string> = {
                    COMPLETED: 'success',
                    PROCESSING: 'processing',
                    PENDING: 'warning',
                    FAILED: 'error'
                };
                return <Tag color={colors[status] || 'default'}>{status}</Tag>;
            }
        },
        {
            title: '重试次数',
            key: 'retry',
            render: (_: any, record: AnalysisTask) => `${record.retryCount} / ${record.maxRetries}`
        },
        {
            title: '错误信息',
            dataIndex: 'errorMessage',
            key: 'errorMessage',
            ellipsis: true,
            render: (text: string) => text ? <Text type="danger">{text}</Text> : '-'
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text: string) => new Date(text).toLocaleString()
        },
        {
            title: '更新时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (text: string) => new Date(text).toLocaleString()
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: AnalysisTask) => (
                record.status === 'FAILED' && (
                    <Button
                        type="link"
                        size="small"
                        icon={<RedoOutlined />}
                        onClick={() => handleRetryTask(record)}
                    >
                        重试
                    </Button>
                )
            )
        }
    ];

    const analysisLogColumns = [
        {
            title: '时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (text: string) => new Date(text).toLocaleString()
        },
        {
            title: '动作',
            dataIndex: 'action',
            key: 'action',
            width: 180
        },
        {
            title: '结果',
            dataIndex: 'result',
            key: 'result',
            width: 90,
            render: (result: string) => {
                const colors: Record<string, string> = {
                    SUCCESS: 'green',
                    FAILED: 'red',
                    WARNING: 'orange'
                };
                return <Tag color={colors[result] || 'default'}>{result}</Tag>;
            }
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description'
        },
        {
            title: '错误',
            dataIndex: 'errorMsg',
            key: 'errorMsg',
            render: (text: string | null) => text ? <Text type="danger">{text}</Text> : '-'
        }
    ];

    const renderAnalysisLogsCard = () => (
        <Card
            title="分析日志"
            extra={
                <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={handleRefreshAnalysisLogs}
                    loading={analysisLogsLoading}
                >
                    刷新
                </Button>
            }
        >
            <Table
                rowKey="id"
                size="small"
                columns={analysisLogColumns}
                dataSource={analysisLogs}
                loading={analysisLogsLoading}
                pagination={false}
                locale={{ emptyText: '暂无分析日志' }}
            />
        </Card>
    );

    return (
        <div style={{ padding: 24 }}>
            <Card title="面试/简历分析管理">
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <Tabs.TabPane tab="面试会话" key="sessions">
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                            <Space>
                                <Input
                                    placeholder="搜索用户或职位"
                                    prefix={<SearchOutlined />}
                                    onPressEnter={(e) => setSessionsFilters({ ...sessionsFilters, search: e.currentTarget.value })}
                                    style={{ width: 200 }}
                                />
                                <Select
                                    placeholder="面试状态"
                                    allowClear
                                    style={{ width: 120 }}
                                    onChange={(value) => setSessionsFilters({ ...sessionsFilters, status: value })}
                                >
                                    <Option value="COMPLETED">已完成</Option>
                                    <Option value="IN_PROGRESS">进行中</Option>
                                    <Option value="PREPARING">准备中</Option>
                                    <Option value="CANCELLED">已取消</Option>
                                </Select>
                                <Button type="primary" onClick={() => fetchSessions(1, sessionsPagination.pageSize)}>查询</Button>
                            </Space>
                            <Button icon={<ReloadOutlined />} onClick={() => fetchSessions(sessionsPagination.current, sessionsPagination.pageSize)} />
                        </div>
                        <Table
                            columns={sessionColumns}
                            dataSource={sessionsData}
                            rowKey="id"
                            pagination={sessionsPagination}
                            loading={sessionsLoading}
                            onChange={(pag) => fetchSessions(pag.current, pag.pageSize)}
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="分析任务监控" key="tasks">
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                            <Space>
                                <Select
                                    placeholder="任务状态"
                                    allowClear
                                    style={{ width: 120 }}
                                    onChange={(value) => setTasksFilters({ ...tasksFilters, status: value })}
                                >
                                    <Option value="PENDING">等待中</Option>
                                    <Option value="PROCESSING">处理中</Option>
                                    <Option value="COMPLETED">已完成</Option>
                                    <Option value="FAILED">失败</Option>
                                </Select>
                                <Button type="primary" onClick={() => fetchTasks(1, tasksPagination.pageSize)}>查询</Button>
                            </Space>
                            <Button icon={<ReloadOutlined />} onClick={() => fetchTasks(tasksPagination.current, tasksPagination.pageSize)} />
                        </div>
                        <Table
                            columns={taskColumns}
                            dataSource={tasksData}
                            rowKey="id"
                            pagination={tasksPagination}
                            loading={tasksLoading}
                            onChange={(pag) => fetchTasks(pag.current, pag.pageSize)}
                        />
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            <Modal
                title="面试详情"
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={900}
            >
                {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: 50 }}>加载中...</div>
                ) : (
                    <Tabs activeKey={detailActiveTab} onChange={setDetailActiveTab}>
                        <Tabs.TabPane tab="沟通上下文" key="conversation">
                            {conversationTurns.length === 0 ? (
                                <Text type="secondary">暂无实时沟通记录（需客户端经 Socket 与答题上传产生）</Text>
                            ) : (
                                <Timeline
                                    items={conversationTurns.map((t) => ({
                                        color: t.speaker === 'AVATAR' ? 'blue' : 'green',
                                        children: (
                                            <div>
                                                <Tag>{t.speaker === 'AVATAR' ? '数字人' : '候选人'}</Tag>
                                                {t.questionIndex != null && <Tag>题{t.questionIndex}</Tag>}
                                                <div style={{ marginTop: 8 }}>
                                                    {t.avatarText && (
                                                        <Paragraph style={{ marginBottom: 8 }} copyable>
                                                            {t.avatarText}
                                                        </Paragraph>
                                                    )}
                                                    {t.candidateText && (
                                                        <Paragraph type="secondary" style={{ marginBottom: 8 }} copyable>
                                                            文本：{t.candidateText}
                                                        </Paragraph>
                                                    )}
                                                    {t.candidateVideoUrl && (
                                                        <Space>
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                icon={<PlayCircleOutlined />}
                                                                onClick={() => handlePlayVideo(t.candidateVideoUrl!)}
                                                            >
                                                                播放答题视频
                                                            </Button>
                                                        </Space>
                                                    )}
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {new Date(t.createdAt).toLocaleString()}
                                                </Text>
                                            </div>
                                        ),
                                    }))}
                                />
                            )}
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="问题与答案" key="questions">
                            <List
                                dataSource={questions}
                                locale={{ emptyText: '暂无问题数据' }}
                                renderItem={(q, idx) => (
                                    <Card
                                        key={idx}
                                        style={{ marginBottom: 16 }}
                                        size="small"
                                    >
                                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                            <div>
                                                <Tag color="blue">Q{q.index + 1}</Tag>
                                                <Text strong>{q.text}</Text>
                                            </div>

                                            <div>
                                                <Text type="secondary">答案: </Text>
                                                <Text>{q.answer || '未作答'}</Text>
                                            </div>

                                            {q.videoUrl && (
                                                <Space>
                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        icon={<PlayCircleOutlined />}
                                                        onClick={() => handlePlayVideo(q.videoUrl!)}
                                                    >
                                                        播放视频
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        icon={<DownloadOutlined />}
                                                        onClick={() => {
                                                            const a = document.createElement('a');
                                                            a.href = q.videoUrl!;
                                                            a.download = `answer_q${q.index + 1}.mp4`;
                                                            a.click();
                                                        }}
                                                    >
                                                        下载
                                                    </Button>
                                                    {q.duration && (
                                                        <Text type="secondary">时长: {q.duration}秒</Text>
                                                    )}
                                                </Space>
                                            )}
                                        </Space>
                                    </Card>
                                )}
                            />
                        </Tabs.TabPane>

                        <Tabs.TabPane tab="综合分析" key="analysis">
                            {analysisReport ? (
                                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                    <Card>
                                        <Descriptions title="基本信息" bordered column={2}>
                                            <Descriptions.Item label="求职者">{currentSession?.userName}</Descriptions.Item>
                                            <Descriptions.Item label="目标职位">{currentSession?.jobTarget}</Descriptions.Item>
                                            <Descriptions.Item label="综合评分">
                                                <Text style={{ fontSize: 24, color: '#1890ff' }}>{analysisReport.overallScore}</Text>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="生成时间">{new Date(analysisReport.generatedAt).toLocaleString()}</Descriptions.Item>
                                        </Descriptions>
                                    </Card>

                                    <Card title="客观指标">
                                        <Descriptions bordered column={2}>
                                            <Descriptions.Item label="视频自信度">
                                                {analysisReport.metrics?.videoConfidenceScore != null ? (
                                                    <Progress percent={Math.round(analysisReport.metrics.videoConfidenceScore)} size="small" />
                                                ) : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="情绪稳定性">
                                                {analysisReport.metrics?.emotionStability != null ? (
                                                    <Progress percent={Math.round(analysisReport.metrics.emotionStability)} size="small" />
                                                ) : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="语音质量">
                                                {analysisReport.metrics?.speechQuality != null ? (
                                                    <Progress percent={Math.round(analysisReport.metrics.speechQuality)} size="small" />
                                                ) : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="肢体语言">
                                                {analysisReport.metrics?.bodyLanguageScore != null ? (
                                                    <Progress percent={Math.round(analysisReport.metrics.bodyLanguageScore)} size="small" />
                                                ) : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="姿态稳定性">
                                                {analysisReport.metrics?.postureStability != null ? (
                                                    <Progress percent={Math.round(analysisReport.metrics.postureStability)} size="small" />
                                                ) : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="视线专注度">
                                                {analysisReport.metrics?.gazeFocus != null ? (
                                                    <Progress percent={Math.round(analysisReport.metrics.gazeFocus)} size="small" />
                                                ) : '-'}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </Card>

                                    <Card title="证据完整性">
                                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                            <Descriptions bordered column={2}>
                                                <Descriptions.Item label="题目总数">{analysisReport.integrity?.summary?.totalQuestions ?? '-'}</Descriptions.Item>
                                                <Descriptions.Item label="收到视频">{analysisReport.integrity?.summary?.answeredVideoCount ?? '-'}</Descriptions.Item>
                                                <Descriptions.Item label="可访问视频">{analysisReport.integrity?.summary?.resolvedVideoCount ?? '-'}</Descriptions.Item>
                                                <Descriptions.Item label="音频抽取成功">{analysisReport.integrity?.summary?.audioExtractedCount ?? '-'}</Descriptions.Item>
                                                <Descriptions.Item label="ASR 完成">{analysisReport.integrity?.summary?.asrCompletedCount ?? '-'}</Descriptions.Item>
                                                <Descriptions.Item label="关键帧分析完成">{analysisReport.integrity?.summary?.frameAnalysisReadyCount ?? '-'}</Descriptions.Item>
                                                <Descriptions.Item label="声纹样本就绪">{analysisReport.integrity?.summary?.voiceprintReadyCount ?? '-'}</Descriptions.Item>
                                            </Descriptions>

                                            <List
                                                size="small"
                                                bordered
                                                dataSource={analysisReport.integrity?.checks || []}
                                                renderItem={(item) => (
                                                    <List.Item>
                                                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                                            <Space>
                                                                <Text strong>{item.label}</Text>
                                                                {renderCheckStatus(item.status)}
                                                                {item.required ? <Tag color="blue">硬依赖</Tag> : <Tag>软依赖</Tag>}
                                                            </Space>
                                                            <Text type="secondary">{item.message}</Text>
                                                        </Space>
                                                    </List.Item>
                                                )}
                                            />

                                            <Collapse
                                                items={[
                                                    {
                                                        key: 'integrity-questions',
                                                        label: '查看逐题完整性状态',
                                                        children: (
                                                            <List
                                                                size="small"
                                                                dataSource={analysisReport.integrity?.questions || []}
                                                                renderItem={(item) => (
                                                                    <List.Item>
                                                                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                                                            <Space wrap>
                                                                                <Text strong>Q{(item.questionIndex ?? 0) + 1}</Text>
                                                                                {item.hasVideo ? <Tag color="success">有视频</Tag> : <Tag color="error">无视频</Tag>}
                                                                                {item.videoResolved ? <Tag color="success">视频可访问</Tag> : <Tag color="warning">视频不可访问</Tag>}
                                                                                {item.audioExtracted ? <Tag color="success">已抽音频</Tag> : <Tag color="warning">未抽音频</Tag>}
                                                                                {item.asrCompleted ? <Tag color="success">ASR完成</Tag> : <Tag color="warning">ASR未完成</Tag>}
                                                                                {item.frameAnalysisReady ? <Tag color="success">关键帧完成</Tag> : <Tag color="warning">关键帧未完成</Tag>}
                                                                                {item.voiceprintReady ? <Tag color="success">声纹可用</Tag> : <Tag color="warning">声纹不可用</Tag>}
                                                                            </Space>
                                                                            <Text type="secondary">文本来源: {item.transcriptSource || '-'}</Text>
                                                                            {item.issues?.length ? (
                                                                                <Text type="danger">问题: {item.issues.join('；')}</Text>
                                                                            ) : (
                                                                                <Text type="secondary">未发现异常</Text>
                                                                            )}
                                                                        </Space>
                                                                    </List.Item>
                                                                )}
                                                            />
                                                        )
                                                    }
                                                ]}
                                            />
                                        </Space>
                                    </Card>

                                    <Card title="声纹一致性">
                                        <Descriptions bordered column={2}>
                                            <Descriptions.Item label="分析状态">
                                                {renderVoiceprintStatus(analysisReport.voiceprint?.status)}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="可用样本">{analysisReport.voiceprint?.analyzedSampleCount ?? '-'}</Descriptions.Item>
                                            <Descriptions.Item label="一致性分数">
                                                {analysisReport.voiceprint?.consistencyScore != null
                                                    ? `${Math.round(analysisReport.voiceprint.consistencyScore * 100)}%`
                                                    : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="阈值">
                                                {analysisReport.voiceprint?.threshold != null
                                                    ? `${Math.round(analysisReport.voiceprint.threshold * 100)}%`
                                                    : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="基准题目">
                                                {analysisReport.voiceprint?.baselineQuestionIndex != null
                                                    ? `Q${analysisReport.voiceprint.baselineQuestionIndex + 1}`
                                                    : '-'}
                                            </Descriptions.Item>
                                        </Descriptions>

                                        <List
                                            size="small"
                                            style={{ marginTop: 16 }}
                                            bordered
                                            dataSource={analysisReport.voiceprint?.questions || []}
                                            renderItem={(item) => (
                                                <List.Item>
                                                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                                        <Space wrap>
                                                            <Text strong>Q{(item.questionIndex ?? 0) + 1}</Text>
                                                            {item.analyzed ? <Tag color="success">已分析</Tag> : <Tag color="warning">未分析</Tag>}
                                                            {item.similarityToBaseline != null ? (
                                                                <Tag color={item.similarityToBaseline >= (analysisReport.voiceprint?.threshold || 0) ? 'success' : 'error'}>
                                                                    相似度 {Math.round(item.similarityToBaseline * 100)}%
                                                                </Tag>
                                                            ) : null}
                                                        </Space>
                                                        {item.issue ? (
                                                            <Text type="danger">{item.issue}</Text>
                                                        ) : (
                                                            <Text type="secondary">
                                                                {item.durationSec != null ? `音频时长 ${item.durationSec.toFixed(1)} 秒` : '音频时长未知'}
                                                            </Text>
                                                        )}
                                                    </Space>
                                                </List.Item>
                                            )}
                                        />
                                    </Card>

                                    <Card
                                        title="原始 DetectFace 字段"
                                        extra={
                                            <Button
                                                size="small"
                                                icon={<DownloadOutlined />}
                                                onClick={handleExportFrameMetrics}
                                            >
                                                导出 CSV
                                            </Button>
                                        }
                                    >
                                        <Collapse
                                            items={[
                                                {
                                                    key: 'detectface-raw',
                                                    label: '查看 DetectFace 原始字段（frameMetrics.rawFace）',
                                                    children: (
                                                        <pre style={{ margin: 0, maxHeight: 360, overflow: 'auto', background: '#fafafa', padding: 12 }}>
                                                            {JSON.stringify(buildRawFaceSnapshot(), null, 2)}
                                                        </pre>
                                                    )
                                                }
                                            ]}
                                        />
                                    </Card>

                                    <Card title="能力维度分析">
                                        <List
                                            grid={{ gutter: 16, column: 2 }}
                                            dataSource={analysisReport.competencies}
                                            renderItem={item => (
                                                <List.Item>
                                                    <Card size="small" title={item.name} extra={<Text strong>{item.score}分</Text>}>
                                                        <Progress percent={item.score} size="small" status="active" />
                                                        <Paragraph style={{ marginTop: 8 }} type="secondary">{item.description}</Paragraph>
                                                    </Card>
                                                </List.Item>
                                            )}
                                        />
                                    </Card>

                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <Card title="优势" style={{ flex: 1 }}>
                                            <ul>
                                                {analysisReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </Card>
                                        <Card title="待改进" style={{ flex: 1 }}>
                                            <ul>
                                                {analysisReport.improvements.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </Card>
                                    </div>

                                    <Card title="岗位匹配度">
                                        <Descriptions column={1}>
                                            <Descriptions.Item label="匹配职位">{analysisReport.jobMatch.title}</Descriptions.Item>
                                            <Descriptions.Item label="匹配度">
                                                <Progress percent={Math.round(analysisReport.jobMatch.ratio * 100)} />
                                            </Descriptions.Item>
                                            <Descriptions.Item label="评价">{analysisReport.jobMatch.description}</Descriptions.Item>
                                        </Descriptions>
                                    </Card>

                                    <Card title="职场建议">
                                        <Paragraph>{analysisReport.tips}</Paragraph>
                                    </Card>

                                    {renderAnalysisLogsCard()}
                                </Space>
                            ) : (
                                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                    <div style={{ textAlign: 'center', padding: 50 }}>
                                        <Space direction="vertical" size="middle">
                                            <Text type="secondary">暂无分析报告</Text>
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    onClick={handleGenerateAnalysis}
                                                    loading={analysisActionLoading}
                                                    disabled={currentSession?.status !== 'COMPLETED'}
                                                >
                                                    生成分析报告
                                                </Button>
                                                <Button icon={<ReloadOutlined />} onClick={handleRefreshAnalysis}>
                                                    刷新
                                                </Button>
                                            </Space>
                                            {currentSession?.status && currentSession.status !== 'COMPLETED' ? (
                                                <Text type="secondary">面试状态为 {currentSession.status}，完成后才能生成报告</Text>
                                            ) : null}
                                        </Space>
                                    </div>

                                    {renderAnalysisLogsCard()}
                                </Space>
                            )}
                        </Tabs.TabPane>
                    </Tabs>
                )}
            </Modal>

            {/* 视频播放器Modal */}
            <Modal
                title="视频播放"
                open={videoPlayerVisible}
                onCancel={() => setVideoPlayerVisible(false)}
                footer={null}
                width={800}
                centered
            >
                {currentVideoUrl && (
                    <video
                        controls
                        autoPlay
                        style={{ width: '100%', maxHeight: '600px' }}
                        src={currentVideoUrl}
                    >
                        您的浏览器不支持视频播放。
                    </video>
                )}
            </Modal>
        </div>
    );
};

export default InterviewAnalysisManagement;
