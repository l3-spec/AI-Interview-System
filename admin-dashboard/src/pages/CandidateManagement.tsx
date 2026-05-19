import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  Tag,
  Avatar,
  Modal,
  Drawer,
  Form,
  DatePicker,
  Slider,
  Row,
  Col,
  Statistic,
  Divider,
  Rate,
  Typography,
  Badge,
  Tooltip,
  Collapse,
  Progress,
  Spin,
  message
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
  CalendarOutlined,
  TeamOutlined,
  StarOutlined,
  StarFilled,
  VideoCameraOutlined
} from '@ant-design/icons';
import { candidateApi, jobApi } from '../services/api';
import { Candidate, CandidateListParams, Job } from '../types/interview';
import InterviewDetailModal from '../components/InterviewDetailModal';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';

const { Option } = Select;
const { Search } = Input;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const CandidateManagement: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<CandidateListParams>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateDetailVisible, setCandidateDetailVisible] = useState(false);
  const [interviewModalVisible, setInterviewModalVisible] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>('');
  const [favoriteLoading, setFavoriteLoading] = useState<string[]>([]);
  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // 加载候选人列表
  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params: CandidateListParams = {
        page: currentPage,
        pageSize,
        ...filters
      };
      const response = await candidateApi.getList(params);
      setCandidates(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('加载候选人列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载职岗列表（用于筛选）
  const loadJobs = async () => {
    try {
      const response = await jobApi.getList({ pageSize: 100 });
      setJobs(response.data);
    } catch (error) {
      console.error('加载职岗列表失败:', error);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    loadJobs();
  }, []);

  // 处理搜索
  const handleSearch = (value: string) => {
    const newFilters = { 
      ...filters, 
      filters: { 
        ...filters.filters, 
        keyword: value 
      }
    };
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // 处理筛选
  const handleFilter = (values: any) => {
    const newFilters: CandidateListParams = {
      filters: {
        skills: values.skills,
        experience: values.experience,
        education: values.education,
        location: values.location,
        salary: values.salary
      }
    };
    setFilters(newFilters);
    setCurrentPage(1);
    setFilterVisible(false);
  };

  // 清除筛选
  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    setFilterVisible(false);
  };

  // 收藏/取消收藏候选人
  const handleFavorite = async (candidateId: string, isFavorite: boolean) => {
    setFavoriteLoading((prev) => [...prev, candidateId]);
    try {
      if (isFavorite) {
        await candidateApi.unfavorite(candidateId);
        message.success('取消收藏成功');
      } else {
        await candidateApi.favorite(candidateId);
        message.success('收藏成功');
      }
      loadCandidates();
    } catch (error) {
      message.error('操作失败');
    } finally {
      setFavoriteLoading((prev) => prev.filter(id => id !== candidateId));
    }
  };

  // 邀请面试
  const handleInviteInterview = (candidate: Candidate) => {
    Modal.confirm({
      title: '邀请面试',
      content: `确定要邀请 ${candidate.name} 参加面试吗？`,
      onOk: async () => {
        try {
          // 这里可以打开一个表单弹窗选择职岗和面试时间
          message.success('邀请发送成功');
        } catch (error) {
          message.error('邀请失败');
        }
      }
    });
  };

  // 查看候选人详情
  const showCandidateDetail = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCandidateDetailVisible(true);
    setAnalysisReport(null);
    setAnalysisLoading(true);
    try {
      const response = await candidateApi.getAnalysisReport(candidate.id);
      if (response.success && response.data?.hasReport) {
        setAnalysisReport(response.data);
      }
    } catch (error) {
      // 静默处理，分析报告不是必须的
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '候选人',
      key: 'candidate',
      width: 200,
      render: (record: Candidate) => (
        <Space>
          <Avatar 
            src={record.avatar} 
            icon={<UserOutlined />}
            size={40}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.age}岁 · {record.gender === 'male' ? '男' : '女'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 180,
      render: (record: Candidate) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <MailOutlined style={{ marginRight: '4px', color: '#1890ff' }} />
            <Text copyable style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
          <div>
            <PhoneOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
            <Text copyable style={{ fontSize: '12px' }}>{record.phone}</Text>
          </div>
        </div>
      )
    },
    {
      title: '教育背景',
      key: 'education',
      width: 150,
      render: (record: Candidate) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.education}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.major}
          </Text>
        </div>
      )
    },
    {
      title: '工作经验',
      dataIndex: 'experience',
      key: 'experience',
      width: 100,
      render: (experience: number) => (
        <Tag color="blue">{experience}年</Tag>
      )
    },
    {
      title: '技能标签',
      dataIndex: 'skills',
      key: 'skills',
      width: 200,
      render: (skills: string[]) => (
        <div>
          {(Array.isArray(skills) ? skills.slice(0, 3) : []).map(skill => (
            <Tag key={skill} style={{ marginBottom: '4px' }}>
              {skill}
            </Tag>
          ))}
          {Array.isArray(skills) && skills.length > 3 && (
            <Tag>+{skills.length - 3}</Tag>
          )}
        </div>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: () => (
        <Badge status="success" text="可面试" />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: Candidate) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => showCandidateDetail(record)}
            />
          </Tooltip>
          <Tooltip title="邀请面试">
            <Button 
              type="text" 
              icon={<CalendarOutlined />}
              onClick={() => handleInviteInterview(record)}
            />
          </Tooltip>
          <Tooltip title="收藏">
            <Button 
              type="text" 
              icon={<StarOutlined />}
              loading={favoriteLoading.includes(record.id)}
              onClick={() => handleFavorite(record.id, false)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 页面标题和统计 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总候选人数"
              value={total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待面试"
              value={156}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已收藏"
              value={23}
              prefix={<StarFilled />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月新增"
              value={47}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="搜索候选人姓名、邮箱、技能..."
              onSearch={handleSearch}
              style={{ width: '300px' }}
              enterButton
            />
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(true)}
              >
                高级筛选
              </Button>
              <Button onClick={clearFilters}>清除筛选</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 候选人列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={candidates}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            }
          }}
        />
      </Card>

      {/* 高级筛选抽屉 */}
      <Drawer
        title="高级筛选"
        placement="right"
        width={400}
        open={filterVisible}
        onClose={() => setFilterVisible(false)}
      >
        <Form
          layout="vertical"
          onFinish={handleFilter}
        >
          <Form.Item label="技能要求" name="skills">
            <Select
              mode="multiple"
              placeholder="选择技能标签"
              options={[
                { label: 'React', value: 'React' },
                { label: 'Vue', value: 'Vue' },
                { label: 'Java', value: 'Java' },
                { label: 'Python', value: 'Python' },
                { label: 'Node.js', value: 'Node.js' }
              ]}
            />
          </Form.Item>

          <Form.Item label="工作经验" name="experience">
            <Slider
              range
              min={0}
              max={20}
              marks={{
                0: '0年',
                5: '5年',
                10: '10年',
                20: '20年+'
              }}
            />
          </Form.Item>

          <Form.Item label="学历要求" name="education">
            <Select
              mode="multiple"
              placeholder="选择学历"
              options={[
                { label: '大专', value: '大专' },
                { label: '本科', value: '本科' },
                { label: '硕士', value: '硕士' },
                { label: '博士', value: '博士' }
              ]}
            />
          </Form.Item>

          <Form.Item label="期望薪资" name="salary">
            <Slider
              range
              min={0}
              max={50}
              step={5}
              marks={{
                0: '0K',
                15: '15K',
                30: '30K',
                50: '50K+'
              }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                应用筛选
              </Button>
              <Button onClick={clearFilters}>
                清除筛选
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* 候选人详情弹窗 */}
      <Modal
        title="候选人详情"
        open={candidateDetailVisible}
        onCancel={() => setCandidateDetailVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setCandidateDetailVisible(false)}>
            关闭
          </Button>,
          <Button key="interview" type="primary" icon={<CalendarOutlined />}>
            邀请面试
          </Button>
        ]}
      >
        {selectedCandidate && (
          <div>
            {/* 基本信息 */}
            <Row gutter={24}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar 
                    size={80} 
                    src={selectedCandidate.avatar}
                    icon={<UserOutlined />}
                  />
                  <div style={{ marginTop: '8px', fontWeight: 500 }}>
                    {selectedCandidate.name}
                  </div>
                </div>
              </Col>
              <Col span={18}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">邮箱:</Text>
                    <div>{selectedCandidate.email}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">电话:</Text>
                    <div>{selectedCandidate.phone}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">年龄:</Text>
                    <div>{selectedCandidate.age}岁</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">性别:</Text>
                    <div>{selectedCandidate.gender === 'male' ? '男' : '女'}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">学历:</Text>
                    <div>{selectedCandidate.education}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">专业:</Text>
                    <div>{selectedCandidate.major}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">工作经验:</Text>
                    <div>{selectedCandidate.experience}年</div>
                  </Col>
                </Row>
              </Col>
            </Row>

            <Divider />

            {/* 技能标签 */}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>技能标签:</Text>
              <div style={{ marginTop: '8px' }}>
                {(selectedCandidate?.skills ?? []).map(skill => (
                  <Tag key={skill} color="blue" style={{ marginBottom: '4px' }}>
                    {skill}
                  </Tag>
                ))}
              </div>
            </div>

            {/* 简历 */}
            {selectedCandidate.resume && (
              <div>
                <Text strong>简历:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Button icon={<EyeOutlined />} type="link">
                    查看简历
                  </Button>
                </div>
              </div>
            )}

            {/* AI面试分析报告 */}
            {analysisLoading && (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Spin tip="加载分析报告..." />
              </div>
            )}
            {!analysisLoading && analysisReport?.hasReport && (
              <>
                <Divider />
                <div style={{ marginBottom: '16px' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong style={{ fontSize: '16px' }}>
                        📊 AI面试分析报告
                      </Text>
                    </Col>
                    <Col>
                      <Tag color="blue">{analysisReport.jobTarget}</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {analysisReport.completedAt ? new Date(analysisReport.completedAt).toLocaleDateString() : ''}
                      </Text>
                    </Col>
                  </Row>
                </div>
                {/* 雷达图 */}
                <div style={{ width: '100%', height: 300, marginBottom: '16px' }}>
                  <ResponsiveContainer>
                    <RadarChart data={[
                      { ability: '专业能力', score: analysisReport.report.newDimensionScores.professionalAbilityScore, fullMark: 10 },
                      { ability: '学习成长', score: analysisReport.report.newDimensionScores.learningGrowthScore, fullMark: 10 },
                      { ability: '沟通协作', score: analysisReport.report.newDimensionScores.communicationCollaborationScore, fullMark: 10 },
                      { ability: '问题解决', score: analysisReport.report.newDimensionScores.problemSolvingScore, fullMark: 10 },
                      { ability: '成就执行', score: analysisReport.report.newDimensionScores.achievementExecutionScore, fullMark: 10 },
                      { ability: '抗压韧性', score: analysisReport.report.newDimensionScores.stressResilienceScore, fullMark: 10 },
                    ]}>
                      <PolarGrid gridType="polygon" />
                      <PolarAngleAxis dataKey="ability" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 10]} tickCount={6} />
                      <Radar name="能力评分" dataKey="score" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* 综合评分 */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <Statistic
                    title="综合评分"
                    value={analysisReport.report.overallScore}
                    suffix="/ 100"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </div>
                {/* 维度详情 */}
                <Collapse ghost items={[{
                  key: 'dimensions',
                  label: '查看各维度详细评分',
                  children: (
                    <Row gutter={[12, 12]}>
                      {(analysisReport.report.competenciesDetailed || []).map((d: any) => (
                        <Col span={12} key={d.key}>
                          <Card size="small">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong>{d.name}</Text>
                              <Tag color={d.score >= 9 ? 'green' : d.score >= 7.5 ? 'blue' : d.score >= 6 ? 'orange' : 'red'}>
                                {d.level || (d.score >= 9 ? '优秀' : d.score >= 7.5 ? '良好' : d.score >= 6 ? '一般' : '待提升')}
                              </Tag>
                            </div>
                            <Progress percent={d.score * 10} size="small" />
                            {d.description && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>{d.description}</Text>
                            )}
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )
                }]} />
                {/* 优势与改进 */}
                {(analysisReport.report.strengths?.length > 0 || analysisReport.report.improvements?.length > 0) && (
                  <Row gutter={16} style={{ marginTop: '16px' }}>
                    <Col span={12}>
                      <Text strong style={{ color: '#52c41a' }}>✅ 优势</Text>
                      <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                        {(analysisReport.report.strengths || []).map((s: string, i: number) => (
                          <li key={i}><Text>{s}</Text></li>
                        ))}
                      </ul>
                    </Col>
                    <Col span={12}>
                      <Text strong style={{ color: '#faad14' }}>🔧 改进建议</Text>
                      <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                        {(analysisReport.report.improvements || []).map((s: string, i: number) => (
                          <li key={i}><Text>{s}</Text></li>
                        ))}
                      </ul>
                    </Col>
                  </Row>
                )}
                {/* Tips */}
                {analysisReport.report.tips && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '8px' }}>
                    <Text strong>💡 职场Tips：</Text>
                    <Text>{analysisReport.report.tips}</Text>
                  </div>
                )}
                {/* 历史报告 */}
                {analysisReport.reportHistory?.length > 0 && (
                  <>
                    <Divider />
                    <Text strong>📋 历史面试报告</Text>
                    <Table
                      style={{ marginTop: '8px' }}
                      size="small"
                      pagination={false}
                      dataSource={analysisReport.reportHistory}
                      rowKey="sessionId"
                      columns={[
                        { title: '面试职位', dataIndex: 'jobTarget', key: 'jobTarget' },
                        { title: '综合评分', dataIndex: 'overallScore', key: 'overallScore', render: (v: number) => <Tag color="blue">{v}</Tag> },
                        { title: '完成时间', dataIndex: 'completedAt', key: 'completedAt', render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
                        { title: '状态', dataIndex: 'analysisStatus', key: 'analysisStatus', render: (v: string) => <Tag color={v === 'COMPLETED' ? 'green' : 'orange'}>{v}</Tag> }
                      ]}
                    />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 面试详情弹窗 */}
      {interviewModalVisible && (
        <InterviewDetailModal
          interview={null}
          visible={interviewModalVisible}
          onClose={() => setInterviewModalVisible(false)}
        />
      )}
    </div>
  );
};

export default CandidateManagement; 
