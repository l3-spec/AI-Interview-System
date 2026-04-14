import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Input,
  Drawer,
  Typography,
  Divider,
  message as antdMessage,
  Flex,
} from 'antd';
import dayjs from 'dayjs';
import { messageAdminApi, AdminMessageSummary, AdminMessageDetail } from '../services/api';

const { Text, Title } = Typography;
const { TextArea } = Input;

type FilterType = 'ALL' | 'INTERVIEW' | 'CHAT' | 'SYSTEM' | 'INTERACTION' | 'SUPPORT' | 'UNREAD';

const typeOptions: { label: string; value: FilterType }[] = [
  { label: '全部', value: 'ALL' },
  { label: '面试邀约', value: 'INTERVIEW' },
  { label: '沟通消息', value: 'CHAT' },
  { label: '系统通知', value: 'SYSTEM' },
  { label: '互动提醒', value: 'INTERACTION' },
  { label: '客服消息', value: 'SUPPORT' },
  { label: '未读', value: 'UNREAD' },
];

const typeColor: Record<string, string> = {
  INTERVIEW: 'geekblue',
  CHAT: 'cyan',
  SYSTEM: 'orange',
  INTERACTION: 'green',
  SUPPORT: 'purple',
  UNREAD: 'red',
};

const MessageManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AdminMessageSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminMessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchList = async (pageNum = page, size = pageSize) => {
    setLoading(true);
    const params: Record<string, any> = { page: pageNum, pageSize: size };
    if (filter !== 'ALL') {
      if (filter === 'UNREAD') params.status = 'UNREAD';
      else params.type = filter;
    }
    if (search.trim()) params.search = search.trim();
    const res = await messageAdminApi.getMessages(params);
    if (res.success && res.data) {
      setMessages(res.data.list);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPageSize(res.data.pageSize);
    } else {
      antdMessage.error(res.message || '加载消息列表失败');
    }
    setLoading(false);
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    const res = await messageAdminApi.getMessageDetail(id);
    if (res.success && res.data) {
      setDetail(res.data);
    } else {
      antdMessage.error(res.message || '加载消息详情失败');
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const onRowClick = (record: AdminMessageSummary) => {
    setSelectedId(record.id);
    fetchDetail(record.id);
  };

  const handleReply = async () => {
    if (!selectedId || !replyContent.trim()) {
      antdMessage.warning('请输入回复内容');
      return;
    }
    setReplyLoading(true);
    const res = await messageAdminApi.replyMessage(selectedId, replyContent.trim());
    if (res.success) {
      antdMessage.success('回复已发送');
      setReplyContent('');
      fetchDetail(selectedId);
      fetchList();
    } else {
      antdMessage.error(res.message || '回复失败');
    }
    setReplyLoading(false);
  };

  const columns = useMemo(() => [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (val: string, record: AdminMessageSummary) => (
        <Tag color={typeColor[val] || 'blue'}>
          {typeOptions.find((o) => o.value === val)?.label || val}
          {record.status === 'UNREAD' ? ' • 未读' : ''}
        </Tag>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      render: (_: any, record: AdminMessageSummary) => (
        <div>
          <div>{record.user?.name || '用户'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.user?.email}</Text>
        </div>
      ),
    },
    {
      title: '未读',
      dataIndex: 'unreadCount',
      key: 'unreadCount',
      width: 90,
    },
    {
      title: '更新时间',
      dataIndex: 'lastActivityAt',
      key: 'lastActivityAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
      width: 180,
    },
  ], [filter]);

  const renderEntries = () => {
    if (!detail || !detail.entries?.length) return <Text type="secondary">暂无消息</Text>;
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {detail.entries.map((entry) => {
          const isAdmin = entry.senderType !== 'USER';
          return (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                justifyContent: isAdmin ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  background: isAdmin ? '#ecf5ff' : '#f6f7fb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <Text strong>{entry.senderName || (isAdmin ? '管理员' : '用户')}</Text>
                <div style={{ margin: '4px 0' }}>{entry.content}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}
                </Text>
              </div>
            </div>
          );
        })}
      </Space>
    );
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card
        title="消息中心（面试邀约 / 沟通）"
        extra={
          <Space>
            <Select
              value={filter}
              onChange={(val) => setFilter(val)}
              options={typeOptions}
              style={{ width: 160 }}
            />
            <Input.Search
              allowClear
              placeholder="搜索标题/摘要"
              onSearch={() => fetchList(1)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            <Button onClick={() => fetchList(1)}>刷新</Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          dataSource={messages}
          columns={columns}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => fetchList(p, ps),
          }}
          onRow={(record) => ({
            onClick: () => onRowClick(record),
          })}
        />
      </Card>

      <Drawer
        width={520}
        title="会话详情"
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setDetail(null); }}
      >
        {detailLoading ? (
          <Text>加载中...</Text>
        ) : detail ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Title level={4} style={{ marginBottom: 4 }}>{detail.title}</Title>
              <Text type="secondary">
                {detail.user?.name} · {detail.user?.email}
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={typeColor[detail.type] || 'blue'}>
                  {typeOptions.find((o) => o.value === detail.type)?.label || detail.type}
                </Tag>
                {detail.status === 'UNREAD' && <Tag color="red">未读</Tag>}
              </div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            {renderEntries()}
            <Divider />
            <Flex vertical gap={8}>
              <TextArea
                rows={3}
                value={replyContent}
                placeholder="输入回复（将以系统/客服身份发送给用户）"
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <Button type="primary" loading={replyLoading} onClick={handleReply}>
                发送回复
              </Button>
            </Flex>
          </Space>
        ) : (
          <Text type="secondary">请选择左侧消息查看</Text>
        )}
      </Drawer>
    </Space>
  );
};

export default MessageManagement;
