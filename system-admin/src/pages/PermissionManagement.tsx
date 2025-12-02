import React from 'react';

const PermissionManagement: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>权限管理</h2>
        <p style={{ margin: 0, color: '#666' }}>管理系统权限和角色配置</p>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
        <p style={{ color: '#666', textAlign: 'center', fontSize: '16px' }}>
          🔐 权限管理功能正在开发中...
        </p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div style={{ display: 'inline-block', padding: '20px', background: '#f6f8fa', borderRadius: '8px' }}>
            <h4>计划功能：</h4>
            <ul style={{ textAlign: 'left', margin: '10px 0' }}>
              <li>角色权限配置</li>
              <li>功能权限管理</li>
              <li>数据权限控制</li>
              <li>API权限管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagement; 