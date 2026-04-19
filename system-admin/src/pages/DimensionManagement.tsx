import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Switch,
  InputNumber,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
  Typography
} from 'antd';
import { SaveOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// 定义维度类型
interface Dimension {
  id: string;
  name: string;
  fieldName: string;
  icon: string;
  contentWeight: number;
  multimodalWeight: number;
  enabled: boolean;
}

// 默认维度配置（新6维度）
const defaultDimensions: Dimension[] = [
  {
    id: '1',
    name: '专业能力',
    fieldName: 'professionalAbilityScore',
    icon: '💡',
    contentWeight: 80,
    multimodalWeight: 20,
    enabled: true
  },
  {
    id: '2',
    name: '学习成长',
    fieldName: 'learningGrowthScore',
    icon: '📈',
    contentWeight: 80,
    multimodalWeight: 20,
    enabled: true
  },
  {
    id: '3',
    name: '沟通协作',
    fieldName: 'communicationCollaborationScore',
    icon: '🤝',
    contentWeight: 80,
    multimodalWeight: 20,
    enabled: true
  },
  {
    id: '4',
    name: '问题解决',
    fieldName: 'problemSolvingScore',
    icon: '🧩',
    contentWeight: 80,
    multimodalWeight: 20,
    enabled: true
  },
  {
    id: '5',
    name: '成就执行',
    fieldName: 'achievementExecutionScore',
    icon: '🎯',
    contentWeight: 80,
    multimodalWeight: 20,
    enabled: true
  },
  {
    id: '6',
    name: '抗压韧性',
    fieldName: 'stressResilienceScore',
    icon: '🛡️',
    contentWeight: 20,
    multimodalWeight: 80,
    enabled: true
  }
];

const DimensionManagement: React.FC = () => {
  const [dimensions, setDimensions] = useState<Dimension[]>(defaultDimensions);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const isEditing = (record: Dimension) => record.id === editingKey;

  // 编辑行
  const edit = (record: Dimension) => {
    setEditingKey(record.id);
    form.setFieldsValue({
      ...record
    });
  };

  // 保存编辑
  const save = async (id: string) => {
    try {
      const row = (await form.validateFields()) as Dimension;
      
      const newData = [...dimensions];
      const index = newData.findIndex(item => id === item.id);
      
      if (index > -1) {
        const item = newData[index];
        // 校验权重和为100
        if (row.contentWeight + row.multimodalWeight !== 100) {
          message.error('内容权重 + 多模态权重 必须等于100');
          return;
        }
        newData.splice(index, 1, { ...item, ...row });
        setDimensions(newData);
        setEditingKey(null);
        message.success('配置保存成功');
      }
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo);
    }
  };

  // 取消编辑
  const cancel = () => {
    setEditingKey(null);
  };

  // 切换维度启用状态
  const toggleDimension = (id: string, enabled: boolean) => {
    const newData = dimensions.map(item => {
      if (item.id === id) {
        return { ...item, enabled };
      }
      return item;
    });
    setDimensions(newData);
    message.success(`维度已${enabled ? '启用' : '禁用'}`);
  };

  // 恢复默认配置
  const restoreDefaults = () => {
    setDimensions(defaultDimensions);
    message.success('已恢复默认配置');
  };

  // 保存全部配置
  const saveAll = () => {
    // 这里可以调用API保存到后端
    console.log('保存全部维度配置:', dimensions);
    message.success('全部配置保存成功');
  };

  const columns = [
    {
      title: '维度名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string, record: Dimension) => (
        <Space>
          <span style={{ fontSize: '20px' }}>{record.icon}</span>
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '字段名',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 250,
      render: (text: string) => <Text code>{text}</Text>
    },
    {
      title: '内容权重 (%)',
      dataIndex: 'contentWeight',
      key: 'contentWeight',
      width: 150,
      editable: true,
      render: (text: number, record: Dimension) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name="contentWeight"
            style={{ margin: 0 }}
            rules={[
              { required: true, message: '请输入内容权重' },
              { type: 'number', min: 0, max: 100, message: '权重范围0-100' }
            ]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <span>{text}%</span>
        );
      }
    },
    {
      title: '多模态权重 (%)',
      dataIndex: 'multimodalWeight',
      key: 'multimodalWeight',
      width: 150,
      editable: true,
      render: (text: number, record: Dimension) => {
        const editable = isEditing(record);
        return editable ? (
          <Form.Item
            name="multimodalWeight"
            style={{ margin: 0 }}
            rules={[
              { required: true, message: '请输入多模态权重' },
              { type: 'number', min: 0, max: 100, message: '权重范围0-100' }
            ]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          <span>{text}%</span>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: Dimension) => (
        <Switch
          checked={enabled}
          onChange={(checked) => toggleDimension(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Dimension) => {
        const editable = isEditing(record);
        return editable ? (
          <Space>
            <Button type="link" onClick={() => save(record.id)} style={{ padding: 0 }}>
              保存
            </Button>
            <Button type="link" onClick={cancel} style={{ padding: 0 }}>
              取消
            </Button>
          </Space>
        ) : (
          <Button type="link" icon={<EditOutlined />} disabled={editingKey !== null} onClick={() => edit(record)}>
            编辑
          </Button>
        );
      }
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>维度配置管理</Title>
        <Text type="secondary">配置面试评估的6个能力维度及权重分配</Text>
      </div>

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Text>共 {dimensions.length} 个维度，已启用 {dimensions.filter(d => d.enabled).length} 个</Text>
          </Col>
          <Col>
            <Space>
              <Popconfirm
                title="确定恢复默认配置吗？"
                description="所有自定义配置将被覆盖为初始默认值"
                onConfirm={restoreDefaults}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<ReloadOutlined />}>恢复默认</Button>
              </Popconfirm>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveAll}>
                保存全部配置
              </Button>
            </Space>
          </Col>
        </Row>

        <Form form={form} component={false}>
          <Table
            dataSource={dimensions}
            columns={columns}
            rowKey="id"
            bordered
            pagination={false}
          />
        </Form>

        <div style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <Text strong>💡 说明：</Text>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>内容权重：基于面试回答内容的评分占比</li>
            <li>多模态权重：基于视频表情、语气、肢体语言等非内容信息的评分占比</li>
            <li>每个维度的内容权重 + 多模态权重必须等于 100%</li>
            <li>禁用的维度将不会出现在面试评估和统计中</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default DimensionManagement;
