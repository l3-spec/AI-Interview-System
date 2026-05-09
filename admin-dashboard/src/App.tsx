import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuroraBackground } from './components/AuroraBackground';
import { FloatingParticles } from './components/FloatingParticles';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorBgBase: '#0a0f1f',
          colorTextBase: '#f1f5f9',
          colorPrimary: '#38bdf8',
          borderRadius: 10,
          fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
        },
        components: {
          Layout: {
            bodyBg: 'transparent',
            headerBg: 'transparent',
            siderBg: 'transparent',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
          },
        },
      }}
    >
      <AuthProvider>
        <Router>
          <AuroraBackground />
          <FloatingParticles count={25} />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
