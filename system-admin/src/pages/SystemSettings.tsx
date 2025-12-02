import React from 'react';

const SystemSettings: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>系统设置</h2>
        <p style={{ margin: 0, color: '#666' }}>配置系统参数和全局设置</p>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
        <p style={{ color: '#666', textAlign: 'center', fontSize: '16px' }}>
          ⚙️ 系统设置功能正在开发中...
        </p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div style={{ display: 'inline-block', padding: '20px', background: '#f6f8fa', borderRadius: '8px' }}>
            <h4>计划功能：</h4>
            <ul style={{ textAlign: 'left', margin: '10px 0' }}>
              <li>系统参数配置</li>
              <li>邮件服务设置</li>
              <li>文件存储配置</li>
              <li>安全策略设置</li>
              <li>日志管理配置</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings; 