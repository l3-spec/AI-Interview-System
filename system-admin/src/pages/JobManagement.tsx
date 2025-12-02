import React, { useState, useEffect } from 'react';
import { config } from '../config/config';

interface Company {
  id: string;
  name: string;
  logo?: string;
  isVerified: boolean;
}

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  salary?: string;
  location: string;
  type: string;
  level: string;
  skills?: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  company: Company;
  _count?: {
    applications: number;
    interviews: number;
  };
}

interface JobListResponse {
  success: boolean;
  data: {
    jobs: Job[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

interface JobStats {
  jobs: {
    total: number;
    active: number;
    paused: number;
    closed: number;
    newThisPeriod: number;
  };
  applications: {
    total: number;
    avgPerJob: string;
  };
  views: {
    total: number;
    avgPerJob: string;
  };
  timeRange: string;
}

const JobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 筛选和分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState('desc');
  const [total, setTotal] = useState(0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem(config.TOKEN_KEY);
    if (!token) {
      throw new Error('TOKEN_MISSING');
    }
    return {
      'Authorization': `${config.AUTH_HEADER_PREFIX} ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // 获取职位列表
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      });

      if (searchKeyword) params.append('search', searchKeyword);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${config.API_BASE_URL}/admin/jobs?${params}`, {
        headers
      });

      const data: JobListResponse = await response.json();
      
      if (data.success) {
        setJobs(data.data.jobs);
        setTotal(data.data.pagination.total);
        setError(null);
      } else {
        setError('获取职位列表失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        setError('登录状态已失效，请重新登录');
      } else {
        console.error('获取职位列表错误:', error);
        setError('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取职位统计数据
  const fetchJobStats = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${config.API_BASE_URL}/admin/jobs/stats`, {
        headers
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        setError('登录状态已失效，请重新登录');
      } else {
        console.error('获取职位统计错误:', error);
      }
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchJobStats();
  }, [currentPage, searchKeyword, statusFilter]);

  // 更新职位状态
  const updateJobStatus = async (jobId: string, newStatus: string, reason?: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${config.API_BASE_URL}/admin/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus, reason })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('职位状态更新成功');
        fetchJobs();
        fetchJobStats();
      } else {
        alert(data.message || '更新失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        alert('登录状态已失效，请重新登录');
      } else {
        console.error('更新职位状态错误:', error);
        alert('网络错误，请稍后重试');
      }
    }
  };

  // 查看职位详情
  const viewJobDetail = async (jobId: string) => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${config.API_BASE_URL}/admin/jobs/${jobId}`, {
        headers
      });

      const data = await response.json();
      
      if (data.success) {
        setSelectedJob(data.data);
        setShowDetailModal(true);
      } else {
        alert(data.message || '获取职位详情失败');
      }
    } catch (error) {
      console.error('获取职位详情错误:', error);
      alert('网络错误，请稍后重试');
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#52c41a';
      case 'PAUSED': return '#fa8c16';
      case 'CLOSED': return '#8c8c8c';
      default: return '#8c8c8c';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '活跃';
      case 'PAUSED': return '暂停';
      case 'CLOSED': return '关闭';
      default: return status;
    }
  };

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs();
  };

  if (loading && jobs.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>职位管理</h2>
        <p style={{ margin: 0, color: '#666' }}>查看、管理和操作平台上的所有职位信息</p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{stats.jobs.total}</div>
            <div style={{ color: '#666', marginTop: '4px' }}>职位总数</div>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{stats.jobs.active}</div>
            <div style={{ color: '#666', marginTop: '4px' }}>活跃职位</div>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>{stats.jobs.paused}</div>
            <div style={{ color: '#666', marginTop: '4px' }}>暂停职位</div>
          </div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>{stats.applications.total}</div>
            <div style={{ color: '#666', marginTop: '4px' }}>总申请数</div>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="搜索职位标题、描述或企业名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '120px'
            }}
          >
            <option value="">所有状态</option>
            <option value="ACTIVE">活跃</option>
            <option value="PAUSED">暂停</option>
            <option value="CLOSED">关闭</option>
          </select>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            搜索
          </button>
        </form>
      </div>

      {/* 职位列表 */}
      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {/* 表格头部 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr 100px 100px 80px 150px', 
          gap: '16px', 
          padding: '16px 20px', 
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          borderRadius: '8px 8px 0 0'
        }}>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>职位信息</div>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>企业</div>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>薪资/地点</div>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>浏览数</div>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>申请数</div>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>状态</div>
          <div style={{ fontWeight: 'bold', color: '#262626' }}>操作</div>
        </div>

        {/* 表格内容 */}
        {jobs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            {error ? error : '暂无职位数据'}
          </div>
        ) : (
          jobs.map((job) => (
            <div 
              key={job.id} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 100px 100px 80px 150px', 
                gap: '16px', 
                padding: '16px 20px', 
                borderBottom: '1px solid #f0f0f0',
                alignItems: 'center'
              }}
            >
              {/* 职位信息 */}
              <div>
                <div style={{ fontWeight: 'bold', color: '#262626', marginBottom: '4px' }}>{job.title}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {job.level} | {job.type === 'FULL_TIME' ? '全职' : job.type === 'PART_TIME' ? '兼职' : job.type}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* 企业信息 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {job.company.logo && (
                  <img 
                    src={job.company.logo} 
                    alt={job.company.name}
                    style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                  />
                )}
                <div>
                  <div style={{ fontSize: '14px', color: '#262626' }}>{job.company.name}</div>
                  {job.company.isVerified && (
                    <div style={{ fontSize: '12px', color: '#52c41a' }}>✓ 已认证</div>
                  )}
                </div>
              </div>

              {/* 薪资地点 */}
              <div>
                <div style={{ fontSize: '14px', color: '#262626' }}>{job.salary || '面议'}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{job.location}</div>
              </div>

              {/* 浏览数 */}
              <div style={{ fontSize: '14px', color: '#262626' }}>{job.viewCount}</div>

              {/* 申请数 */}
              <div style={{ fontSize: '14px', color: '#262626' }}>{job._count?.applications ?? 0}</div>

              {/* 状态 */}
              <div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'white',
                  background: getStatusColor(job.status)
                }}>
                  {getStatusText(job.status)}
                </span>
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => viewJobDetail(job.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  详情
                </button>
                {job.status === 'ACTIVE' ? (
                  <button
                    onClick={() => updateJobStatus(job.id, 'PAUSED')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      background: '#fa8c16',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    暂停
                  </button>
                ) : job.status === 'PAUSED' ? (
                  <button
                    onClick={() => updateJobStatus(job.id, 'ACTIVE')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      background: '#52c41a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    启用
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '12px' }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: currentPage === 1 ? '#f5f5f5' : '#fff',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            上一页
          </button>
          <span style={{ color: '#666' }}>
            第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(Math.ceil(total / pageSize), currentPage + 1))}
            disabled={currentPage >= Math.ceil(total / pageSize)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: currentPage >= Math.ceil(total / pageSize) ? '#f5f5f5' : '#fff',
              cursor: currentPage >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer'
            }}
          >
            下一页
          </button>
        </div>
      )}

      {/* 职位详情模态框 */}
      {showDetailModal && selectedJob && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>职位详情</h3>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                &times;
              </button>
            </div>
            
            <div>
              <h4 style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', marginBottom: '16px' }}>{selectedJob.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: '#fa8c16', fontSize: '18px', fontWeight: 'bold' }}>{selectedJob.salary || '面议'}</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {selectedJob.location} | {selectedJob.level} | {selectedJob.type}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{selectedJob.company.name}</div>
                  {selectedJob.company.isVerified && <span style={{ color: '#52c41a' }}>✓ 已认证</span>}
                </div>
              </div>

              <div>
                <h5 style={{ marginBottom: '8px' }}>职位描述</h5>
                <p style={{ color: '#666' }}>{selectedJob.description}</p>
              </div>

              <div>
                <h5 style={{ marginBottom: '8px' }}>职位要求</h5>
                <p style={{ color: '#666' }}>{selectedJob.requirements}</p>
              </div>

              {selectedJob.skills && (
                <div>
                  <h5 style={{ marginBottom: '8px' }}>技能要求</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedJob.skills.split(',').map(skill => (
                      <span key={skill} style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>状态: 
                    <span style={{ color: getStatusColor(selectedJob.status), marginLeft: '8px' }}>
                      {getStatusText(selectedJob.status)}
                    </span>
                  </span>
                  <span style={{ color: '#999', fontSize: '12px' }}>
                    发布于: {new Date(selectedJob.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '16px' }}>
                  <span>浏览量: {selectedJob.viewCount}</span>
                  <span>申请数: {selectedJob._count?.applications ?? 0}</span>
                  <span>面试数: {selectedJob._count?.interviews ?? 0}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagement;
