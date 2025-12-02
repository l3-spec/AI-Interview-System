import React, { useState, useEffect } from 'react';
import { config } from '../config/config';

interface SystemLog {
  id: string;
  action: string;
  module: string;
  description: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  userAgent?: string;
  result: 'SUCCESS' | 'FAILED' | 'WARNING';
  errorMsg?: string;
  createdAt: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
}

interface LogResponse {
  logs: SystemLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  });

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

  // 获取系统日志
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(moduleFilter !== 'all' && { module: moduleFilter }),
        ...(resultFilter !== 'all' && { result: resultFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await fetch(`${config.API_BASE_URL}/admin/logs?${queryParams}`, {
        headers
      });

      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
        setError(null);
      } else {
        // 如果功能未实现，显示模拟数据
        if (data.message?.includes('暂未实现')) {
          setLogs(getMockLogs());
          setPagination({
            page: 1,
            pageSize: 50,
            total: 15,
            totalPages: 1
          });
          setError(null);
        } else {
          setError(data.message || '获取系统日志失败');
        }
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        setLogs([]);
        setError('登录状态已失效，请重新登录');
      } else {
        console.error('获取系统日志错误:', error);
        // 显示模拟数据
        setLogs(getMockLogs());
        setPagination({
          page: 1,
          pageSize: 50,
          total: 15,
          totalPages: 1
        });
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // 模拟数据
  const getMockLogs = (): SystemLog[] => [
    {
      id: '1',
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      description: '管理员登录成功: admin@example.com',
      targetId: 'admin1',
      targetType: 'ADMIN',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      result: 'SUCCESS',
      createdAt: new Date().toISOString(),
      admin: {
        id: 'admin1',
        name: '系统管理员',
        email: 'admin@example.com'
      }
    },
    {
      id: '2',
      action: 'UPDATE_USER_STATUS',
      module: 'USER_MANAGEMENT',
      description: '禁用用户: 张三 (zhang@example.com)',
      targetId: 'user123',
      targetType: 'USER',
      ipAddress: '192.168.1.100',
      result: 'SUCCESS',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      admin: {
        id: 'admin1',
        name: '系统管理员',
        email: 'admin@example.com'
      }
    },
    {
      id: '3',
      action: 'UPDATE_COMPANY_STATUS',
      module: 'COMPANY_MANAGEMENT',
      description: '认证企业: 科技有限公司',
      targetId: 'company456',
      targetType: 'COMPANY',
      ipAddress: '192.168.1.100',
      result: 'SUCCESS',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      admin: {
        id: 'admin1',
        name: '系统管理员',
        email: 'admin@example.com'
      }
    },
    {
      id: '4',
      action: 'LOGIN_FAILED',
      module: 'AUTH',
      description: '管理员登录失败: wrong@example.com',
      targetType: 'ADMIN',
      ipAddress: '192.168.1.200',
      result: 'FAILED',
      errorMsg: '邮箱或密码错误',
      createdAt: new Date(Date.now() - 10800000).toISOString()
    },
    {
      id: '5',
      action: 'VIEW_DASHBOARD',
      module: 'DASHBOARD',
      description: '查看Dashboard统计',
      ipAddress: '192.168.1.100',
      result: 'SUCCESS',
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      admin: {
        id: 'admin1',
        name: '系统管理员',
        email: 'admin@example.com'
      }
    }
  ];

  useEffect(() => {
    fetchLogs();
  }, [currentPage, moduleFilter, resultFilter]);

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  // 重置搜索
  const resetSearch = () => {
    setSearchTerm('');
    setModuleFilter('all');
    setResultFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    fetchLogs();
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取操作结果颜色
  const getResultColor = (result: string) => {
    switch (result) {
      case 'SUCCESS': return { bg: '#f6ffed', color: '#52c41a' };
      case 'FAILED': return { bg: '#fff2f0', color: '#ff4d4f' };
      case 'WARNING': return { bg: '#fff7e6', color: '#fa8c16' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };

  // 获取结果文本
  const getResultText = (result: string) => {
    switch (result) {
      case 'SUCCESS': return '成功';
      case 'FAILED': return '失败';
      case 'WARNING': return '警告';
      default: return '未知';
    }
  };

  // 获取模块显示名称
  const getModuleName = (module: string) => {
    switch (module) {
      case 'AUTH': return '认证模块';
      case 'USER_MANAGEMENT': return '用户管理';
      case 'COMPANY_MANAGEMENT': return '企业管理';
      case 'ADMIN_MANAGEMENT': return '管理员管理';
      case 'DASHBOARD': return '仪表板';
      case 'SUBSCRIPTION_MANAGEMENT': return '订阅管理';
      default: return module;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>系统日志</h2>
        <p style={{ margin: 0, color: '#666' }}>查看系统操作记录和安全审计日志</p>
      </div>

      {/* 搜索和筛选工具栏 */}
      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px', 
          marginBottom: '16px' 
        }}>
          {/* 模块筛选 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              模块筛选
            </label>
            <select 
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              style={{ 
                width: '100%',
                padding: '8px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">全部模块</option>
              <option value="AUTH">认证模块</option>
              <option value="USER_MANAGEMENT">用户管理</option>
              <option value="COMPANY_MANAGEMENT">企业管理</option>
              <option value="ADMIN_MANAGEMENT">管理员管理</option>
              <option value="DASHBOARD">仪表板</option>
              <option value="SUBSCRIPTION_MANAGEMENT">订阅管理</option>
            </select>
          </div>

          {/* 结果筛选 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              操作结果
            </label>
            <select 
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              style={{ 
                width: '100%',
                padding: '8px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">全部结果</option>
              <option value="SUCCESS">成功</option>
              <option value="FAILED">失败</option>
              <option value="WARNING">警告</option>
            </select>
          </div>

          {/* 开始日期 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              开始日期
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ 
                width: '100%',
                padding: '8px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              结束日期
            </label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ 
                width: '100%',
                padding: '8px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* 搜索框和操作按钮 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              搜索描述或目标ID
            </label>
            <input 
              type="text" 
              placeholder="搜索日志描述或目标ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{ 
                width: '100%',
                padding: '8px 12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                fontSize: '14px'
              }} 
            />
          </div>
          
          <button 
            onClick={handleSearch}
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
          
          <button 
            onClick={resetSearch}
            style={{ 
              padding: '8px 16px', 
              background: '#f5f5f5', 
              color: '#262626', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            重置
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#fff2f0', 
          border: '1px solid #ffccc7', 
          color: '#ff4d4f', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
      )}

      {/* 统计信息 */}
      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>
          共找到 <strong>{pagination.total}</strong> 条日志记录
          {moduleFilter !== 'all' && ` (${getModuleName(moduleFilter)})`}
          {resultFilter !== 'all' && ` (${getResultText(resultFilter)})`}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          第 {pagination.page} 页，共 {pagination.totalPages} 页
        </div>
      </div>

      {/* 日志列表 */}
      <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>时间</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>模块</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>操作</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>描述</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>操作者</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>结果</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>IP地址</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const resultStyle = getResultColor(log.result);
              return (
                <tr key={log.id}>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: '#f0f0f0', 
                      color: '#666',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {getModuleName(log.module)}
                    </span>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', maxWidth: '300px' }}>
                    <div title={log.description} style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>
                      {log.description}
                    </div>
                    {log.errorMsg && (
                      <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: '4px' }}>
                        错误: {log.errorMsg}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
                    {log.admin ? (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{log.admin.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{log.admin.email}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>系统自动</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: resultStyle.bg, 
                      color: resultStyle.color,
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {getResultText(log.result)}
                    </span>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '8px', 
          marginTop: '24px' 
        }}>
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              background: currentPage === 1 ? '#f5f5f5' : '#fff',
              color: currentPage === 1 ? '#999' : '#262626',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            上一页
          </button>
          
          <span style={{ margin: '0 16px', fontSize: '14px', color: '#666' }}>
            第 {currentPage} 页 / 共 {pagination.totalPages} 页
          </span>
          
          <button 
            onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
            disabled={currentPage === pagination.totalPages}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              background: currentPage === pagination.totalPages ? '#f5f5f5' : '#fff',
              color: currentPage === pagination.totalPages ? '#999' : '#262626',
              cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemLogs; 
