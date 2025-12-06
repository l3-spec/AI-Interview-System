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
    Tabs
} from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { aiInterviewApi } from '../services/api';

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
    const [detailLoading, setDetailLoading] = useState(false);

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

    const handleViewAnalysis = async (record: InterviewSession) => {
        setCurrentSession(record);
        setDetailVisible(true);
        setDetailLoading(true);
        try {
            const res = await aiInterviewApi.getSessionAnalysis(record.id);
            if (res.success && res.data) {
                setAnalysisReport(res.data.report);
            } else {
                setAnalysisReport(null);
            }
        } catch (error) {
            message.error('获取分析详情失败');
        } finally {
            setDetailLoading(false);
        }
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
                    disabled={record.status !== 'COMPLETED'}
                >
                    查看报告
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
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card title="AI面试/简历分析管理">
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
                title="面试分析报告"
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={800}
            >
                {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: 50 }}>加载中...</div>
                ) : analysisReport ? (
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
                    </Space>
                ) : (
                    <div style={{ textAlign: 'center', padding: 50 }}>
                        <Text type="secondary">暂无分析报告</Text>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default InterviewAnalysisManagement;
