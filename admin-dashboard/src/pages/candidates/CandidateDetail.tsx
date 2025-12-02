import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  List,
  message,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Timeline,
  Typography
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  StarFilled,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AbilityRadarChart from '../../components/AbilityRadarChart';
import { candidateApi, interviewApi } from '../../services/api';
import {
  AbilityAssessment,
  Candidate,
  CandidateInterviewSummary,
  InterviewDetailResponse
} from '../../types/interview';

const { Title, Text, Paragraph } = Typography;

const defaultAssessment: AbilityAssessment = {
  id: 'assessment-placeholder',
  interviewId: 'interview-placeholder',
  technicalSkills: 0,
  communication: 0,
  problemSolving: 0,
  teamwork: 0,
  leadership: 0,
  creativity: 0,
  adaptability: 0,
  overallScore: 0,
  feedback: '暂无评估数据',
  strengths: [],
  improvements: []
};

const abilityDimensions: { key: keyof AbilityAssessment; label: string }[] = [
  { key: 'technicalSkills', label: '技术能力' },
  { key: 'problemSolving', label: '问题解决' },
  { key: 'communication', label: '沟通表达' },
  { key: 'teamwork', label: '团队协作' },
  { key: 'leadership', label: '领导潜力' },
  { key: 'adaptability', label: '适应变化' }
];

const genderTextMap: Record<Candidate['gender'], string> = {
  male: '男',
  female: '女',
  other: '其他'
};

const candidateStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'gold' },
  interviewing: { text: '面试中', color: 'processing' },
  passed: { text: '已通过', color: 'success' },
  rejected: { text: '已拒绝', color: 'error' },
  withdrawn: { text: '已撤销', color: 'default' },
  active: { text: '活跃', color: 'processing' }
};

const interviewStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待面试', color: 'gold' },
  ongoing: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'default' }
};

const interviewResultMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待评估', color: 'default' },
  reviewing: { text: '评估中', color: 'processing' },
  passed: { text: '通过', color: 'green' },
  failed: { text: '未通过', color: 'red' }
};

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviews, setInterviews] = useState<CandidateInterviewSummary[]>([]);
  const [assessment, setAssessment] = useState<AbilityAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  const getTimestamp = (value?: string) => {
    if (!value) {
      return 0;
    }
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.valueOf() : 0;
  };

  const fetchLatestAssessment = useCallback(async (interviewId: string) => {
    setAssessmentLoading(true);
    try {
      const detail: InterviewDetailResponse | any = await interviewApi.getDetail(interviewId);
      const resolvedAssessment: AbilityAssessment | undefined = (detail as any)?.assessment || (detail as any)?.data?.assessment;

      setAssessment(resolvedAssessment ?? null);
    } catch (error) {
      message.warning('获取最新能力评估失败，可稍后重试');
      setAssessment(null);
    } finally {
      setAssessmentLoading(false);
    }
  }, []);

  const loadCandidateDetail = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const [candidateData, interviewData] = await Promise.all([
        candidateApi.getById(id),
        candidateApi.getInterviews(id)
      ]);

      setCandidate(candidateData);
      setInterviews(interviewData);

      if (interviewData.length > 0) {
        const latest = [...interviewData].sort((a, b) => {
          const aTime = a.startTime || a.createdAt;
          const bTime = b.startTime || b.createdAt;
          return getTimestamp(bTime) - getTimestamp(aTime);
        })[0];

        if (latest?.id) {
          fetchLatestAssessment(latest.id);
        } else {
          setAssessment(null);
        }
      } else {
        setAssessment(null);
      }
    } catch (error) {
      message.error('加载候选人信息失败，请稍后重试');
      setCandidate(null);
      setInterviews([]);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [fetchLatestAssessment, id]);

  useEffect(() => {
    loadCandidateDetail();
  }, [loadCandidateDetail]);

  const sortedInterviews = useMemo(() => {
    return [...interviews].sort((a, b) => {
      const aTime = a.startTime || a.createdAt;
      const bTime = b.startTime || b.createdAt;
      return getTimestamp(bTime) - getTimestamp(aTime);
    });
  }, [interviews]);

  const latestInterview = sortedInterviews[0];

  const chartAssessment = assessment ?? defaultAssessment;

  const abilityBreakdown = abilityDimensions.map((dimension) => {
    const rawValue = chartAssessment[dimension.key];
    const score = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0;
    const percent = Math.round((score / 10) * 100);

    const color = score >= 8 ? '#52c41a' : score >= 6 ? '#1890ff' : score >= 4 ? '#faad14' : '#ff4d4f';

    return {
      ...dimension,
      score,
      percent,
      color
    };
  });

  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter((interview) => {
    const status = (interview.status || '').toLowerCase();
    const result = (interview.result || '').toLowerCase();
    return status === 'completed' || result === 'passed' || result === 'failed';
  }).length;
  const passedInterviews = interviews.filter((interview) => (interview.result || '').toLowerCase() === 'passed').length;
  const passRate = completedInterviews === 0 ? 0 : Math.round((passedInterviews / completedInterviews) * 100);

  const lastInterviewAt = latestInterview?.startTime || latestInterview?.createdAt;
  const lastInterviewFormatted = lastInterviewAt ? dayjs(lastInterviewAt).format('YYYY-MM-DD HH:mm') : '--';
  const lastInterviewScore = latestInterview?.overallScore ?? latestInterview?.score;

  if (loading && !candidate) {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/candidates')}>
          返回候选人列表
        </Button>
        <Card>
          <Skeleton active avatar paragraph={{ rows: 14 }} />
        </Card>
      </Space>
    );
  }

  if (!candidate) {
    return (
      <Empty description="未找到候选人信息" style={{ padding: '60px 0' }}>
        <Button type="primary" onClick={() => navigate('/candidates')}>
          返回候选人列表
        </Button>
      </Empty>
    );
  }

  const statusConfig = candidate.status ? candidateStatusMap[candidate.status.toLowerCase()] : undefined;
  const genderTag = genderTextMap[candidate.gender] || '未知';
  const skills = Array.isArray(candidate.skills) ? candidate.skills.slice(0, 8) : [];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/candidates')}>
        返回候选人列表
      </Button>

      <Card
        bordered
        extra={(
          <Space>
            {candidate.resume && (
              <Button icon={<FileTextOutlined />} onClick={() => window.open(candidate.resume, '_blank')}>
                查看简历
              </Button>
            )}
            <Button onClick={() => navigate(`/interviews/new?candidateId=${candidate.id}`)}>
              发起面试
            </Button>
            {latestInterview?.id && (
              <Button type="primary" onClick={() => navigate(`/interviews/${latestInterview.id}`)}>
                查看最近面试
              </Button>
            )}
          </Space>
        )}
      >
        <Row gutter={24} align="middle">
          <Col span={16}>
            <Space align="start" size={24}>
              <Avatar size={96} src={candidate.avatar} icon={<UserOutlined />} />
              <Space direction="vertical" size={12}>
                <Space align="center" size={16} wrap>
                  <Title level={3} style={{ margin: 0 }}>
                    {candidate.name || '未命名候选人'}
                  </Title>
                  <Tag color="geekblue">{genderTag}</Tag>
                  {candidate.age ? <Tag icon={<CalendarOutlined />} color="purple">{candidate.age} 岁</Tag> : null}
                  {candidate.experience ? <Tag icon={<StarFilled />} color="volcano">{candidate.experience} 年经验</Tag> : null}
                  {statusConfig && (
                    <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                  )}
                </Space>

                <Space direction="vertical" size={4}>
                  <Space size={12}>
                    <MailOutlined style={{ color: '#1890ff' }} />
                    <Text>{candidate.email || '暂无邮箱'}</Text>
                  </Space>
                  <Space size={12}>
                    <PhoneOutlined style={{ color: '#52c41a' }} />
                    <Text>{candidate.phone || '暂无电话'}</Text>
                  </Space>
                </Space>

                <Space size={[8, 8]} wrap>
                  <Tag icon={<TeamOutlined />} color="cyan">{candidate.education || '学历未填写'}</Tag>
                  <Tag color="blue">{candidate.major || '专业未填写'}</Tag>
                  {skills.map((skill) => (
                    <Tag key={skill}>{skill}</Tag>
                  ))}
                </Space>
              </Space>
            </Space>
          </Col>
          <Col span={8}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="综合评分"
                  value={chartAssessment.overallScore ? Number(chartAssessment.overallScore.toFixed(1)) : '--'}
                  suffix={chartAssessment.overallScore ? '/10' : ''}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={12}>
                <Statistic title="面试次数" value={totalInterviews} />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic
                  title="通过率"
                  value={passRate}
                  suffix="%"
                  valueStyle={{ color: passRate >= 60 ? '#52c41a' : '#faad14' }}
                />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic
                  title="最近面试"
                  valueRender={() => (
                    <div>
                      <div>{lastInterviewFormatted}</div>
                      {typeof lastInterviewScore === 'number' && (
                        <Text type="secondary">得分 {Number(lastInterviewScore.toFixed(1))}</Text>
                      )}
                    </div>
                  )}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Row gutter={24} align="stretch">
        <Col span={14}>
          <Card
            title="六维能力雷达图"
            loading={assessmentLoading && !assessment}
            bodyStyle={{ padding: 0 }}
          >
            <AbilityRadarChart
              assessment={chartAssessment}
              dimensions={abilityDimensions}
              title="能力模型"
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="能力拆解" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {abilityBreakdown.map((item) => (
                <div key={item.key}>
                  <Space style={{ marginBottom: 8 }}>
                    <Text strong>{item.label}</Text>
                    <Tag color={item.color}>{item.score.toFixed(1)}</Tag>
                  </Space>
                  <Progress
                    strokeColor={item.color}
                    percent={item.percent}
                    showInfo={false}
                  />
                </div>
              ))}
            </Space>
          </Card>

          <Card title="评估反馈" style={{ marginBottom: 24 }}>
            <Paragraph style={{ marginBottom: 0 }}>
              {assessment?.feedback || '暂无能力评估反馈，待生成后可查看详细信息。'}
            </Paragraph>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="优势亮点">
                {assessment?.strengths?.length ? (
                  <List
                    size="small"
                    dataSource={assessment.strengths}
                    renderItem={(item) => (
                      <List.Item>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">暂无数据</Text>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="提升建议">
                {assessment?.improvements?.length ? (
                  <List
                    size="small"
                    dataSource={assessment.improvements}
                    renderItem={(item) => (
                      <List.Item>
                        <ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">暂无数据</Text>
                )}
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={24} align="stretch">
        <Col span={16}>
          <Card title="面试历程">
            {sortedInterviews.length ? (
              <Timeline
                mode="left"
                items={sortedInterviews.map((interview) => {
                  const status = (interview.status || '').toLowerCase();
                  const result = (interview.result || '').toLowerCase();
                  const statusConfig = interviewStatusMap[status];
                  const resultConfig = interviewResultMap[result];
                  const color = result === 'passed' ? 'green' : result === 'failed' ? 'red' : 'blue';
                  const interviewTime = interview.startTime || interview.createdAt;

                  return {
                    color,
                    children: (
                      <div>
                        <Space align="baseline" size={12} wrap>
                          <Text strong style={{ fontSize: 16 }}>
                            {interview.job?.title || '未命名职位'}
                          </Text>
                          {statusConfig && <Tag color={statusConfig.color}>{statusConfig.text}</Tag>}
                          {resultConfig && <Tag color={resultConfig.color}>{resultConfig.text}</Tag>}
                        </Space>
                        <div style={{ margin: '8px 0', color: '#666' }}>
                          <CalendarOutlined style={{ marginRight: 6 }} />
                          {interviewTime ? dayjs(interviewTime).format('YYYY-MM-DD HH:mm') : '时间待定'}
                        </div>
                        <Space size={16} wrap>
                          {typeof interview.overallScore === 'number' && (
                            <Tag color="gold">综合 {interview.overallScore.toFixed(1)} 分</Tag>
                          )}
                          {typeof interview.score === 'number' && interview.overallScore === undefined && (
                            <Tag color="gold">得分 {interview.score.toFixed(1)} 分</Tag>
                          )}
                          {typeof interview.duration === 'number' && (
                            <Tag color="purple">时长 {interview.duration} 分钟</Tag>
                          )}
                        </Space>
                        {interview.reportSummary && (
                          <Paragraph type="secondary" style={{ marginTop: 8 }}>
                            {interview.reportSummary}
                          </Paragraph>
                        )}
                        <Button type="link" size="small" onClick={() => navigate(`/interviews/${interview.id}`)}>
                          查看详情
                        </Button>
                        <Divider style={{ margin: '12px 0' }} />
                      </div>
                    )
                  };
                })}
              />
            ) : (
              <Empty description="暂未产生面试记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="候选人档案" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space>
                <MailOutlined style={{ color: '#1890ff' }} />
                <Text>{candidate.email || '暂无邮箱'}</Text>
              </Space>
              <Space>
                <PhoneOutlined style={{ color: '#52c41a' }} />
                <Text>{candidate.phone || '暂无电话'}</Text>
              </Space>
              <Space>
                <CalendarOutlined style={{ color: '#722ed1' }} />
                <Text>
                  加入时间：
                  {candidate.createdAt ? dayjs(candidate.createdAt).format('YYYY-MM-DD') : '未知'}
                </Text>
              </Space>
              {candidate.updatedAt && (
                <Space>
                  <ClockCircleOutlined style={{ color: '#faad14' }} />
                  <Text>
                    最近更新：
                    {dayjs(candidate.updatedAt).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </Space>
              )}
            </Space>
          </Card>

          <Card title="推荐动作">
            <List>
              <List.Item>
                <List.Item.Meta
                  avatar={<StarFilled style={{ color: '#faad14' }} />}
                  title="安排复试"
                  description="根据候选人综合能力，建议安排更深入的一对一面试。"
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  avatar={<TeamOutlined style={{ color: '#1890ff' }} />}
                  title="发送能力报告"
                  description="向业务团队分享候选人的六维能力评估，评估业务匹配度。"
                />
              </List.Item>
              <List.Item>
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ color: '#52c41a' }} />}
                  title="邀请提交作品/案例"
                  description="如需补充技术深度，可邀请候选人提交案例或作品集。"
                />
              </List.Item>
            </List>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default CandidateDetail;
