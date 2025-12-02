import React from 'react';
import { Card } from 'antd';
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
import { AbilityAssessment } from '../types/interview';

interface RadarDimension {
  key: keyof AbilityAssessment;
  label: string;
}

interface Props {
  assessment: AbilityAssessment;
  style?: React.CSSProperties;
  title?: string;
  dimensions?: RadarDimension[];
}

const defaultDimensions: RadarDimension[] = [
  { key: 'technicalSkills', label: '技术能力' },
  { key: 'communication', label: '沟通能力' },
  { key: 'problemSolving', label: '问题解决' },
  { key: 'teamwork', label: '团队协作' },
  { key: 'leadership', label: '领导力' },
  { key: 'creativity', label: '创新能力' },
  { key: 'adaptability', label: '适应能力' }
];

const AbilityRadarChart: React.FC<Props> = ({ 
  assessment, 
  style,
  title = '能力分析',
  dimensions = defaultDimensions
}) => {
  const radarData = dimensions.map((dimension) => {
    const rawScore = (assessment as unknown as Record<string, number>)[dimension.key];
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
    </Card>
  );
};

export default AbilityRadarChart; 
