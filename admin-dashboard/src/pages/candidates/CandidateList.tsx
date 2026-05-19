import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Select, DatePicker, message } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AUTH_CONSTANTS } from '../../config/constants';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  education?: string;
  experience?: string;
  createdAt: string;
}

const CandidateList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const navigate = useNavigate();

  // 获取候选人列表
  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      
      const queryParams = new URLSearchParams({
        page: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateRange[0] && { startDate: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange[1] && { endDate: dateRange[1].format('YYYY-MM-DD') })
      });

      const response = await fetch(`/api/candidates?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setCandidates(data.data.candidates);
        setPagination(prev => ({
          ...prev,
          total: data.data.total
        }));
      } else {
        message.error(data.message || '获取候选人列表失败');
      }
    } catch (error) {
      console.error('获取候选人列表失败:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter, dateRange]);

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Candidate) => (
        <Button type="link" onClick={() => navigate(`/candidates/${record.id}`)}>
          {text}
        </Button>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          'PENDING': { color: 'gold', text: '待处理' },
          'INTERVIEWING': { color: 'processing', text: '面试中' },
          'PASSED': { color: 'success', text: '已通过' },
          'REJECTED': { color: 'error', text: '已拒绝' },
          'WITHDRAWN': { color: 'default', text: '已撤销' }
        };
        const { color, text } = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '学历',
      dataIndex: 'education',
      key: 'education'
    },
    {
      title: '工作经验',
      dataIndex: 'experience',
      key: 'experience'
    },
    {
      title: '投递时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Candidate) => (
        <Space size="middle">
          <Button type="link" onClick={() => navigate(`/candidates/${record.id}`)}>
            查看详情
          </Button>
          <Button type="link" onClick={() => navigate(`/interviews/new?candidateId=${record.id}`)}>
            发起面试
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="candidate-list-page">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2>候选人管理</h2>
      </div>

      <div className="search-bar" style={{ marginBottom: 24 }}>
        <Space size="large">
          <Input
            placeholder="搜索姓名/邮箱/电话"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={value => setStatusFilter(value)}
            style={{ width: 150 }}
          >
            <Option value="all">全部状态</Option>
            <Option value="PENDING">待处理</Option>
            <Option value="INTERVIEWING">面试中</Option>
            <Option value="PASSED">已通过</Option>
            <Option value="REJECTED">已拒绝</Option>
            <Option value="WITHDRAWN">已撤销</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
          />
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={candidates}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => `共 ${total} 条记录`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || 10
            }));
          }
        }}
      />
    </div>
  );
};

export default CandidateList;
