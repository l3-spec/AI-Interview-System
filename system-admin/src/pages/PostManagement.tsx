import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  Image,
  Upload,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Divider,
  Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { postAdminApi, UserPostAdmin } from '../services/api';
import { SearchOutlined, ReloadOutlined, EyeOutlined, StopOutlined, CheckOutlined, FireOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadApi } from '../services/api';
import { config } from '../config/config';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const statusColors: Record<string, string> = {
  PUBLISHED: 'green',
  PENDING: 'blue',
  REJECTED: 'red',
  HIDDEN: 'orange',
  DELETED: 'default',
  BANNED: 'magenta',
  DRAFT: 'cyan',
};

const statusOptions = [
  { value: 'ALL', label: '全部状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'HIDDEN', label: '已下架' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'BANNED', label: '已封禁' },
  { value: 'DELETED', label: '已删除' },
];

const PostManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<UserPostAdmin[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [hotFilter, setHotFilter] = useState<'all' | 'hot' | 'normal'>('all');
  const [keyword, setKeyword] = useState('');
  const [detailPost, setDetailPost] = useState<UserPostAdmin | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<UserPostAdmin | null>(null);
  const [editForm] = Form.useForm();
  const [editContent, setEditContent] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [imageList, setImageList] = useState<string[]>([]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        pageSize,
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (hotFilter === 'hot') params.isHot = true;
      if (hotFilter === 'normal') params.isHot = false;
      if (keyword.trim()) params.keyword = keyword.trim();

      const res = await postAdminApi.getPosts(params);
      if (res.success && res.data) {
        setPosts(res.data.list);
        setTotal(res.data.total);
      } else {
        message.error(res.message || '获取帖子列表失败');
      }
    } catch (error) {
      console.error('fetch posts failed', error);
      message.error('获取帖子列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, hotFilter]);

  const handleUpdateStatus = async (postId: string, status: string, banUser = false) => {
    try {
      const res = await postAdminApi.updateStatus(postId, { status, banUser });
      if (res.success) {
        message.success('状态已更新');
        fetchPosts();
      } else {
        message.error(res.message || '状态更新失败');
      }
    } catch (error) {
      console.error('update status failed', error);
      message.error('状态更新失败');
    }
  };

  const handleHotToggle = async (postId: string, isHot: boolean) => {
    try {
      const res = await postAdminApi.updateHot(postId, isHot);
      if (res.success) {
        message.success('热门状态已更新');
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isHot } : p))
        );
      } else {
        message.error(res.message || '更新失败');
      }
    } catch (error) {
      console.error('update hot failed', error);
      message.error('更新失败');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const res = await postAdminApi.deletePost(postId);
      if (res.success) {
        message.success('帖子已下架');
        fetchPosts();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (error) {
      console.error('delete post failed', error);
      message.error('操作失败');
    }
  };

  const openDetail = (record: UserPostAdmin) => {
    setDetailPost(record);
    setDetailVisible(true);
  };

  const openEdit = (record: UserPostAdmin) => {
    setEditingPost(record);
    setEditVisible(true);
    setEditContent(record.content || '');
    setCoverUrl(record.coverImage || undefined);
    setImageList(record.images || []);
    editForm.setFieldsValue({
      title: record.title,
      tags: record.tags,
      status: record.status,
      isHot: record.isHot,
    });
  };

  const handleCoverUpload = async (file: File) => {
    const res = await uploadApi.uploadFile(file, 'banner');
    if (res.success && res.data?.url) {
      setCoverUrl(res.data.url);
      message.success('封面上传成功');
    } else {
      message.error(res.message || '封面上传失败');
    }
  };

  const handleImageUpload = async (file: File) => {
    const res = await uploadApi.uploadFile(file, 'banner');
    if (res.success && res.data?.url) {
      setImageList((prev) => [...prev, res.data!.url]);
      message.success('图片上传成功');
    } else {
      message.error(res.message || '图片上传失败');
    }
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingPost) return;
      const payload = {
        title: values.title.trim(),
        tags: values.tags || [],
        status: values.status,
        isHot: values.isHot,
        coverImage: coverUrl,
        images: imageList,
        content: editContent,
      };
      const res = await postAdminApi.updatePost(editingPost.id, payload);
      if (res.success) {
        message.success('帖子已更新');
        setEditVisible(false);
        fetchPosts();
      } else {
        message.error(res.message || '更新失败');
      }
    } catch (error) {
      console.error('edit submit failed', error);
    }
  };

  const statusTag = (status: string) => {
    const color = statusColors[status] || 'default';
    return <Tag color={color}>{status}</Tag>;
  };

  const columns: ColumnsType<UserPostAdmin> = useMemo(
    () => [
      {
        title: '封面',
        key: 'cover',
        render: (_, record) =>
          record.coverImage ? (
            <Image
              src={record.coverImage.startsWith('http') ? record.coverImage : `${config.API_BASE_URL}${record.coverImage}`}
              width={70}
              height={100}
              style={{ objectFit: 'cover', borderRadius: 8 }}
              fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
            />
          ) : (
            <Tag color="default">无封面</Tag>
          ),
      },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (_, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{record.title}</Text>
            <Space size={4}>
              {record.tags?.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Space>
        ),
      },
      {
        title: '作者',
        dataIndex: 'user',
        key: 'user',
        render: (user) =>
          user ? (
            <Space direction="vertical" size={0}>
              <Text>{user.name || '未设置'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
              <Tag color={user.isActive ? 'green' : 'red'}>{user.isActive ? '活跃' : '封禁'}</Tag>
            </Space>
          ) : (
            <Text type="secondary">匿名</Text>
          ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value) => statusTag(value),
      },
      {
        title: '互动',
        key: 'stats',
        render: (_, record) => (
          <Space size={8}>
            <Badge color="blue" text={`浏览 ${record.viewCount}`} />
            <Badge color="purple" text={`点赞 ${record.likeCount}`} />
            <Badge color="geekblue" text={`评论 ${record.commentCount}`} />
          </Space>
        ),
      },
      {
        title: '热门',
        dataIndex: 'isHot',
        key: 'isHot',
        render: (value, record) => (
          <Switch checked={value} onChange={(checked) => handleHotToggle(record.id, checked)} />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space size={8} wrap>
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
              查看
            </Button>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleUpdateStatus(record.id, 'PUBLISHED')}>
              通过
            </Button>
            <Button size="small" danger onClick={() => handleUpdateStatus(record.id, 'REJECTED')}>
              驳回
            </Button>
            <Button size="small" onClick={() => handleUpdateStatus(record.id, 'HIDDEN')}>
              下架
            </Button>
            {record.user?.id && (
              <Popconfirm
                title="封禁用户"
                description="确认封禁该发布用户？"
                onConfirm={() => handleUpdateStatus(record.id, record.status, true)}
              >
                <Button size="small" icon={<StopOutlined />} danger>
                  封禁用户
                </Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="删除帖子"
              description="确认将帖子标记为删除？"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" icon={<FireOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleHotToggle]
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>帖子管理</Title>
        <Text type="secondary">审核、下架、封禁用户并管理热门状态</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="按标题/内容搜索"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
              onPressEnter={() => { setPage(1); fetchPosts(); }}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select value={statusFilter} style={{ width: '100%' }} onChange={(v) => { setStatusFilter(v); setPage(1); }}>
              {statusOptions.map((item) => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={5}>
            <Select value={hotFilter} style={{ width: '100%' }} onChange={(v) => { setHotFilter(v); setPage(1); }}>
              <Option value="all">全部热度</Option>
              <Option value="hot">仅热门</Option>
              <Option value="normal">非热门</Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Button type="primary" onClick={() => { setPage(1); fetchPosts(); }} icon={<SearchOutlined />}>搜索</Button>
              <Button onClick={() => { setKeyword(''); setStatusFilter('ALL'); setHotFilter('all'); setPage(1); fetchPosts(); }} icon={<ReloadOutlined />}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table<UserPostAdmin>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={posts}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      <Modal
        open={detailVisible}
        title={detailPost?.title}
        footer={null}
        onCancel={() => setDetailVisible(false)}
        width={800}
      >
            {detailPost && (
              <div>
                {detailPost.coverImage && (
                  <div style={{ marginBottom: 12 }}>
                    <Image
                      src={
                        detailPost.coverImage.startsWith('http')
                          ? detailPost.coverImage
                          : `${config.API_BASE_URL}${detailPost.coverImage}`
                      }
                      width={260}
                      height={360}
                      style={{ objectFit: 'cover', borderRadius: 10 }}
                      fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                    />
                  </div>
                )}
            <Space style={{ marginBottom: 12 }}>
              {statusTag(detailPost.status)}
              {detailPost.isHot && <Tag color="red">热门</Tag>}
              <Text type="secondary">{dayjs(detailPost.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
            </Space>
            <Paragraph>
              <div
                style={{ lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: detailPost.content || '' }}
              />
            </Paragraph>
            {detailPost.images && detailPost.images.length > 0 && (
                  <>
                    <Divider>附图</Divider>
                    <Space wrap>
                      {detailPost.images.map((img) => (
                        <Image
                          key={img}
                          src={img.startsWith('http') ? img : `${config.API_BASE_URL}${img}`}
                          width={160}
                          height={220}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                          fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                        />
                      ))}
                    </Space>
                  </>
                )}
            <Space wrap>
              {detailPost.tags?.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}
      </Modal>

      <Modal
        open={editVisible}
        title="编辑帖子"
        onCancel={() => setEditVisible(false)}
        onOk={handleEditSubmit}
        width={900}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签后回车" />
          </Form.Item>
          <Form.Item label="封面图">
            <Space align="start">
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  handleCoverUpload(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>上传封面</Button>
              </Upload>
              {coverUrl && (
                <Image
                  src={coverUrl.startsWith('http') ? coverUrl : `${config.API_BASE_URL}${coverUrl}`}
                  width={180}
                  height={240}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                />
              )}
            </Space>
          </Form.Item>
          <Form.Item label="正文图片">
            <Upload
              multiple
              showUploadList={false}
              beforeUpload={(file) => {
                handleImageUpload(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            {imageList.length > 0 && (
              <Space wrap style={{ marginTop: 8 }}>
                {imageList.map((img) => (
                  <div key={img} style={{ position: 'relative' }}>
                    <Image
                      src={img.startsWith('http') ? img : `${config.API_BASE_URL}${img}`}
                      width={120}
                      height={180}
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                      fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                    />
                    <Button
                      size="small"
                      danger
                      type="link"
                      style={{ position: 'absolute', top: 0, right: 0 }}
                      onClick={() => setImageList((prev) => prev.filter((i) => i !== img))}
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </Space>
            )}
          </Form.Item>
          <Form.Item label="内容 (富文本)">
            <ReactQuill theme="snow" value={editContent} onChange={setEditContent} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select>
              <Option value="PUBLISHED">已发布</Option>
              <Option value="PENDING">待审核</Option>
              <Option value="HIDDEN">已下架</Option>
              <Option value="REJECTED">已驳回</Option>
            </Select>
          </Form.Item>
          <Form.Item label="热门" name="isHot" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PostManagement;
