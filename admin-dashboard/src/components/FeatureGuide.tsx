import React, { useState } from 'react';
import { Card, Button, Tour, TourProps } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface Props {
  onClose?: () => void;
}

const FeatureGuide: React.FC<Props> = ({ onClose }) => {
  const [open, setOpen] = useState(false);

  const steps: TourProps['steps'] = [
    {
      title: '面试者管理',
      description: '这是AI面试系统的企业管理后台，您可以在这里管理所有的面试者和面试记录。',
      target: () => document.querySelector('.ant-layout-header') as HTMLElement,
    },
    {
      title: '统计概览',
      description: '查看面试数据的关键指标，包括总面试数、完成率、通过率和各部门统计。',
      target: () => document.querySelector('[data-tour="stats"]') as HTMLElement,
    },
    {
      title: '筛选功能',
      description: '使用多种筛选条件快速找到目标候选人，包括状态、结果、部门、时间范围和评分。',
      target: () => document.querySelector('[data-tour="filters"]') as HTMLElement,
    },
    {
      title: '视图切换',
      description: '在表格视图和卡片视图之间切换，选择最适合您的浏览方式。',
      target: () => document.querySelector('[data-tour="view-mode"]') as HTMLElement,
    },
    {
      title: '详细操作',
      description: '点击候选人可以查看详细信息、能力分析和面试问答记录。',
      target: () => document.querySelector('.ant-table-tbody tr:first-child') as HTMLElement,
    },
  ];

  return (
    <>
      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        onClick={() => setOpen(true)}
        style={{ color: '#1890ff' }}
      >
        功能指南
      </Button>
      
      <Tour
        open={open}
        onClose={() => setOpen(false)}
        steps={steps}
        indicatorsRender={(current, total) => (
          <span>{current + 1} / {total}</span>
        )}
      />
    </>
  );
};

export default FeatureGuide; 