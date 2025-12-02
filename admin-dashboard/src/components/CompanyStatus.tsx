import React from 'react';

interface CompanyStatusProps {
  isVerified: boolean;
  isActive: boolean;
  subscriptionEndDate: Date | null;
}

const CompanyStatus: React.FC<CompanyStatusProps> = ({
  isVerified,
  isActive,
  subscriptionEndDate
}) => {
  const now = new Date();
  const isSubscriptionValid = subscriptionEndDate && new Date(subscriptionEndDate) > now;
  const daysLeft = subscriptionEndDate
    ? Math.ceil((new Date(subscriptionEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>企业状态</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 认证状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isVerified ? '#52c41a' : '#faad14'
          }} />
          <span style={{ color: '#262626' }}>
            认证状态：
            <span style={{ color: isVerified ? '#52c41a' : '#faad14' }}>
              {isVerified ? '已认证' : '未认证'}
            </span>
          </span>
        </div>

        {/* 账号状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isActive ? '#52c41a' : '#ff4d4f'
          }} />
          <span style={{ color: '#262626' }}>
            账号状态：
            <span style={{ color: isActive ? '#52c41a' : '#ff4d4f' }}>
              {isActive ? '正常' : '已禁用'}
            </span>
          </span>
        </div>

        {/* 订阅状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isSubscriptionValid ? '#52c41a' : '#ff4d4f'
          }} />
          <span style={{ color: '#262626' }}>
            订阅状态：
            <span style={{
              color: isSubscriptionValid ? '#52c41a' : '#ff4d4f'
            }}>
              {isSubscriptionValid ? '有效' : '已过期'}
            </span>
          </span>
        </div>

        {/* 剩余时间 */}
        {subscriptionEndDate && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {isSubscriptionValid ? (
              <span>
                订阅剩余：
                <strong style={{ color: daysLeft <= 7 ? '#ff4d4f' : '#262626' }}>
                  {daysLeft}天
                </strong>
              </span>
            ) : (
              <span style={{ color: '#ff4d4f' }}>
                订阅已过期
              </span>
            )}
          </div>
        )}

        {/* 功能限制提示 */}
        {(!isVerified || !isSubscriptionValid) && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#faad14'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>功能限制提示：</div>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {!isVerified && (
                <li>企业未认证，发布的职位将不会在外网显示</li>
              )}
              {!isSubscriptionValid && (
                <>
                  <li>无法接收新的简历投递</li>
                  <li>无法发送面试邀请</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyStatus; 