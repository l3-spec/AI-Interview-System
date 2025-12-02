import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import {
  UserOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Interview } from '../types/interview';

interface Props {
  interviews: Interview[];
  style?: React.CSSProperties;
}

const InterviewStatsCards: React.FC<Props> = ({ interviews, style }) => {
  // 计算统计数据
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter(item => item.status === 'completed').length;
  const passedInterviews = interviews.filter(item => item.result === 'passed').length;
  const pendingInterviews = interviews.filter(item => item.status === 'pending' || item.status === 'scheduled').length;
  const reviewingInterviews = interviews.filter(item => item.result === 'reviewing').length;
  
  // 计算通过率
  const passRate = completedInterviews > 0 ? (passedInterviews / completedInterviews) * 100 : 0;
  
  // 计算平均分
  const completedWithScore = interviews.filter(item => item.status === 'completed' && item.score > 0);
  const averageScore = completedWithScore.length > 0 
    ? completedWithScore.reduce((sum, item) => sum + item.score, 0) / completedWithScore.length 
    : 0;

  // 按部门统计
  const departmentStats = interviews.reduce((acc, interview) => {
    const dept = interview.department;
    if (!acc[dept]) {
      acc[dept] = { total: 0, completed: 0, passed: 0 };
    }
    acc[dept].total++;
    if (interview.status === 'completed') {
      acc[dept].completed++;
      if (interview.result === 'passed') {
        acc[dept].passed++;
      }
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number; passed: number }>);

  return (
    <div style={style}>
      {/* 主要统计指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总面试数"
              value={totalInterviews}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedInterviews}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待面试"
              value={pendingInterviews}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="评估中"
              value={reviewingInterviews}
              prefix={<EyeOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="面试通过率" bodyStyle={{ padding: '24px 16px' }}>
            <div
              style={{
                height: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Progress
                type="circle"
                percent={Math.round(passRate)}
                width={120}
                format={(percent) => `${percent}%`}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                style={{ marginBottom: '16px' }}
              />
              <div style={{ fontSize: '14px', color: '#666' }}>
                {passedInterviews} / {completedInterviews} 通过
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="平均面试分数" bodyStyle={{ padding: '24px 16px' }}>
            <div
              style={{
                height: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ 
                fontSize: '48px', 
                fontWeight: 'bold',
                lineHeight: 1,
                color: averageScore >= 8 ? '#52c41a' : averageScore >= 6 ? '#faad14' : '#ff4d4f',
                marginBottom: '4px'
              }}>
                {averageScore.toFixed(1)}
              </div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                / 10.0
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                基于 {completedWithScore.length} 次已完成面试
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 部门统计 */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="部门面试统计">
            <Row gutter={[16, 16]}>
              {Object.entries(departmentStats).map(([dept, stats]) => (
                <Col key={dept} xs={24} sm={12} md={8} lg={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      {dept}
                    </div>
                    <Row gutter={8}>
                      <Col span={8}>
                        <Statistic
                          title="总数"
                          value={stats.total}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="完成"
                          value={stats.completed}
                          valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="通过"
                          value={stats.passed}
                          valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                        />
                      </Col>
                    </Row>
                    {stats.completed > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <Progress 
                          percent={Math.round((stats.passed / stats.completed) * 100)} 
                          size="small"
                          format={(percent) => `${percent}%`}
                        />
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InterviewStatsCards; 
