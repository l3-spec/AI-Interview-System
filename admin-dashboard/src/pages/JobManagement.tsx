import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Tooltip,
  message,
  Drawer,
  InputNumber,
  DatePicker,
  Typography,
  Divider,
  Popconfirm,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  DownOutlined
} from '@ant-design/icons';
import { jobApi, candidateApi } from '../services/api';
import { Job, JobListParams, Candidate } from '../types/interview';
import { AUTH_CONSTANTS } from '../config/constants';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const JobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<JobListParams>({});
  const [filterStatus, setFilterStatus] = useState<string[] | undefined>(undefined);
  
  // 弹窗状态
  const [filterVisible, setFilterVisible] = useState(false);
  const [candidatesVisible, setCandidatesVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobCandidates, setJobCandidates] = useState<Candidate[]>([]);
  
  const [filterForm] = Form.useForm();

  const navigate = useNavigate();

  // 部门选项
  const departmentOptions = [
    '技术部',
    '产品部', 
    '设计部',
    '市场部',
    '销售部',
    '人力资源部',
    '财务部',
    '运营部',
    '客服部'
  ];

  // 工作类型选项
  const workTypeOptions = [
    { label: '全职', value: 'fulltime' },
    { label: '兼职', value: 'parttime' },
    { label: '合同', value: 'contract' },
    { label: '实习', value: 'internship' }
  ];

  // 状态配置
  const statusConfig = {
    'draft': { color: 'default', text: '草稿' },
    'published': { color: 'success', text: '已发布' },
    'paused': { color: 'warning', text: '已暂停' },
    'closed': { color: 'error', text: '已关闭' }
  };

  // 加载职岗列表
  const loadJobs = async () => {
    setLoading(true);
    try {
      const params: JobListParams = {
        page: currentPage,
        pageSize,
        ...filters
      };
      const response = await jobApi.getList(params);
      setJobs(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('加载职岗列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [currentPage, pageSize, filters]);

  // 创建职岗
  const handleCreate = () => {
    navigate('/jobs/create');
  };

  // 编辑职岗
  const handleEdit = (job: Job) => {
    navigate(`/jobs/edit/${job.id}`);
  };

  // 查看职岗详情
  const handleView = (job: Job) => {
    navigate(`/jobs/detail/${job.id}`);
  };

  // 删除职岗
  const handleDelete = async (jobId: string) => {
    try {
      await jobApi.delete(jobId);
      message.success('删除成功');
      loadJobs();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 更新职岗状态
  const handleStatusChange = async (jobId: string, action: 'publish' | 'pause' | 'close') => {
    try {
      switch (action) {
        case 'publish':
          await jobApi.publish(jobId);
          message.success('职岗已发布');
          break;
        case 'pause':
          await jobApi.pause(jobId);
          message.success('职岗已暂停');
          break;
        case 'close':
          await jobApi.close(jobId);
          message.success('职岗已关闭');
          break;
      }
      loadJobs();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 保存职岗
  const handleSave = async (values: any) => {
    try {
      console.log('Saving job with values:', values);
      
      // 处理薪资范围
      const salaryData = {
        min: values.salary?.min || 0,
        max: values.salary?.max || 0,
        currency: values.salary?.currency || 'CNY'
      };

      // 处理技能要求（可能是字符串或数组）
      const skillsArray = Array.isArray(values.skills) 
        ? values.skills 
        : (typeof values.skills === 'string' ? values.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

      // 处理职责和要求（可能是字符串或数组）
      const responsibilitiesArray = Array.isArray(values.responsibilities)
        ? values.responsibilities
        : (typeof values.responsibilities === 'string' ? values.responsibilities.split('\n').map((s: string) => s.trim()).filter(Boolean) : []);

      const requirementsArray = Array.isArray(values.requirements)
        ? values.requirements
        : (typeof values.requirements === 'string' ? values.requirements.split('\n').map((s: string) => s.trim()).filter(Boolean) : []);

      const benefitsArray = Array.isArray(values.benefits)
        ? values.benefits
        : (typeof values.benefits === 'string' ? values.benefits.split('\n').map((s: string) => s.trim()).filter(Boolean) : []);

      // 从localStorage获取当前用户信息
      const userStr = localStorage.getItem(AUTH_CONSTANTS.USER_KEY);
      const user = userStr ? JSON.parse(userStr) : null;
      const companyId = user?.companyId;

      if (!companyId) {
        throw new Error('未找到公司信息');
      }

      // 构建职位数据
      const jobData: Partial<Job> = {
        title: values.title,
        department: values.department,
        location: values.location,
        workType: values.workType as Job['workType'],
        salary: salaryData as Job['salary'],
        experience: values.experience,
        education: values.education,
        skills: skillsArray,
        responsibilities: responsibilitiesArray,
        requirements: requirementsArray,
        benefits: benefitsArray,
        description: values.description,
        companyId,
        status: 'draft' as const
      };

      console.log('Processed job data:', jobData);

      let response;
      if (!selectedJob?.id) {
        response = await jobApi.create(jobData);
        message.success('职位创建成功');
      } else {
        response = await jobApi.update(selectedJob.id, jobData);
        message.success('职位更新成功');
      }

      console.log('API response:', response);
      
      loadJobs(); // 重新加载列表
    } catch (error) {
      console.error('Failed to save job:', error);
      message.error(error instanceof Error ? error.message : '保存失败，请重试');
    }
  };

  // 查看候选人
  const handleViewCandidates = async (job: Job) => {
    try {
      const response = await jobApi.getCandidates(job.id);
      setJobCandidates(response.data);
      setSelectedJob(job);
      setCandidatesVisible(true);
    } catch (error) {
      message.error('加载候选人失败');
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    const newFilters = {
      ...filters,
      filters: {
        ...filters.filters,
        keyword: value
      }
    };
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // 处理筛选
  const handleFilter = (values: any) => {
    const newFilters: JobListParams = {
      filters: {
        status: values.status,
        department: values.department,
        workType: values.workType,
        salaryRange: values.salaryRange,
        createdDateRange: values.createdDateRange?.map((date: any) => date.format('YYYY-MM-DD'))
      }
    };
    setFilters(newFilters);
    setCurrentPage(1);
    setFilterVisible(false);
  };

  // 清除筛选
  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    setFilterVisible(false);
    filterForm.resetFields();
  };

  // 状态筛选变更
  const handleFilterStatusChange = (value: string[] | undefined) => {
    setFilterStatus(value);
    setFilters(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        status: value
      }
    }));
    setCurrentPage(1);
  };

  // 表格列定义
  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1
    },
    {
      title: '职位名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text: string, record: Job) => (
        <div style={{ fontWeight: 500 }}>
          <a onClick={() => handleView(record)}>{text}</a>
        </div>
      )
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '工作地点',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: '薪资范围',
      key: 'salary',
      width: 120,
      render: (record: Job) => (
        <div>
          {record.salary.min}K - {record.salary.max}K
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusConfig[status as keyof typeof statusConfig]?.color}>
          {statusConfig[status as keyof typeof statusConfig]?.text}
        </Tag>
      )
    },
    {
      title: '应聘人数',
      dataIndex: 'applicantCount',
      key: 'applicantCount',
      width: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (record: Job) => {
        const links: React.ReactNode[] = [
          <a key="view" onClick={() => handleView(record)}>查看</a>,
          <a key="edit" onClick={() => handleEdit(record)}>编辑</a>
        ];

        if (record.status === 'draft' || record.status === 'paused') {
          links.push(
            <a key="publish" onClick={() => handleStatusChange(record.id, 'publish')}>
              发布
            </a>
          );
        }

        if (record.status === 'published') {
          links.push(
            <a key="pause" onClick={() => handleStatusChange(record.id, 'pause')}>
              暂停
            </a>
          );
        }

        if (record.status !== 'closed') {
          links.push(
            <Popconfirm
              key="close"
              title="确定要关闭这个职位吗？"
              okText="确认关闭"
              cancelText="取消"
              onConfirm={() => handleStatusChange(record.id, 'close')}
            >
              <a style={{ color: '#fa8c16' }}>关闭</a>
            </Popconfirm>
          );
        }

        links.push(
          <Popconfirm
            key="delete"
            title="确定要删除这个职位吗？"
            okText="确认删除"
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        );

        return (
          <Space size="small" wrap>
            {links}
          </Space>
        );
      }
    }
  ];

  return (
    <div className="job-management-container">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>职位管理</span>
            <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
              （共 {total} 条记录）
            </span>
          </div>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建职位
          </Button>
        }
        style={{ borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        {/* 筛选区域 */}
        <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <Input.Search
            placeholder="搜索职位名称"
            allowClear
            onSearch={handleSearch}
            style={{ width: 240 }}
          />
          
          <Select
            placeholder="全部状态"
            allowClear
            style={{ width: 160 }}
            value={filterStatus}
            mode="multiple"
            onChange={handleFilterStatusChange}
            maxTagCount={2}
          >
            <Option value="draft">草稿</Option>
            <Option value="published">已发布</Option>
            <Option value="paused">已暂停</Option>
            <Option value="closed">已关闭</Option>
          </Select>
          
          <Select
            placeholder="部门筛选"
            allowClear
            style={{ width: 160 }}
            onChange={(value) => setFilters(prev => ({
              ...prev,
              filters: { ...prev.filters, department: value }
            }))}
          >
            {departmentOptions.map(dep => (
              <Option key={dep} value={dep}>{dep}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="工作类型"
            allowClear
            style={{ width: 160 }}
            onChange={(value) => setFilters(prev => ({
              ...prev,
              filters: { ...prev.filters, workType: value }
            }))}
          >
            {workTypeOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          
          <Button 
            icon={<FilterOutlined />} 
            onClick={() => setFilterVisible(true)}
          >
            更多筛选
          </Button>
          
          {Object.keys(filters).length > 0 && (
            <Button type="link" onClick={clearFilters}>
              清除筛选
            </Button>
          )}
        </div>
        
        {/* 职位表格 */}
        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            }
          }}
          loading={loading}
          bordered
          size="middle"
          style={{ marginTop: '8px' }}
        />
      </Card>
      
      {/* 高级筛选抽屉 */}
      <Drawer
        title="高级筛选"
        width={360}
        onClose={() => setFilterVisible(false)}
        visible={filterVisible}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={clearFilters} style={{ marginRight: 8 }}>
              重置
            </Button>
            <Button onClick={() => filterForm.submit()} type="primary">
              应用筛选
            </Button>
          </div>
        }
      >
        <Form form={filterForm} layout="vertical" onFinish={handleFilter}>
          <Form.Item name="status" label="职位状态">
            <Select mode="multiple" placeholder="请选择状态">
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="paused">已暂停</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Form.Item>
          <Form.Item name="department" label="所属部门">
            <Select mode="multiple" placeholder="请选择部门">
              {departmentOptions.map(dep => (
                <Option key={dep} value={dep}>{dep}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="workType" label="工作类型">
            <Select mode="multiple" placeholder="请选择工作类型">
              {workTypeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="salaryRange" label="薪资范围">
            <Input.Group compact>
              <InputNumber style={{ width: '45%' }} placeholder="最低" />
              <Input
                style={{ width: '10%', textAlign: 'center', pointerEvents: 'none' }}
                placeholder="-"
                disabled
              />
              <InputNumber style={{ width: '45%' }} placeholder="最高" />
            </Input.Group>
          </Form.Item>
          <Form.Item name="createdDateRange" label="创建时间">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 候选人列表抽屉 */}
      <Drawer
        title={`${selectedJob?.title || '职位'} - 候选人列表`}
        width={720}
        onClose={() => setCandidatesVisible(false)}
        visible={candidatesVisible}
      >
        <Table
          columns={[
            { title: '姓名', dataIndex: 'name', key: 'name' },
            { title: '邮箱', dataIndex: 'email', key: 'email' },
            { title: '电话', dataIndex: 'phone', key: 'phone' },
            { title: '学历', dataIndex: 'education', key: 'education' },
            { title: '工作经验', dataIndex: 'experience', key: 'experience', render: (exp: number) => `${exp}年` },
            {
              title: '操作',
              key: 'action',
              render: (record: Candidate) => (
                <Space size="small">
                  <a>查看详情</a>
                  <a>邀请面试</a>
                </Space>
              ),
            },
          ]}
          dataSource={jobCandidates}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Drawer>
    </div>
  );
};

export default JobManagement; 
