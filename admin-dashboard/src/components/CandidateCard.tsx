import React from 'react';
import { Card, Avatar, Tag, Rate, Button, Tooltip, Space } from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  MailOutlined,
  EyeOutlined,
  EditOutlined,
  VideoCameraOutlined,
  ClockCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { Interview } from '../types/interview';
import dayjs from 'dayjs';

interface Props {
  interview: Interview;
  onView?: (interview: Interview) => void;
  onEdit?: (interview: Interview) => void;
  onPlayVideo?: (interview: Interview) => void;
  style?: React.CSSProperties;
}

const CandidateCard: React.FC<Props> = ({
  interview,
  onView,
  onEdit,
  onPlayVideo,
  style
}) => {
  const { candidate } = interview;

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

  // 计算评分星级
  const getScoreStars = (score: number) => {
    return Math.round(score / 2); // 将10分制转换为5星制
  };

  // 格式化工作经验
  const formatExperience = (years: number) => {
    if (years === 0) return '应届生';
    if (years < 1) return '实习生';
    return `${years}年经验`;
  };

  return (
    <Card
      style={{ 
        ...style,
        borderRadius: '12px',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      hoverable
      bodyStyle={{ padding: '20px' }}
      actions={[
        <Tooltip title="查看详情" key="view">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              onView?.(interview);
            }}
          />
        </Tooltip>,
        <Tooltip title="编辑信息" key="edit">
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(interview);
            }}
          />
        </Tooltip>,
        interview.videoUrl && (
          <Tooltip title="查看面试视频" key="video">
            <Button 
              type="text" 
              icon={<VideoCameraOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onPlayVideo?.(interview);
              }}
            />
          </Tooltip>
        )
      ].filter(Boolean)}
      onClick={() => onView?.(interview)}
    >
      {/* 候选人头像和基本信息 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <Avatar 
            size={64} 
            src={candidate.avatar} 
            icon={<UserOutlined />}
            style={{ flexShrink: 0 }}
          />
          <div style={{ marginLeft: '16px', flex: 1 }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '4px',
              color: '#262626'
            }}>
              {candidate.name}
            </div>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>
              {candidate.major} · {formatExperience(candidate.experience)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Rate 
                disabled 
                value={getScoreStars(interview.score)} 
                style={{ fontSize: '14px' }}
              />
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                {interview.score.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#666' }}>
            <PhoneOutlined style={{ marginRight: '6px' }} />
            {candidate.phone}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#666' }}>
            <MailOutlined style={{ marginRight: '6px' }} />
            {candidate.email}
          </div>
        </Space>
      </div>

      {/* 岗位信息 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '6px',
          color: '#595959'
        }}>
          {interview.jobTitle}
        </div>
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
          {interview.department}
        </div>
      </div>

      {/* 面试时间和时长 */}
      <div style={{ marginBottom: '16px' }}>
        <Space size={16}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#666' }}>
            <ClockCircleOutlined style={{ marginRight: '4px' }} />
            {dayjs(interview.interviewDate).format('MM-DD HH:mm')}
          </div>
          {interview.duration > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#666' }}>
              <TrophyOutlined style={{ marginRight: '4px' }} />
              {interview.duration}分钟
            </div>
          )}
        </Space>
      </div>

      {/* 技能标签 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#8c8c8c', 
          marginBottom: '6px' 
        }}>
          技能标签
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {candidate.skills.slice(0, 3).map((skill, index) => (
            <Tag 
              key={index} 
              color="blue"
              style={{ margin: 0, fontSize: '11px', padding: '2px 6px', lineHeight: '18px' }}
            >
              {skill}
            </Tag>
          ))}
          {candidate.skills.length > 3 && (
            <Tag color="default" style={{ margin: 0, fontSize: '11px', padding: '2px 6px', lineHeight: '18px' }}>
              +{candidate.skills.length - 3}
            </Tag>
          )}
        </div>
      </div>

      {/* 状态标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tag color={statusConfig[interview.status]?.color}>
          {statusConfig[interview.status]?.text}
        </Tag>
        <Tag color={resultConfig[interview.result]?.color}>
          {resultConfig[interview.result]?.text}
        </Tag>
      </div>
    </Card>
  );
};

export default CandidateCard; 