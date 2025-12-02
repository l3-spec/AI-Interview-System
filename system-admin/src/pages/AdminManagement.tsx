import React, { useState, useEffect } from 'react';
import { config } from '../config/config';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
  isActive: boolean;
  createdAt: string;
}

interface AdminResponse {
  admins: Admin[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'ADMIN' as 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR'
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

  // 获取管理员列表
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { isActive: statusFilter })
      });

      const response = await fetch(`${config.API_BASE_URL}/admin/admins?${queryParams}`, {
        headers
      });

      const data = await response.json();
      
      if (data.success) {
        setAdmins(data.data.admins);
        setPagination(data.data.pagination);
        setError(null);
      } else {
        setError(data.message || '获取管理员列表失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        setError('登录状态已失效，请重新登录');
      } else {
        console.error('获取管理员列表错误:', error);
        setError('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 创建管理员
  const handleCreateAdmin = async () => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${config.API_BASE_URL}/admin/admins`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm)
      });

      const data = await response.json();
      
      if (data.success) {
        alert('管理员创建成功');
        setShowCreateModal(false);
        setCreateForm({ email: '', password: '', name: '', role: 'ADMIN' });
        fetchAdmins();
      } else {
        alert(data.message || '创建失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        alert('登录状态已失效，请重新登录');
      } else {
        console.error('创建管理员错误:', error);
        alert('网络错误，请稍后重试');
      }
    }
  };

  // 更新管理员状态
  const updateAdminStatus = async (adminId: string, isActive: boolean) => {
    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${config.API_BASE_URL}/admin/admins/${adminId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive })
      });

      const data = await response.json();
      
      if (data.success) {
        setAdmins(admins.map(admin => 
          admin.id === adminId ? { ...admin, isActive } : admin
        ));
        alert(`管理员${isActive ? '激活' : '禁用'}成功`);
      } else {
        alert(data.message || '操作失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        alert('登录状态已失效，请重新登录');
      } else {
        console.error('更新管理员状态错误:', error);
        alert('网络错误，请稍后重试');
      }
    }
  };

  // 删除管理员
  const deleteAdmin = async (adminId: string) => {
    if (!confirm('确定要删除这个管理员吗？此操作不可撤销。')) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      const response = await fetch(`${config.API_BASE_URL}/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      
      if (data.success) {
        setAdmins(admins.filter(admin => admin.id !== adminId));
        alert('管理员删除成功');
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error: any) {
      if (error?.message === 'TOKEN_MISSING') {
        alert('登录状态已失效，请重新登录');
      } else {
        console.error('删除管理员错误:', error);
        alert('网络错误，请稍后重试');
      }
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, roleFilter, statusFilter]);

  // 搜索处理
  const handleSearch = () => {
    setCurrentPage(1);
    fetchAdmins();
  };

  // 重置搜索
  const resetSearch = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
    fetchAdmins();
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取角色显示名称和颜色
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { name: '超级管理员', color: '#722ed1', bg: '#f9f0ff' };
      case 'ADMIN':
        return { name: '管理员', color: '#1890ff', bg: '#e6f7ff' };
      case 'MODERATOR':
        return { name: '协调员', color: '#52c41a', bg: '#f6ffed' };
      default:
        return { name: role, color: '#666', bg: '#f5f5f5' };
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
        <h2 style={{ margin: 0, marginBottom: '8px' }}>管理员管理</h2>
        <p style={{ margin: 0, color: '#666' }}>管理系统管理员账号和权限分配</p>
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
          <button 
            onClick={() => setShowCreateModal(true)}
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
            + 添加管理员
          </button>

          {/* 角色筛选 */}
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="all">全部角色</option>
            <option value="SUPER_ADMIN">超级管理员</option>
            <option value="ADMIN">管理员</option>
            <option value="MODERATOR">协调员</option>
          </select>

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
            <option value="true">活跃</option>
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
            placeholder="搜索姓名或邮箱..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              width: '200px',
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
          共有 <strong>{pagination.total}</strong> 个管理员
          {roleFilter !== 'all' && ` (${getRoleInfo(roleFilter).name})`}
          {statusFilter !== 'all' && ` (${statusFilter === 'true' ? '活跃' : '已禁用'})`}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          第 {pagination.page} 页，共 {pagination.totalPages} 页
        </div>
      </div>

      {/* 管理员列表 */}
      <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>管理员信息</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>角色</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>状态</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>创建时间</th>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => {
              const roleInfo = getRoleInfo(admin.role);
              return (
                <tr key={admin.id}>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#262626' }}>{admin.name}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{admin.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: roleInfo.bg, 
                      color: roleInfo.color,
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {roleInfo.name}
                    </span>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      background: admin.isActive ? '#f6ffed' : '#fff2e8', 
                      color: admin.isActive ? '#52c41a' : '#fa8c16',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {admin.isActive ? '活跃' : '已禁用'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
                    {formatDate(admin.createdAt)}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => updateAdminStatus(admin.id, !admin.isActive)}
                        style={{ 
                          padding: '4px 8px', 
                          background: admin.isActive ? '#fa8c16' : '#52c41a', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {admin.isActive ? '禁用' : '激活'}
                      </button>
                      {admin.role !== 'SUPER_ADMIN' && (
                        <button 
                          onClick={() => deleteAdmin(admin.id)}
                          style={{ 
                            padding: '4px 8px', 
                            background: '#ff4d4f', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          删除
                        </button>
                      )}
                    </div>
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

      {/* 创建管理员模态框 */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>添加管理员</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>邮箱</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="请输入邮箱"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>密码</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="请输入密码"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>姓名</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="请输入姓名"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>角色</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="ADMIN">管理员</option>
                <option value="MODERATOR">协调员</option>
                <option value="SUPER_ADMIN">超级管理员</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
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
                取消
              </button>
              <button
                onClick={handleCreateAdmin}
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
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement; 
