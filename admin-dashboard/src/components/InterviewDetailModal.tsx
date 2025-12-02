import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Tabs, 
  Card, 
  Avatar, 
  Tag, 
  Rate, 
  Button, 
  Space, 
  Descriptions,
  Timeline,
  List,
  Typography,
  Spin,
  message,
  Row,
  Col
} from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  MailOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FileTextOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { Interview, InterviewDetailResponse, InterviewQA } from '../types/interview';
import { interviewApi } from '../services/api';
import AbilityRadarChart from './AbilityRadarChart';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  interview: Interview | null;
  onClose: () => void;
  onPlayVideo?: (videoUrl: string) => void;
}

const InterviewDetailModal: React.FC<Props> = ({
  visible,
  interview,
  onClose,
  onPlayVideo
}) => {
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<InterviewDetailResponse | null>(null);

  // 获取详细数据
  useEffect(() => {
    if (visible && interview) {
      fetchDetailData();
    }
  }, [visible, interview]);

  const fetchDetailData = async () => {
    if (!interview) return;
    
    setLoading(true);
    try {
      const data = await interviewApi.getDetail(interview.id);
      setDetailData(data);
    } catch (error) {
      console.error('获取面试详情失败:', error);
      message.error('获取面试详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 状态标签配置
  const statusConfig = {
    'pending': { color: 'orange', text: '待面试' },
    'scheduled': { color: 'blue', text: '已安排' },
    'completed': { color: 'green', text: '已完成' },
    'cancelled': { color: 'red', text: '已取消' }
  };

  // 结果标签配置
  const resultConfig = {
    'pending': { color: 'default', text: '待评估' },
    'reviewing': { color: 'processing', text: '评估中' },
    'passed': { color: 'success', text: '通过' },
    'failed': { color: 'error', text: '未通过' }
  };

  // 获取问题类型的中文名称
  const getQuestionTypeName = (category: string) => {
    const map = {
      'technical': '技术问题',
      'behavioral': '行为问题',
      'situational': '情景问题',
      'general': '通用问题'
    };
    return map[category as keyof typeof map] || category;
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  if (!interview) return null;

  const { candidate } = interview;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            size={40} 
            src={candidate.avatar} 
            icon={<UserOutlined />}
            style={{ marginRight: '12px' }}
          />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {candidate.name} - 面试详情
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {interview.jobTitle} · {interview.department}
            </div>
          </div>
        </div>
      }
      visible={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        interview.videoUrl && (
          <Button 
            key="video" 
            type="primary" 
            icon={<VideoCameraOutlined />}
            onClick={() => onPlayVideo?.(interview.videoUrl!)}
          >
            查看面试视频
          </Button>
        )
      ].filter(Boolean)}
      bodyStyle={{ padding: '20px' }}
    >
      <Spin spinning={loading}>
        <Tabs defaultActiveKey="1" size="large">
          {/* 基本信息 */}
          <TabPane tab="基本信息" key="1" icon={<UserOutlined />}>
            <Row gutter={24}>
              <Col span={16}>
                <Card title="候选人信息" style={{ marginBottom: '20px' }}>
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="姓名">{candidate.name}</Descriptions.Item>
                    <Descriptions.Item label="年龄">{candidate.age}岁</Descriptions.Item>
                    <Descriptions.Item label="性别">
                      {candidate.gender === 'male' ? '男' : candidate.gender === 'female' ? '女' : '其他'}
                    </Descriptions.Item>
                    <Descriptions.Item label="手机">{candidate.phone}</Descriptions.Item>
                    <Descriptions.Item label="邮箱">{candidate.email}</Descriptions.Item>
                    <Descriptions.Item label="学历">{candidate.education}</Descriptions.Item>
                    <Descriptions.Item label="专业">{candidate.major}</Descriptions.Item>
                    <Descriptions.Item label="工作经验">{candidate.experience}年</Descriptions.Item>
                  </Descriptions>
                  
                  <div style={{ marginTop: '16px' }}>
                    <Text strong>技能标签：</Text>
                    <div style={{ marginTop: '8px' }}>
                      {candidate.skills.map((skill, index) => (
                        <Tag key={index} color="blue" style={{ margin: '2px' }}>
                          {skill}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card title="面试信息">
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="面试岗位">{interview.jobTitle}</Descriptions.Item>
                    <Descriptions.Item label="所属部门">{interview.department}</Descriptions.Item>
                    <Descriptions.Item label="面试时间">
                      {dayjs(interview.interviewDate).format('YYYY-MM-DD HH:mm')}
                    </Descriptions.Item>
                    <Descriptions.Item label="面试时长">{interview.duration}分钟</Descriptions.Item>
                    <Descriptions.Item label="面试状态">
                      <Tag color={statusConfig[interview.status]?.color}>
                        {statusConfig[interview.status]?.text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="面试结果">
                      <Tag color={resultConfig[interview.result]?.color}>
                        {resultConfig[interview.result]?.text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="面试评分" span={2}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Rate disabled value={Math.round(interview.score / 2)} />
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                          {interview.score.toFixed(1)}/10
                        </Text>
                      </div>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              
              <Col span={8}>
                <Card title="操作历史">
                  <Timeline>
                    <Timeline.Item 
                      color="blue" 
                      dot={<ClockCircleOutlined />}
                    >
                      <div>面试安排</div>
                      <Text type="secondary">
                        {dayjs(interview.createdAt).format('MM-DD HH:mm')}
                      </Text>
                    </Timeline.Item>
                    {interview.status === 'completed' && (
                      <Timeline.Item 
                        color="green" 
                        dot={<CheckCircleOutlined />}
                      >
                        <div>面试完成</div>
                        <Text type="secondary">
                          {dayjs(interview.updatedAt).format('MM-DD HH:mm')}
                        </Text>
                      </Timeline.Item>
                    )}
                    {interview.result === 'passed' && (
                      <Timeline.Item 
                        color="green" 
                        dot={<TrophyOutlined />}
                      >
                        <div>面试通过</div>
                        <Text type="secondary">通过面试评估</Text>
                      </Timeline.Item>
                    )}
                    {interview.result === 'failed' && (
                      <Timeline.Item 
                        color="red" 
                        dot={<CloseCircleOutlined />}
                      >
                        <div>面试未通过</div>
                        <Text type="secondary">未通过面试评估</Text>
                      </Timeline.Item>
                    )}
                  </Timeline>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 能力分析 */}
          <TabPane tab="能力分析" key="2" icon={<StarOutlined />}>
            {detailData?.assessment ? (
              <Row gutter={24}>
                <Col span={16}>
                  <AbilityRadarChart 
                    assessment={detailData.assessment}
                    title="综合能力评估"
                  />
                </Col>
                <Col span={8}>
                  <Card title="评估反馈" style={{ marginBottom: '20px' }}>
                    <Paragraph>
                      {detailData.assessment.feedback || '暂无评估反馈'}
                    </Paragraph>
                  </Card>
                  
                  <Card title="优势亮点" style={{ marginBottom: '20px' }}>
                    <List
                      size="small"
                      dataSource={detailData.assessment.strengths}
                      renderItem={(item) => (
                        <List.Item>
                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                          {item}
                        </List.Item>
                      )}
                    />
                  </Card>
                  
                  <Card title="改进建议">
                    <List
                      size="small"
                      dataSource={detailData.assessment.improvements}
                      renderItem={(item) => (
                        <List.Item>
                          <CloseCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />
                          {item}
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                能力评估数据正在生成中...
              </div>
            )}
          </TabPane>

          {/* 面试问答 */}
          <TabPane tab="面试问答" key="3" icon={<FileTextOutlined />}>
            {detailData?.qaList && detailData.qaList.length > 0 ? (
              <List
                dataSource={detailData.qaList}
                renderItem={(qa: InterviewQA, index) => (
                  <List.Item>
                    <Card 
                      style={{ width: '100%' }}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>问题 {index + 1}</span>
                          <Space>
                            <Tag color="purple">{getQuestionTypeName(qa.category)}</Tag>
                            <Text type="secondary">{formatDuration(qa.duration)}</Text>
                            <Rate disabled value={Math.round(qa.score / 2)} />
                            <Text strong>{qa.score}/10</Text>
                          </Space>
                        </div>
                      }
                    >
                      <div style={{ marginBottom: '16px' }}>
                        <Text strong>问题：</Text>
                        <Paragraph style={{ marginTop: '8px', marginBottom: '16px' }}>
                          {qa.question}
                        </Paragraph>
                      </div>
                      
                      <div style={{ marginBottom: '16px' }}>
                        <Text strong>回答：</Text>
                        <Paragraph style={{ marginTop: '8px', marginBottom: '16px' }}>
                          {qa.answer}
                        </Paragraph>
                      </div>
                      
                      {qa.feedback && (
                        <div>
                          <Text strong>评价：</Text>
                          <Paragraph style={{ marginTop: '8px', color: '#666' }}>
                            {qa.feedback}
                          </Paragraph>
                        </div>
                      )}
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                暂无面试问答记录
              </div>
            )}
          </TabPane>
        </Tabs>
      </Spin>
    </Modal>
  );
};

export default InterviewDetailModal; 