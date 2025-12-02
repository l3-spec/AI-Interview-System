import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Input, Select, Card, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Job } from '../../types/interview';
import { jobApi } from '../../services/api';

const { Search } = Input;
const { Option } = Select;

const JobList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const navigate = useNavigate();

  // 加载职位列表
  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        pageSize,
        filters: {
          status: statusFilter ? [statusFilter] : undefined,
          keyword: searchKeyword || undefined
        }
      };
      
      const response = await jobApi.getList(params);
      setJobs(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('加载职位列表失败:', error);
      message.error('加载职位列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [currentPage, pageSize, statusFilter, searchKeyword]);

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? undefined : value);
    setCurrentPage(1);
  };

  const handleJobDelete = async (id: string) => {
    try {
      await jobApi.delete(id);
      message.success('删除职位成功');
      loadJobs();
    } catch (error) {
      console.error('删除职位失败:', error);
      message.error('删除职位失败');
    }
  };

  const columns = [
    {
      title: '职位名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Job) => (
        <a onClick={() => navigate(`/jobs/detail/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '工作地点',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '薪资',
      key: 'salary',
      render: (record: any) => {
        if (typeof record.salary === 'string') {
          return record.salary;
        }
        if (record.salary && typeof record.salary === 'object') {
          const { min, max, currency = '' } = record.salary;
          return `${min || ''}${min ? 'K' : ''}-${max || ''}${max ? 'K' : ''} ${currency}`;
        }
        return '-';
      },
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      render: (_: any, record: any) => {
        const statusKey = (() => {
          if (record.status === 'ACTIVE') {
            return record.isPublished ? 'published' : 'paused';
          }
          if (record.status === 'DRAFT') return 'draft';
          if (record.status === 'CLOSED') return 'closed';
          return 'draft';
        })();

        const statusMap: Record<string, { color: string; text: string }> = {
          published: { color: 'green', text: '已发布' },
          draft: { color: 'gray', text: '草稿' },
          paused: { color: 'orange', text: '已暂停' },
          closed: { color: 'red', text: '已关闭' },
        };

        const { color, text } = statusMap[statusKey] || { color: 'default', text: statusKey };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '应聘人数',
      dataIndex: 'applicantCount',
      key: 'applicantCount',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (record: Job) => (
        <Space size="middle">
          <Button type="link" onClick={() => navigate(`/jobs/detail/${record.id}`)}>
            查看
          </Button>
          <Button type="link" onClick={() => navigate(`/jobs/edit/${record.id}`)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleJobDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Search
              placeholder="搜索职位"
              style={{ width: 200 }}
              onSearch={handleSearch}
              allowClear
            />
            <Select 
              defaultValue="all" 
              style={{ width: 120 }}
              onChange={handleStatusChange}
            >
              <Option value="all">全部状态</Option>
              <Option value="published">已发布</Option>
              <Option value="draft">草稿</Option>
              <Option value="paused">已暂停</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/jobs/create')}
          >
            创建职位
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={jobs}
        rowKey="id"
        loading={loading}
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
      />
    </Card>
  );
};

export default JobList; 
