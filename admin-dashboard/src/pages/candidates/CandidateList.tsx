import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Select, message, Row, Col } from 'antd';
import { SearchOutlined, UserOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AUTH_CONSTANTS } from '../../config/constants';
import { LiquidCard, StatCard, GlassButton } from '../../components/GlassComponents';
import { TeamOutlined, UserAddOutlined, FileTextOutlined } from '@ant-design/icons';

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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      const queryParams = new URLSearchParams({
        page: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const response = await fetch(`/api/candidates?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        setCandidates(data.data || data.candidates || []);
        setPagination((prev) => ({ ...prev, total: data.total || 0 }));
      }
    } catch (err) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [pagination.current, pagination.pageSize, statusFilter]);

  const statusMap: Record<string, { color: string; label: string }> = {
    active: { color: '#2dd4bf', label: '活跃' },
    inactive: { color: '#64748b', label: '未激活' },
    interviewing: { color: '#38bdf8', label: '面试中' },
    hired: { color: '#a78bfa', label: '已录用' },
  };

  const columns = [
    {
      title: '候选人',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Candidate) => (
        <Space>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '学历',
      dataIndex: 'education',
      key: 'education',
      render: (v: string) => (
        <span style={{ color: '#94a3b8' }}>{v || '未填写'}</span>
      ),
    },
    {
      title: '经验',
      dataIndex: 'experience',
      key: 'experience',
      render: (v: string) => (
        <span style={{ color: '#94a3b8' }}>{v || '未知'}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = statusMap[status] || { color: '#64748b', label: status };
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 6,
              background: `${s.color}18`,
              border: `1px solid ${s.color}33`,
              color: s.color,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {s.label}
          </span>
        );
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => (
        <span style={{ color: '#64748b', fontSize: 13 }}>
          {v ? dayjs(v).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Candidate) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/candidates/${record.id}`)}
          style={{ color: '#38bdf8' }}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>
          候选人管理
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          管理和筛选所有候选人
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<TeamOutlined />}
            label="总候选人"
            value={pagination.total}
            color="blue"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<UserAddOutlined />}
            label="今日新增"
            value={12}
            trend={{ value: '+5', up: true }}
            color="teal"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<FileTextOutlined />}
            label="面试中"
            value={34}
            color="purple"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            icon={<UserOutlined />}
            label="本月录用"
            value={8}
            trend={{ value: '+2', up: true }}
            color="pink"
          />
        </Col>
      </Row>

      {/* 搜索栏 */}
      <LiquidCard style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            placeholder="搜索候选人姓名或邮箱..."
            className="glass-input"
            style={{ width: 280, height: 40 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => fetchCandidates()}
          />
          <Select
            className="glass-input"
            style={{ width: 140, height: 40 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            suffixIcon={<FilterOutlined style={{ color: '#64748b' }} />}
          >
            <Option value="all">全部状态</Option>
            <Option value="active">活跃</Option>
            <Option value="interviewing">面试中</Option>
            <Option value="hired">已录用</Option>
          </Select>
          <GlassButton onClick={fetchCandidates} icon={<SearchOutlined />}>
            搜索
          </GlassButton>
        </div>
      </LiquidCard>

      {/* 表格 */}
      <LiquidCard>
        <div className="glass-table" style={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={candidates}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => (
                <span style={{ color: '#64748b' }}>
                  共 {total} 位候选人
                </span>
              ),
              onChange: (page, pageSize) =>
                setPagination((prev) => ({ ...prev, current: page, pageSize })),
            }}
            style={{ background: 'transparent' }}
          />
        </div>
      </LiquidCard>
    </div>
  );
};

export default CandidateList;
