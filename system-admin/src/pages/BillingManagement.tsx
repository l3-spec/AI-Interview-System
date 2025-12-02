import React from 'react';

const BillingManagement: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>计费管理</h2>
        <p style={{ margin: 0, color: '#666' }}>管理企业套餐、续费和财务统计</p>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
        <p style={{ color: '#666', textAlign: 'center', fontSize: '16px' }}>
          💰 计费管理功能正在开发中...
        </p>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <div style={{ display: 'inline-block', padding: '20px', background: '#f6f8fa', borderRadius: '8px' }}>
            <h4>计划功能：</h4>
            <ul style={{ textAlign: 'left', margin: '10px 0' }}>
              <li>套餐管理和定价</li>
              <li>自动续费设置</li>
              <li>财务报表统计</li>
              <li>发票管理</li>
              <li>支付记录查询</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingManagement; 