import React from 'react';

const Settings: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>系统设置</h2>
        <p style={{ margin: 0, color: '#666' }}>管理系统配置和全局设置</p>
      </div>

      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0' }}>基本设置</h3>
        {/* 这里添加设置项 */}
      </div>
    </div>
  );
};

export default Settings; 