import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Avatar,
  Rate,
  Tooltip,
  Row,
  Col,
  Switch,
  message,
  Pagination,
  Slider,
  Spin,
  Empty,
  Badge
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  VideoCameraOutlined,
  UserOutlined,
  AppstoreOutlined,
  BarsOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { 
  Interview, 
  InterviewFilters, 
  InterviewListParams, 
  InterviewListResponse 
} from '../types/interview';
import { interviewApi, jobApi } from '../services/api';
import CandidateCard from '../components/CandidateCard';
import InterviewDetailModal from '../components/InterviewDetailModal';
import VideoPlayerModal from '../components/VideoPlayerModal';
import InterviewStatsCards from '../components/InterviewStatsCards';
import FeatureGuide from '../components/FeatureGuide';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const InterviewList: React.FC = () => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  // 筛选条件
  const [filters, setFilters] = useState<InterviewFilters>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 10]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  
  // 详情模态框
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  
  // 视频播放器
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentCandidateName, setCurrentCandidateName] = useState<string>('');
  
  // 岗位列表（用于筛选）
  const [jobList, setJobList] = useState<any[]>([]);
  
  // 状态和结果选项
  const statusOptions = [
    { label: '待面试', value: 'pending' },
    { label: '已安排', value: 'scheduled' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' }
  ];
  
  const resultOptions = [
    { label: '待评估', value: 'pending' },
    { label: '评估中', value: 'reviewing' },
    { label: '通过', value: 'passed' },
    { label: '未通过', value: 'failed' }
  ];

  // 部门选项（示例数据）
  const departmentOptions = [
    { label: '技术部', value: '技术部' },
    { label: '产品部', value: '产品部' },
    { label: '设计部', value: '设计部' },
    { label: '市场部', value: '市场部' },
    { label: '人事部', value: '人事部' }
  ];

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: InterviewListParams = {
        page: currentPage,
        pageSize,
        filters: {
          ...filters,
          keyword: searchKeyword || undefined,
          scoreRange: scoreRange[0] > 0 || scoreRange[1] < 10 ? scoreRange : undefined,
          dateRange: dateRange || undefined
        }
      };
      
      const response: InterviewListResponse = await interviewApi.getList(params);
      setInterviews(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('获取面试数据失败:', error);
      message.error('获取面试数据失败');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, searchKeyword, scoreRange, dateRange]);

  // 获取岗位列表
  const fetchJobList = useCallback(async () => {
    try {
      const response = await jobApi.getList();
      setJobList(response.data || []);
    } catch (error) {
      console.error('获取岗位列表失败:', error);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchJobList();
  }, [fetchJobList]);

  // 筛选器变化处理
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // 重置到第一页
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({});
    setSearchKeyword('');
    setScoreRange([0, 10]);
    setDateRange(null);
    setCurrentPage(1);
  };

  // 查看详情
  const handleViewDetail = (interview: Interview) => {
    setSelectedInterview(interview);
    setDetailModalVisible(true);
  };

  // 播放视频
  const handlePlayVideo = (interview: Interview) => {
    setCurrentVideoUrl(interview.videoUrl || null);
    setCurrentCandidateName(interview.candidate.name);
    setVideoModalVisible(true);
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const params = {
        filters: {
          ...filters,
          keyword: searchKeyword || undefined,
          scoreRange: scoreRange[0] > 0 || scoreRange[1] < 10 ? scoreRange : undefined,
          dateRange: dateRange || undefined
        }
      };
      await interviewApi.exportData(params);
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<Interview> = [
    {
      title: '候选人',
      key: 'candidate',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            size={40} 
            src={record.candidate.avatar} 
            icon={<UserOutlined />}
            style={{ marginRight: '12px' }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.candidate.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.candidate.major} · {record.candidate.experience}年经验
            </div>
          </div>
        </div>
      )
    },
    {
      title: '岗位信息',
      key: 'job',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.jobTitle}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.department}</div>
        </div>
      )
    },
    {
      title: '面试时间',
      dataIndex: 'interviewDate',
      width: 120,
      render: (date) => dayjs(date).format('MM-DD HH:mm')
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 80,
      render: (duration) => `${duration}分钟`
    },
    {
      title: '评分',
      dataIndex: 'score',
      width: 120,
      render: (score) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Rate disabled value={Math.round(score / 2)} style={{ fontSize: '14px' }} />
          <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{score.toFixed(1)}</span>
        </div>
      ),
      sorter: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const config = {
          'pending': { color: 'orange', text: '待面试' },
          'scheduled': { color: 'blue', text: '已安排' },
          'completed': { color: 'green', text: '已完成' },
          'cancelled': { color: 'red', text: '已取消' }
        };
        return <Tag color={config[status]?.color}>{config[status]?.text}</Tag>;
      }
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 100,
      render: (result) => {
        const config = {
          'pending': { color: 'default', text: '待评估' },
          'reviewing': { color: 'processing', text: '评估中' },
          'passed': { color: 'success', text: '通过' },
          'failed': { color: 'error', text: '未通过' }
        };
        return <Tag color={config[result]?.color}>{config[result]?.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
          {record.videoUrl && (
            <Tooltip title="查看视频">
              <Button 
                type="text" 
                icon={<VideoCameraOutlined />}
                onClick={() => handlePlayVideo(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面标题和操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle" wrap={false}>
          <Col flex="auto">
            <Space align="center" size={16} style={{ width: '100%' }}>
              <h2 style={{ margin: 0 }}>面试者管理</h2>
              <Badge
                count={total}
                overflowCount={999}
                showZero
                style={{ backgroundColor: '#faad14' }}
              >
                <span style={{ color: '#666', padding: '4px 8px', display: 'inline-block' }}>候选人</span>
              </Badge>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<PlusOutlined />} type="primary">
                添加面试
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出数据
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                刷新
              </Button>
              <FeatureGuide />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} data-tour="view-mode">
                <BarsOutlined style={{ color: viewMode === 'table' ? '#1890ff' : '#999' }} />
                <Switch
                  checked={viewMode === 'card'}
                  onChange={(checked) => setViewMode(checked ? 'card' : 'table')}
                />
                <AppstoreOutlined style={{ color: viewMode === 'card' ? '#1890ff' : '#999' }} />
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <div data-tour="stats">
        <InterviewStatsCards 
          interviews={interviews} 
          style={{ marginBottom: '16px' }}
        />
      </div>

      {/* 筛选器 */}
      <Card style={{ marginBottom: '16px' }} data-tour="filters">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Search
              placeholder="搜索候选人姓名、邮箱、技能..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="面试状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              {statusOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="面试结果"
              allowClear
              style={{ width: '100%' }}
              value={filters.result}
              onChange={(value) => handleFilterChange('result', value)}
            >
              {resultOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="所属部门"
              allowClear
              style={{ width: '100%' }}
              value={filters.department}
              onChange={(value) => handleFilterChange('department', value)}
            >
              {departmentOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['开始时间', '结束时间']}
              style={{ width: '100%' }}
              value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')]);
                } else {
                  setDateRange(null);
                }
                setCurrentPage(1);
              }}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col span={8}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>评分范围：</span>
              <Slider
                range
                min={0}
                max={10}
                step={0.1}
                value={scoreRange}
                onChange={(value) => {
                  setScoreRange(value as [number, number]);
                  setCurrentPage(1);
                }}
                style={{ flex: 1 }}
              />
              <span style={{ whiteSpace: 'nowrap', color: '#666' }}>
                {scoreRange[0]}-{scoreRange[1]}分
              </span>
            </div>
          </Col>
          <Col span={4}>
            <Button 
              icon={<FilterOutlined />} 
              onClick={handleResetFilters}
            >
              重置筛选
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 数据展示区域 */}
      <Spin spinning={loading}>
        {viewMode === 'table' ? (
          // 表格视图
          <Card>
            <Table
              columns={columns}
              dataSource={interviews}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
              size="middle"
            />
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 12);
                }}
              />
            </div>
          </Card>
        ) : (
          // 卡片视图
          <div>
            {interviews.length > 0 ? (
              <>
                <Row gutter={[16, 16]}>
                  {interviews.map((interview) => (
                    <Col key={interview.id} xs={24} sm={12} md={8} lg={8} xl={6}>
                      <CandidateCard
                        interview={interview}
                        onView={handleViewDetail}
                        onPlayVideo={handlePlayVideo}
                        style={{ height: '100%' }}
                      />
                    </Col>
                  ))}
                </Row>
                <Card style={{ marginTop: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={total}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                      onChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size || 12);
                      }}
                    />
                  </div>
                </Card>
              </>
            ) : (
              <Card>
                <Empty description="暂无面试数据" />
              </Card>
            )}
          </div>
        )}
      </Spin>

      {/* 详情模态框 */}
      <InterviewDetailModal
        visible={detailModalVisible}
        interview={selectedInterview}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedInterview(null);
        }}
        onPlayVideo={(videoUrl) => {
          setCurrentVideoUrl(videoUrl);
          setCurrentCandidateName(selectedInterview?.candidate.name || '');
          setVideoModalVisible(true);
        }}
      />

      {/* 视频播放器 */}
      <VideoPlayerModal
        visible={videoModalVisible}
        videoUrl={currentVideoUrl}
        candidateName={currentCandidateName}
        onClose={() => {
          setVideoModalVisible(false);
          setCurrentVideoUrl(null);
          setCurrentCandidateName('');
        }}
      />
    </div>
  );
};

export default InterviewList; 
