import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleTwoTone, EditOutlined, ExclamationCircleTwoTone, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppPlatform, AppVersion, appVersionApi } from '../services/api';

type AppVersionForm = {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes?: string;
  isMandatory: boolean;
  isActive: boolean;
};

const { Title, Paragraph, Text } = Typography;

const defaultFormValues: AppVersionForm = {
  versionName: '',
  versionCode: 1,
  downloadUrl: '',
  releaseNotes: '',
  isMandatory: false,
  isActive: true
};

const AppVersionManagement: React.FC = () => {
  const [platform, setPlatform] = useState<AppPlatform>('ANDROID');
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [form] = Form.useForm<AppVersionForm>();

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await appVersionApi.getList({ platform, page, pageSize });
      if (response.success && response.data) {
        setVersions(response.data.list || []);
        setTotal(response.data.total || 0);
      } else {
        message.error(response.message || '获取版本列表失败');
      }
    } catch (error: any) {
      console.error('加载版本列表失败', error);
      message.error(error?.message || '加载版本列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [platform]);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, page, pageSize]);

  const openCreateModal = () => {
    setEditing(null);
    form.setFieldsValue({
      ...defaultFormValues,
      versionCode: Math.max(...versions.map((v) => v.versionCode), 0) + 1
    });
    setModalOpen(true);
  };

  const openEditModal = (record: AppVersion) => {
    setEditing(record);
    form.setFieldsValue({
      versionName: record.versionName,
      versionCode: record.versionCode,
      downloadUrl: record.downloadUrl,
      releaseNotes: record.releaseNotes || '',
      isMandatory: record.isMandatory,
      isActive: record.isActive
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        platform
      };

      const response = editing
        ? await appVersionApi.update(editing.id, payload)
        : await appVersionApi.create(payload);

      if (response.success) {
        message.success(editing ? '版本信息已更新' : '已创建新版本');
        setModalOpen(false);
        fetchList();
      } else {
        message.error(response.message || '保存版本信息失败');
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      console.error('保存版本信息失败', error);
      message.error(error?.message || '保存版本信息失败');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (record: AppVersion) => {
    setLoading(true);
    try {
      const response = await appVersionApi.activate(record.id);
      if (response.success) {
        message.success('已设为当前生效版本');
        fetchList();
      } else {
        message.error(response.message || '设置生效版本失败');
      }
    } catch (error: any) {
      console.error('设置生效版本失败', error);
      message.error(error?.message || '设置生效版本失败');
    } finally {
      setLoading(false);
    }
  };

  const currentActive = useMemo(
    () => versions.find((item) => item.isActive),
    [versions]
  );

  const columns: ColumnsType<AppVersion> = [
    {
      title: '版本号',
      dataIndex: 'versionName',
      render: (_, record) => (
        <Space size={4}>
          <Text strong>{record.versionName}</Text>
          <Tag color="blue">Code {record.versionCode}</Tag>
        </Space>
      )
    },
    {
      title: '平台',
      dataIndex: 'platform',
      render: (value) => (
        <Tag color={value === 'IOS' ? 'purple' : 'green'}>{value}</Tag>
      )
    },
    {
      title: '强制更新',
      dataIndex: 'isMandatory',
      render: (value: boolean) =>
        value ? (
          <Tag color="red">是</Tag>
        ) : (
          <Tag color="default">否</Tag>
        )
    },
    {
      title: '生效状态',
      dataIndex: 'isActive',
      render: (value: boolean) =>
        value ? <Badge status="success" text="生效中" /> : <Badge status="default" text="未生效" />
    },
    {
      title: '下载链接',
      dataIndex: 'downloadUrl',
      ellipsis: true,
      render: (value: string) => (
        <a href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      )
    },
    {
      title: '更新内容',
      dataIndex: 'releaseNotes',
      ellipsis: true,
      render: (value?: string | null) => value ? value : '—'
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          {!record.isActive && (
            <Button size="small" type="link" onClick={() => handleActivate(record)}>
              设为生效
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>应用版本管理</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          维护 App 版本号与强制更新标记，客户端启动时会调用 <Text code>/api/public/app-version</Text> 自动检测更新。
        </Paragraph>
      </div>

      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <Segmented<AppPlatform>
              value={platform}
              onChange={(value) => setPlatform(value as AppPlatform)}
              options={[
                { label: 'Android', value: 'ANDROID' },
                { label: 'iOS', value: 'IOS' }
              ]}
            />
            {currentActive ? (
              <Space size={8}>
                <CheckCircleTwoTone twoToneColor="#52c41a" />
                <span>当前生效版本：{currentActive.versionName} (Code {currentActive.versionCode})</span>
                {currentActive.isMandatory && <Tag color="red">强制</Tag>}
              </Space>
            ) : (
              <Space size={8}>
                <ExclamationCircleTwoTone twoToneColor="#faad14" />
                <span>暂无生效版本</span>
              </Space>
            )}
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新增版本
          </Button>
        }
      >
        <Table<AppVersion>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={versions}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            }
          }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? '编辑版本信息' : '新增版本'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={defaultFormValues}>
          <Form.Item
            label="版本号"
            name="versionName"
            rules={[{ required: true, message: '请输入版本号，例如 1.0.1' }]}
          >
            <Input placeholder="例如 1.0.1" />
          </Form.Item>
          <Form.Item
            label="版本Code"
            name="versionCode"
            rules={[{ required: true, type: 'number', min: 1, message: '请输入大于0的版本Code' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} precision={0} />
          </Form.Item>
          <Form.Item
            label="下载链接"
            name="downloadUrl"
            rules={[{ required: true, message: '请输入下载链接' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item label="更新内容" name="releaseNotes">
            <Input.TextArea rows={3} placeholder="可选，填写主要更新点" />
          </Form.Item>
          <Form.Item label="强制更新" name="isMandatory" valuePropName="checked">
            <Switch checkedChildren="强制" unCheckedChildren="可选" />
          </Form.Item>
          <Form.Item label="是否生效" name="isActive" valuePropName="checked">
            <Switch checkedChildren="生效" unCheckedChildren="不生效" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppVersionManagement;
