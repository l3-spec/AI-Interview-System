import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Image,
  Upload,
  message,
  Popconfirm,
  Select,
  Row,
  Col,
  Typography,
  Badge,
  Tooltip,
  Tabs,
  Divider,
  Empty,
  Collapse
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  DragOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AssessmentCategory, Assessment, AssessmentQuestion, assessmentApi, uploadApi } from '../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const AssessmentManagement: React.FC = () => {
  // 分类管理状态
  const [categories, setCategories] = useState<AssessmentCategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [categoryFormVisible, setCategoryFormVisible] = useState(false);
  const [categoryForm] = Form.useForm();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // 测评管理状态
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentPage, setAssessmentPage] = useState(1);
  const [assessmentTotal, setAssessmentTotal] = useState(0);
  const [assessmentFormVisible, setAssessmentFormVisible] = useState(false);
  const [assessmentForm] = Form.useForm();
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 题目管理状态
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [questionFormVisible, setQuestionFormVisible] = useState(false);
  const [questionForm] = Form.useForm();
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [activeTab, setActiveTab] = useState('categories');

  // 加载分类列表
  const loadCategories = async () => {
    setCategoryLoading(true);
    try {
      const response = await assessmentApi.getCategories({
        page: categoryPage,
        pageSize: 20,
      });
      if (response.success && response.data) {
        setCategories(response.data.list || []);
        setCategoryTotal(response.data.total || 0);
      } else {
        message.error(response.message || '获取分类列表失败');
      }
    } catch (error: any) {
      console.error('loadCategories error:', error);
      message.error('网络错误，无法获取分类数据');
    } finally {
      setCategoryLoading(false);
    }
  };

  // 加载测评列表
  const loadAssessments = async () => {
    setAssessmentLoading(true);
    try {
      const params: Record<string, any> = {
        page: assessmentPage,
        pageSize: 20,
      };
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      if (statusFilter) params.status = statusFilter;
      if (searchKeyword) params.keyword = searchKeyword;

      const response = await assessmentApi.getAssessments(params);
      if (response.success && response.data) {
        setAssessments(response.data.list || []);
        setAssessmentTotal(response.data.total || 0);
      } else {
        message.error(response.message || '获取测评列表失败');
      }
    } catch (error: any) {
      console.error('loadAssessments error:', error);
      message.error('网络错误，无法获取测评数据');
    } finally {
      setAssessmentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategories();
    } else if (activeTab === 'assessments') {
      loadAssessments();
    }
  }, [activeTab, categoryPage, assessmentPage, selectedCategoryId, statusFilter, searchKeyword]);

  // 分类表单提交
  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategoryId) {
        const response = await assessmentApi.updateCategory(editingCategoryId, values);
        if (!response.success) {
          message.error(response.message || '更新分类失败');
          return;
        }
        message.success('分类更新成功');
      } else {
        const response = await assessmentApi.createCategory(values);
        if (!response.success) {
          message.error(response.message || '创建分类失败');
          return;
        }
        message.success('分类创建成功');
      }
      setCategoryFormVisible(false);
      categoryForm.resetFields();
      setEditingCategoryId(null);
      loadCategories();
    } catch (error: any) {
      if (error.errorFields) return;
      console.error('handleCategorySubmit error:', error);
      message.error('操作失败，请稍后再试');
    }
  };

  // 删除分类
  const handleDeleteCategory = async (category: AssessmentCategory) => {
    try {
      const response = await assessmentApi.deleteCategory(category.id);
      if (!response.success) {
        message.error(response.message || '删除失败');
        return;
      }
      message.success('删除成功');
      loadCategories();
    } catch (error: any) {
      console.error('handleDeleteCategory error:', error);
      message.error('删除失败，请稍后再试');
    }
  };

  // 测评表单提交
  const handleAssessmentSubmit = async () => {
    try {
      const values = await assessmentForm.validateFields();
      const { guidelinesText, ...restValues } = values;
      const guidelineLines = guidelinesText
        ? guidelinesText
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0)
        : [];
      const payload = {
        ...restValues,
        guidelines: guidelineLines,
        tags: restValues.tags ? (Array.isArray(restValues.tags) ? restValues.tags : restValues.tags.split(',').map((t: string) => t.trim())) : [],
      };

      if (editingAssessmentId) {
        const response = await assessmentApi.updateAssessment(editingAssessmentId, payload);
        if (!response.success) {
          message.error(response.message || '更新测评失败');
          return;
        }
        message.success('测评更新成功');
      } else {
        const response = await assessmentApi.createAssessment(payload);
        if (!response.success) {
          message.error(response.message || '创建测评失败');
          return;
        }
        message.success('测评创建成功');
      }
      setAssessmentFormVisible(false);
      assessmentForm.resetFields();
      setEditingAssessmentId(null);
      loadAssessments();
    } catch (error: any) {
      if (error.errorFields) return;
      console.error('handleAssessmentSubmit error:', error);
      message.error('操作失败，请稍后再试');
    }
  };

  // 编辑测评并加载题目
  const handleEditAssessment = async (assessment: Assessment) => {
    setEditingAssessmentId(assessment.id);
    try {
      const response = await assessmentApi.getAssessmentDetail(assessment.id);
      if (response.success && response.data) {
        const detail = response.data;
        assessmentForm.setFieldsValue({
          categoryId: detail.categoryId,
          title: detail.title,
          description: detail.description || '',
          coverImage: detail.coverImage || '',
          durationMinutes: detail.durationMinutes,
          difficulty: detail.difficulty,
          tags: detail.tags || [],
          guidelinesText: (detail.guidelines || []).join('\n'),
          status: detail.status,
          isHot: detail.isHot,
        });
        setQuestions(detail.questions || []);
        setCurrentAssessment(detail);
        setAssessmentFormVisible(true);
      }
    } catch (error: any) {
      console.error('handleEditAssessment error:', error);
      message.error('获取测评详情失败');
    }
  };

  // 查看测评详情
  const handleViewAssessment = async (assessment: Assessment) => {
    try {
      const response = await assessmentApi.getAssessmentDetail(assessment.id);
      if (response.success && response.data) {
        setCurrentAssessment(response.data);
        setQuestions(response.data.questions || []);
        assessmentForm.setFieldsValue({
          categoryId: response.data.categoryId,
          title: response.data.title,
          description: response.data.description || '',
          coverImage: response.data.coverImage || '',
          durationMinutes: response.data.durationMinutes,
          difficulty: response.data.difficulty,
          tags: response.data.tags || [],
          guidelinesText: (response.data.guidelines || []).join('\n'),
          status: response.data.status,
          isHot: response.data.isHot,
        });
        setActiveTab('questions');
        setAssessmentFormVisible(true);
      }
    } catch (error: any) {
      console.error('handleViewAssessment error:', error);
      message.error('获取测评详情失败');
    }
  };

  // 删除测评
  const handleDeleteAssessment = async (assessment: Assessment) => {
    try {
      const response = await assessmentApi.deleteAssessment(assessment.id);
      if (!response.success) {
        message.error(response.message || '删除失败');
        return;
      }
      message.success('删除成功');
      loadAssessments();
    } catch (error: any) {
      console.error('handleDeleteAssessment error:', error);
      message.error('删除失败，请稍后再试');
    }
  };

  // 题目表单提交
  const handleQuestionSubmit = async () => {
    try {
      const values = await questionForm.validateFields();
      if (!currentAssessment) {
        message.error('请先选择或创建测评');
        return;
      }

      const payload = {
        ...values,
        options: values.options || [],
      };

      if (editingQuestionId) {
        const response = await assessmentApi.updateQuestion(editingQuestionId, payload);
        if (!response.success) {
          message.error(response.message || '更新题目失败');
          return;
        }
        message.success('题目更新成功');
      } else {
        const response = await assessmentApi.createQuestion(currentAssessment.id, payload);
        if (!response.success) {
          message.error(response.message || '创建题目失败');
          return;
        }
        message.success('题目创建成功');
      }
      setQuestionFormVisible(false);
      questionForm.resetFields();
      setEditingQuestionId(null);
      // 重新加载测评详情
      if (currentAssessment) {
        const response = await assessmentApi.getAssessmentDetail(currentAssessment.id);
        if (response.success && response.data) {
          setQuestions(response.data.questions || []);
        }
      }
    } catch (error: any) {
      if (error.errorFields) return;
      console.error('handleQuestionSubmit error:', error);
      message.error('操作失败，请稍后再试');
    }
  };

  // 删除题目
  const handleDeleteQuestion = async (question: AssessmentQuestion) => {
    try {
      const response = await assessmentApi.deleteQuestion(question.id);
      if (!response.success) {
        message.error(response.message || '删除失败');
        return;
      }
      message.success('删除成功');
      // 重新加载题目列表
      if (currentAssessment) {
        const response = await assessmentApi.getAssessmentDetail(currentAssessment.id);
        if (response.success && response.data) {
          setQuestions(response.data.questions || []);
        }
      }
    } catch (error: any) {
      console.error('handleDeleteQuestion error:', error);
      message.error('删除失败，请稍后再试');
    }
  };

  // 编辑题目
  const handleEditQuestion = (question: AssessmentQuestion) => {
    setEditingQuestionId(question.id);
    questionForm.setFieldsValue({
      questionText: question.questionText,
      questionType: question.questionType,
      options: question.options || [],
      correctAnswer: question.correctAnswer || '',
      score: question.score,
      sortOrder: question.sortOrder,
    });
    setQuestionFormVisible(true);
  };

  // 图片上传处理
  const handleImageUpload = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const response = await uploadApi.uploadFile(file, 'banner');
      if (response.success && response.data) {
        message.success('图片上传成功');
        return response.data.url;
      }
      throw new Error(response.message || '上传失败');
    } catch (error: any) {
      console.error('图片上传失败:', error);
      message.error(error?.message || '图片上传失败');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // 分类表格列
  const categoryColumns: ColumnsType<AssessmentCategory> = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a, b) => a.sortOrder - b.sortOrder,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '测评数量',
      key: 'count',
      width: 100,
      render: (_, record) => record._count?.assessments || 0,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Badge status={isActive ? 'success' : 'default'} text={isActive ? '启用' : '禁用'} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCategoryId(record.id);
                categoryForm.setFieldsValue({
                  name: record.name,
                  description: record.description || '',
                  icon: record.icon || '',
                  sortOrder: record.sortOrder,
                  isActive: record.isActive,
                });
                setCategoryFormVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个分类吗？"
            onConfirm={() => handleDeleteCategory(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 测评表格列
  const assessmentColumns: ColumnsType<Assessment> = [
    {
      title: '封面',
      dataIndex: 'coverImage',
      key: 'coverImage',
      width: 100,
      render: (url: string) =>
        url ? (
          <Image src={url} alt="封面" width={60} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 60, height: 40, background: '#f0f0f0', borderRadius: 4 }} />
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '分类',
      key: 'category',
      width: 120,
      render: (_, record) => <Tag>{record.category?.name || '-'}</Tag>,
    },
    {
      title: '题目数',
      key: 'questionCount',
      width: 80,
      render: (_, record) => record.questionCount || 0,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty: string) => {
        const colors: Record<string, string> = {
          BEGINNER: 'green',
          INTERMEDIATE: 'orange',
          ADVANCED: 'red',
        };
        const labels: Record<string, string> = {
          BEGINNER: '初级',
          INTERMEDIATE: '中级',
          ADVANCED: '高级',
        };
        return <Tag color={colors[difficulty]}>{labels[difficulty]}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          DRAFT: 'default',
          PUBLISHED: 'success',
          ARCHIVED: 'warning',
        };
        const labels: Record<string, string> = {
          DRAFT: '草稿',
          PUBLISHED: '已发布',
          ARCHIVED: '已归档',
        };
        return <Badge status={colors[status] as any} text={labels[status]} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看题目">
            <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewAssessment(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEditAssessment(record)} />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个测评吗？"
            onConfirm={() => handleDeleteAssessment(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 分类管理 */}
          <Tabs.TabPane tab="测评分类" key="categories">
            <Card
              title="测评分类管理"
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                  setEditingCategoryId(null);
                  categoryForm.resetFields();
                  setCategoryFormVisible(true);
                }}>
                  新建分类
                </Button>
              }
            >
              <Table
                columns={categoryColumns}
                dataSource={categories}
                rowKey="id"
                loading={categoryLoading}
                pagination={{
                  current: categoryPage,
                  pageSize: 20,
                  total: categoryTotal,
                  showTotal: (total) => `共 ${total} 条记录`,
                  onChange: (page) => setCategoryPage(page),
                }}
              />
            </Card>
          </Tabs.TabPane>

          {/* 测评管理 */}
          <Tabs.TabPane tab="测评管理" key="assessments">
            <Card
              title="测评管理"
              extra={
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadAssessments} loading={assessmentLoading}>
                    刷新
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingAssessmentId(null);
                      assessmentForm.resetFields();
                      setCurrentAssessment(null);
                      setQuestions([]);
                      setAssessmentFormVisible(true);
                    }}
                  >
                    新建测评
                  </Button>
                </Space>
              }
            >
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择分类"
                    allowClear
                    value={selectedCategoryId || undefined}
                    onChange={setSelectedCategoryId}
                  >
                    {categories.filter(c => c.isActive).map((cat) => (
                      <Option key={cat.id} value={cat.id}>
                        {cat.name}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择状态"
                    allowClear
                    value={statusFilter || undefined}
                    onChange={setStatusFilter}
                  >
                    <Option value="DRAFT">草稿</Option>
                    <Option value="PUBLISHED">已发布</Option>
                    <Option value="ARCHIVED">已归档</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Input
                    placeholder="搜索标题、描述..."
                    prefix={<SearchOutlined />}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    allowClear
                  />
                </Col>
              </Row>

              <Table
                columns={assessmentColumns}
                dataSource={assessments}
                rowKey="id"
                loading={assessmentLoading}
                scroll={{ x: 1200 }}
                pagination={{
                  current: assessmentPage,
                  pageSize: 20,
                  total: assessmentTotal,
                  showTotal: (total) => `共 ${total} 条记录`,
                  onChange: (page) => setAssessmentPage(page),
                }}
              />
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* 分类表单弹窗 */}
      <Modal
        title={editingCategoryId ? '编辑分类' : '新建分类'}
        open={categoryFormVisible}
        onOk={handleCategorySubmit}
        onCancel={() => {
          setCategoryFormVisible(false);
          categoryForm.resetFields();
          setEditingCategoryId(null);
        }}
        width={600}
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入分类描述" />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input placeholder="图标URL或图标名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sortOrder" label="排序" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="状态" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 测评表单弹窗 */}
      <Modal
        title={editingAssessmentId ? '编辑测评' : '新建测评'}
        open={assessmentFormVisible}
        onOk={handleAssessmentSubmit}
        onCancel={() => {
          setAssessmentFormVisible(false);
          assessmentForm.resetFields();
          setEditingAssessmentId(null);
          setCurrentAssessment(null);
          setQuestions([]);
        }}
        width={900}
        okText="保存"
        cancelText="取消"
      >
        <Tabs defaultActiveKey="basic">
          <Tabs.TabPane tab="基本信息" key="basic">
            <Form form={assessmentForm} layout="vertical">
              <Form.Item
                name="categoryId"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {categories.filter(c => c.isActive).map((cat) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                <Input placeholder="请输入测评标题" />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <TextArea rows={4} placeholder="请输入测评描述" />
              </Form.Item>
              <Form.Item name="guidelinesText" label="测评指南（每行一条展示要点）">
                <TextArea
                  rows={4}
                  placeholder="示例：\n测试没有具体时间限制\n尽量避免重复做同一题，选择第一直觉"
                />
              </Form.Item>
              <Form.Item name="coverImage" label="封面图片">
                <Input.Group compact>
                  <Input
                    style={{ width: 'calc(100% - 100px)' }}
                    placeholder="图片URL"
                    value={assessmentForm.getFieldValue('coverImage')}
                    onChange={(e) => assessmentForm.setFieldsValue({ coverImage: e.target.value })}
                  />
                  <Upload
                    showUploadList={false}
                    beforeUpload={async (file) => {
                      try {
                        const url = await handleImageUpload(file);
                        assessmentForm.setFieldsValue({ coverImage: url });
                        return false;
                      } catch {
                        return false;
                      }
                    }}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />} loading={uploading}>
                      上传
                    </Button>
                  </Upload>
                </Input.Group>
              </Form.Item>
              {assessmentForm.getFieldValue('coverImage') && (
                <Form.Item label="封面预览">
                  <Image
                    src={assessmentForm.getFieldValue('coverImage')}
                    alt="封面预览"
                    width={200}
                    style={{ borderRadius: 4 }}
                  />
                </Form.Item>
              )}
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="durationMinutes" label="预计时长（分钟）" initialValue={15}>
                    <InputNumber min={1} max={300} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="difficulty" label="难度" initialValue="BEGINNER">
                    <Select>
                      <Option value="BEGINNER">初级</Option>
                      <Option value="INTERMEDIATE">中级</Option>
                      <Option value="ADVANCED">高级</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="status" label="状态" initialValue="DRAFT">
                    <Select>
                      <Option value="DRAFT">草稿</Option>
                      <Option value="PUBLISHED">已发布</Option>
                      <Option value="ARCHIVED">已归档</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="tags" label="标签">
                    <Select mode="tags" placeholder="输入标签后按回车" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isHot" label="热门" valuePropName="checked" initialValue={false}>
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Tabs.TabPane>

          {/* 题目管理 */}
          <Tabs.TabPane tab={`题目管理 (${questions.length})`} key="questions">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  if (!currentAssessment && !editingAssessmentId) {
                    message.warning('请先保存测评基本信息');
                    return;
                  }
                  setEditingQuestionId(null);
                  questionForm.resetFields();
                  questionForm.setFieldsValue({
                    questionType: 'SINGLE_CHOICE',
                    options: [],
                    score: 0,
                    sortOrder: questions.length,
                  });
                  setQuestionFormVisible(true);
                }}
              >
                添加题目
              </Button>
            </div>

            {questions.length === 0 ? (
              <Empty description="暂无题目，请添加题目" />
            ) : (
              <Collapse>
                {questions
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((question, index) => (
                    <Panel
                      key={question.id}
                      header={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {index + 1}. {question.questionText.length > 50
                              ? `${question.questionText.substring(0, 50)}...`
                              : question.questionText}
                          </span>
                          <Space>
                            <Tag>{question.questionType === 'SINGLE_CHOICE' ? '单选' : question.questionType === 'MULTIPLE_CHOICE' ? '多选' : '文本'}</Tag>
                            <Tag>分值: {question.score}</Tag>
                            <Button
                              type="link"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditQuestion(question);
                              }}
                            >
                              编辑
                            </Button>
                            <Popconfirm
                              title="确定要删除这个题目吗？"
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                handleDeleteQuestion(question);
                              }}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                              >
                                删除
                              </Button>
                            </Popconfirm>
                          </Space>
                        </div>
                      }
                    >
                      <div style={{ padding: '12px 0' }}>
                        <Text strong>{question.questionText}</Text>
                        {question.options && question.options.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} style={{ marginBottom: 8, paddingLeft: 20 }}>
                                <Tag color="blue">{option.label}</Tag>
                                <Text>{option.text}</Text>
                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                  (分数: {option.score})
                                </Text>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Panel>
                  ))}
              </Collapse>
            )}
          </Tabs.TabPane>
        </Tabs>
      </Modal>

      {/* 题目表单弹窗 */}
      <Modal
        title={editingQuestionId ? '编辑题目' : '新建题目'}
        open={questionFormVisible}
        onOk={handleQuestionSubmit}
        onCancel={() => {
          setQuestionFormVisible(false);
          questionForm.resetFields();
          setEditingQuestionId(null);
        }}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={questionForm} layout="vertical">
          <Form.Item name="questionText" label="题目内容" rules={[{ required: true, message: '请输入题目内容' }]}>
            <TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="questionType" label="题目类型" initialValue="SINGLE_CHOICE">
                <Select>
                  <Option value="SINGLE_CHOICE">单选题</Option>
                  <Option value="MULTIPLE_CHOICE">多选题</Option>
                  <Option value="TEXT">文本题</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="score" label="分值" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="sortOrder" label="排序" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.questionType !== currentValues.questionType}
          >
            {({ getFieldValue }) => {
              const questionType = getFieldValue('questionType');
              if (questionType === 'TEXT') {
                return (
                  <Form.Item name="correctAnswer" label="参考答案">
                    <TextArea rows={3} placeholder="参考答案（可选）" />
                  </Form.Item>
                );
              }
              return (
                <Form.Item
                  name="options"
                  label="选项"
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!value || value.length === 0) {
                          return Promise.reject(new Error('请至少添加一个选项'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Form.List name="options">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map((field, index) => (
                          <div key={field.key} style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'label']}
                              rules={[{ required: true, message: '请输入选项标签' }]}
                              style={{ width: 80 }}
                            >
                              <Input placeholder="标签" />
                            </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, 'text']}
                              rules={[{ required: true, message: '请输入选项内容' }]}
                              style={{ flex: 1 }}
                            >
                              <Input placeholder="选项内容" />
                            </Form.Item>
                            <Form.Item
                              {...field}
                              name={[field.name, 'score']}
                              rules={[{ required: true, message: '请输入分数' }]}
                              style={{ width: 100 }}
                            >
                              <InputNumber min={0} placeholder="分数" style={{ width: '100%' }} />
                            </Form.Item>
                            <Button
                              type="link"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                            />
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add({ label: '', text: '', score: 0 })}
                          block
                          icon={<PlusCircleOutlined />}
                        >
                          添加选项
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AssessmentManagement;
