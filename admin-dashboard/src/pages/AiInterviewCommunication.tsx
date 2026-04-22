import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Tabs,
  List,
  Typography,
  Timeline,
  message,
} from 'antd';
import { EyeOutlined, PlayCircleOutlined, CommentOutlined } from '@ant-design/icons';
import { companyAiInterviewApi } from '../services/api';

const { Text, Paragraph } = Typography;

interface SessionRow {
  id: string;
  userName?: string;
  userEmail?: string;
  jobTarget?: string;
  jobTitle?: string;
  status: string;
  createdAt: string;
}

interface ConvTurn {
  id?: string;
  sequence: number;
  speaker: string;
  avatarText?: string | null;
  candidateText?: string | null;
  candidateVideoUrl?: string | null;
  questionIndex?: number | null;
  createdAt: string;
}

const AiInterviewCommunication: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SessionRow[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [turns, setTurns] = useState<ConvTurn[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);

  const fetchList = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await companyAiInterviewApi.listSessions({ page, pageSize });
      if (res.success && res.data) {
        setList(res.data.list || []);
        setPagination({
          current: res.data.pagination?.page || page,
          pageSize: res.data.pagination?.pageSize || pageSize,
          total: res.data.pagination?.total || 0,
        });
      } else {
        message.error((res as any).message || '加载失败');
      }
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时拉取
  }, []);

  const openDetail = async (row: SessionRow) => {
    setActiveSession(row);
    setDetailOpen(true);
    setDetailLoading(true);
    setTurns([]);
    setQuestions([]);
    try {
      const res = await companyAiInterviewApi.getSessionDetail(row.id);
      if (res.success && res.data) {
        setTurns(res.data.conversationTurns || []);
        setQuestions(res.data.questions || []);
      } else {
        message.error((res as any).message || '获取详情失败');
      }
    } catch (e: any) {
      message.error(e?.message || '获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: '候选人', dataIndex: 'userName', key: 'userName', render: (t: string, r: SessionRow) => (
      <Space direction="vertical" size={0}>
        <Text strong>{t}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.userEmail}</Text>
      </Space>
    ) },
    { title: '职位', dataIndex: 'jobTitle', key: 'jobTitle', render: (t: string, r: SessionRow) => t || r.jobTarget || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const colors: Record<string, string> = { COMPLETED: 'green', IN_PROGRESS: 'blue', PREPARING: 'orange', CANCELLED: 'default' };
      return <Tag color={colors[s] || 'default'}>{s}</Tag>;
    } },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (t: string) => new Date(t).toLocaleString() },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, r: SessionRow) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => openDetail(r)}>沟通记录</Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="AI 面试沟通记录" extra={<CommentOutlined />}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns as any}
          dataSource={list}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, ps) => fetchList(p, ps || 10),
          }}
        />
      </Card>

      <Modal
        title={activeSession ? `${activeSession.userName} · 沟通上下文` : '沟通上下文'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中…</div>
        ) : (
          <Tabs
            items={[
              {
                key: 'conv',
                label: '沟通过程',
                children: (
                  <Timeline
                    items={turns.map((t) => ({
                      color: t.speaker === 'AVATAR' ? 'blue' : 'green',
                      children: (
                        <div>
                          <Tag color="default">#{t.sequence}</Tag>
                          <Tag>{t.speaker === 'AVATAR' ? '面试官/数字人' : '候选人'}</Tag>
                          {t.questionIndex != null && <Tag>题{t.questionIndex}</Tag>}
                          <div style={{ marginTop: 8 }}>
                            {t.avatarText && (
                              <Paragraph style={{ marginBottom: 8 }} copyable>{t.avatarText}</Paragraph>
                            )}
                            {t.candidateText && (
                              <Paragraph type="secondary" style={{ marginBottom: 8 }} copyable>
                                识别/作答文本：{t.candidateText}
                              </Paragraph>
                            )}
                            {t.candidateVideoUrl && (
                              <div style={{ marginTop: 8 }}>
                                <video
                                  src={t.candidateVideoUrl}
                                  controls
                                  playsInline
                                  style={{ width: '100%', maxHeight: 240, borderRadius: 8, background: '#000' }}
                                />
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<PlayCircleOutlined />}
                                  href={t.candidateVideoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  新窗口打开
                                </Button>
                              </div>
                            )}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(t.createdAt).toLocaleString()}
                          </Text>
                        </div>
                      ),
                    }))}
                  />
                ),
              },
              {
                key: 'qa',
                label: '题目与视频',
                children: (
                  <List
                    dataSource={questions}
                    locale={{ emptyText: '暂无题目数据' }}
                    renderItem={(q: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<><Tag>Q{q.index + 1}</Tag> {q.text}</>}
                          description={
                            <Space direction="vertical">
                              {q.answer && <Text>作答摘要：{q.answer}</Text>}
                              {q.videoUrl && (
                                <Button type="link" size="small" href={q.videoUrl} target="_blank" rel="noreferrer">
                                  视频
                                </Button>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default AiInterviewCommunication;
