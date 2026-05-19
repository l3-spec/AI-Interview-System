import React, { useState } from 'react';
import { Card, Collapse, Progress, Row, Col, Tag, Typography } from 'antd';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { AbilityAssessment, ScoreLevel } from '../types/interview';

const { Text } = Typography;
const { Panel } = Collapse;

interface RadarDimension {
  key: keyof AbilityAssessment;
  label: string;
  icon?: string;
}

interface Props {
  assessment: AbilityAssessment;
  style?: React.CSSProperties;
  title?: string;
  dimensions?: RadarDimension[];
  showMultimodal?: boolean;
}

const defaultDimensions: RadarDimension[] = [
  { key: 'professionalAbilityScore', label: '专业能力', icon: '💡' },
  { key: 'learningGrowthScore', label: '学习成长', icon: '📈' },
  { key: 'communicationCollaborationScore', label: '沟通协作', icon: '🤝' },
  { key: 'problemSolvingScore', label: '问题解决', icon: '🧩' },
  { key: 'achievementExecutionScore', label: '成就执行', icon: '🎯' },
  { key: 'stressResilienceScore', label: '抗压韧性', icon: '🛡️' }
];

// 获取评分等级
const getScoreLevel = (score: number): ScoreLevel => {
  if (score >= 8) return '优秀';
  if (score >= 6) return '良好';
  if (score >= 4) return '一般';
  return '待提升';
};

// 获取等级对应的颜色
const getLevelColor = (level: ScoreLevel): string => {
  const map = {
    '优秀': '#52c41a',
    '良好': '#1890ff',
    '一般': '#faad14',
    '待提升': '#ff4d4f'
  };
  return map[level];
};

const AbilityRadarChart: React.FC<Props> = ({ 
  assessment, 
  style,
  title = '能力分析',
  dimensions = defaultDimensions,
  showMultimodal = true
}) => {
  const radarData = dimensions.map((dimension) => {
    // 优先用新字段，如果不存在则降级到旧字段保持兼容
    let rawScore = (assessment as unknown as Record<string, number>)[dimension.key];
    // 向后兼容：如果新字段不存在，尝试匹配旧字段或过渡字段
    if (typeof rawScore !== 'number' || !Number.isFinite(rawScore)) {
      const fallbackKeys: Record<string, string[]> = {
        professionalAbilityScore: ["technicalSkills"],
        learningGrowthScore: ["adaptability", "learningAbilityScore"],
        communicationCollaborationScore: ["communication", "teamwork"],
        problemSolvingScore: ["problemSolving"],
        achievementExecutionScore: ["leadership", "creativity"],
        stressResilienceScore: ["adaptability"]
      };
      const keys = fallbackKeys[dimension.key as string] || [];
      for (const key of keys) {
        const val = (assessment as unknown as Record<string, number>)[key];
        if (typeof val === "number" && Number.isFinite(val) && val > 0) {
          rawScore = val;
          break;
        }
      }
    }
    const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0;

    return {
      ability: dimension.label,
      score,
      fullMark: 10
    };
  });

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{`${label}`}</p>
          <p style={{ margin: 0, color: '#1890ff' }}>
            {`评分: ${payload[0].value}/10`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Card 
        title={title} 
        style={style}
        bodyStyle={{ padding: '20px' }}
      >
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid 
                gridType="polygon"
                stroke="#e0e0e0"
              />
              <PolarAngleAxis 
                dataKey="ability" 
                tick={{ fontSize: 12, fill: '#666' }}
                className="radar-axis"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tick={{ fontSize: 10, fill: '#999' }}
                tickCount={6}
              />
              <Radar
                name="能力评分"
                dataKey="score"
                stroke="#1890ff"
                fill="#1890ff"
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {/* 综合评分显示 */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          padding: '16px',
          backgroundColor: '#fafafa',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            综合评分
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: assessment.overallScore >= 8 ? '#52c41a' : 
                   assessment.overallScore >= 6 ? '#faad14' : '#ff4d4f'
          }}>
            {assessment.overallScore.toFixed(1)}
            <span style={{ fontSize: '16px', marginLeft: '4px' }}>/10</span>
          </div>
        </div>

        {/* 维度详情 可展开 */}
        <div style={{ marginTop: '20px' }}>
          <Collapse ghost defaultActiveKey={["1"]}>
            <Panel header="查看各维度详细评分" key="1">
              <Row gutter={[16, 16]}>
                {dimensions.map((dimension) => {
                  const rawScore = (assessment as unknown as Record<string, number>)[dimension.key] || 0;
                  const score = Number.isFinite(rawScore) ? rawScore : 0;
                  const level = getScoreLevel(score);
                  const detail = assessment.dimensionDetails?.[dimension.key];
                  
                  return (
                    <Col span={12} key={dimension.key}>
                      <Card size="small" style={{ height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            {dimension.icon && <span style={{ marginRight: '6px', fontSize: '16px' }}>{dimension.icon}</span>}
                            <Text strong>{dimension.label}</Text>
                          </div>
                          <Tag color={getLevelColor(level)}>{level}</Tag>
                        </div>
                        <Progress 
                          percent={score * 10} 
                          status={level === '待提升' ? 'exception' : 'active'}
                          strokeColor={getLevelColor(level)}
                          format={() => `${score.toFixed(1)}/10`}
                        />
                        {detail?.description && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            {detail.description}
                          </div>
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Panel>
          </Collapse>
        </div>
      </Card>

      {/* 多模态评估面板 */}
      {showMultimodal && assessment.multimodal && (
        <Card title="多模态行为分析" style={{ marginTop: '20px', ...style }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>😐 表情稳定性</Text>
                <Progress 
                  percent={assessment.multimodal.expressionStability * 10} 
                  strokeColor="#722ed1"
                  format={() => `${assessment.multimodal.expressionStability.toFixed(1)}/10`}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>👀 眼神接触</Text>
                <Progress 
                  percent={assessment.multimodal.eyeContact * 10} 
                  strokeColor="#1890ff"
                  format={() => `${assessment.multimodal.eyeContact.toFixed(1)}/10`}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>🎙️ 语气稳定性</Text>
                <Progress 
                  percent={assessment.multimodal.toneStability * 10} 
                  strokeColor="#52c41a"
                  format={() => `${assessment.multimodal.toneStability.toFixed(1)}/10`}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>🗣️ 语速流畅度</Text>
                <Progress 
                  percent={assessment.multimodal.speechFluency * 10} 
                  strokeColor="#fa8c16"
                  format={() => `${assessment.multimodal.speechFluency.toFixed(1)}/10`}
                />
              </div>
            </Col>
            <Col span={24}>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fafafa', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text strong>⏸️ 卡顿次数</Text>
                <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {assessment.multimodal.stutterCount} 次
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </>
  );
};

export default AbilityRadarChart; 
