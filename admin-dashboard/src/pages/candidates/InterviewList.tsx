import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Select, DatePicker, message } from 'antd';
import { SearchOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AUTH_CONSTANTS } from '../../config/constants';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Interview {
  id: string;
  status: string;
  startTime: string;
  endTime?: string;
  score?: number;
  feedback?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
}

const InterviewList: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
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

  // 获取面试列表
  const fetchInterviews = async () => {
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

      const response = await fetch(`/api/interviews?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setInterviews(data.data.interviews);
        setPagination(prev => ({
          ...prev,
          total: data.data.total
        }));
      } else {
        message.error(data.message || '获取面试列表失败');
      }
    } catch (error) {
      console.error('获取面试列表失败:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter, dateRange]);

  const columns = [
    {
      title: '候选人',
      dataIndex: ['candidate', 'name'],
      key: 'candidateName',
      render: (text: string, record: Interview) => (
        <Button type="link" onClick={() => navigate(`/candidates/${record.candidate.id}`)}>
          {text}
        </Button>
      )
    },
    {
      title: '职位',
      dataIndex: ['job', 'title'],
      key: 'jobTitle',
      render: (text: string, record: Interview) => (
        <Button type="link" onClick={() => navigate(`/jobs/${record.job.id}`)}>
          {text}
        </Button>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          'PENDING': { color: 'gold', text: '待面试' },
          'ONGOING': { color: 'processing', text: '进行中' },
          'COMPLETED': { color: 'success', text: '已完成' },
          'CANCELLED': { color: 'default', text: '已取消' }
        };
        const { color, text } = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time?: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (score?: number) => score ? `${score}分` : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Interview) => (
        <Space size="middle">
          <Button type="link" onClick={() => navigate(`/interviews/${record.id}`)}>
            查看详情
          </Button>
          {record.status === 'PENDING' && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={() => navigate(`/interviews/${record.id}/room`)}
            >
              进入面试
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="interview-list-page">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2>面试管理</h2>
      </div>

      <div className="search-bar" style={{ marginBottom: 24 }}>
        <Space size="large">
          <Input
            placeholder="搜索候选人/职位"
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
            <Option value="PENDING">待面试</Option>
            <Option value="ONGOING">进行中</Option>
            <Option value="COMPLETED">已完成</Option>
            <Option value="CANCELLED">已取消</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
          />
          <Button
            type="primary"
            onClick={() => navigate('/interviews/new')}
          >
            发起面试
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={interviews}
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

export default InterviewList;
