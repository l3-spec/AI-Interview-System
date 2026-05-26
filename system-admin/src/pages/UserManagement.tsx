import React, { useState, useEffect } from 'react';
import { config } from '../config/config';
import { buildAssetUrl } from '../utils/url';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  gender?: string;
  age?: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    interviews: number;
    applications: number;
  };
}

interface UserResponse {
  users: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
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

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { isActive: statusFilter })
      });

      const response = await fetch(`${config.API_BASE_URL}/admin/users?${queryParams}`, {
        headers
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
        setError(null);
      } else {
        setError(data.message || '获取用户列表失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        setError('登录状态已失效，请重新登录');
      } else {
        console.error('获取用户列表错误:', error);
        setError('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 更新用户状态
  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${config.API_BASE_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive })
      });

      const data = await response.json();
      
      if (data.success) {
        // 更新本地状态
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isActive } : user
        ));
        alert(`用户${isActive ? '激活' : '禁用'}成功`);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        alert('登录状态已失效，请重新登录');
      } else {
        console.error('更新用户状态错误:', error);
        alert('网络错误，请稍后重试');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, statusFilter]);

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  // 重置搜索
  const resetSearch = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
    fetchUsers();
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取性别显示文本
  const getGenderText = (gender?: string) => {
    switch (gender) {
      case 'MALE': return '男';
      case 'FEMALE': return '女';
      case 'OTHER': return '其他';
      default: return '未设置';
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
        <h2 style={{ margin: 0, marginBottom: '8px' }}>用户管理</h2>
        <p style={{ margin: 0, color: '#666' }}>管理系统中的所有求职者用户</p>
      </div>

      {/* 搜索和筛选工具栏 */}
      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 状态筛选 */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">全部状态</option>
            <option value="true">活跃用户</option>
            <option value="false">已禁用</option>
          </select>

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
            重置筛选
          </button>
        </div>

        {/* 搜索框 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="搜索用户姓名或邮箱..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              width: '250px',
              fontSize: '14px'
            }} 
          />
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
          共找到 <strong>{pagination.total}</strong> 个用户
          {statusFilter !== 'all' && ` (${statusFilter === 'true' ? '活跃' : '已禁用'})`}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          第 {pagination.page} 页，共 {pagination.totalPages} 页
        </div>
      </div>

      {/* 用户列表 */}
      <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>用户信息</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>基本资料</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>活动统计</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>状态</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>注册时间</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: user.avatar ? `url(${buildAssetUrl(user.avatar)})` : '#f0f0f0',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: '#666'
                    }}>
                      {!user.avatar && '👤'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#262626' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '14px' }}>
                    <div>性别: {getGenderText(user.gender)}</div>
                    {user.age && <div>年龄: {user.age}岁</div>}
                  </div>
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '14px' }}>
                    <div>面试: {user._count.interviews}次</div>
                    <div>申请: {user._count.applications}个</div>
                  </div>
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    background: user.isActive ? '#f6ffed' : '#fff2e8', 
                    color: user.isActive ? '#52c41a' : '#fa8c16',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {user.isActive ? '活跃' : '已禁用'}
                  </span>
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  {formatDate(user.createdAt)}
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => updateUserStatus(user.id, !user.isActive)}
                      style={{ 
                        padding: '4px 8px', 
                        background: user.isActive ? '#fa8c16' : '#52c41a', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {user.isActive ? '禁用' : '激活'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

export default UserManagement; 
