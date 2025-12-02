import React, { createContext, useState, useContext, useEffect } from 'react';
import { config } from '../config/config';
import { authApi } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从localStorage检查用户登录状态
    const storedUser = localStorage.getItem(config.USER_KEY);
    const storedToken = localStorage.getItem(config.TOKEN_KEY);
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('解析存储的用户信息失败:', error);
        // 清除无效的存储数据
        localStorage.removeItem(config.USER_KEY);
        localStorage.removeItem(config.TOKEN_KEY);
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // 调用登录API
      const response = await authApi.login(email, password);

      if (response && response.success && response.data && response.data.token) {
        const userData: User = {
          id: response.data.admin?.id?.toString() || '',
          email: response.data.admin?.email || email,
          name: response.data.admin?.name || '',
          role: response.data.admin?.role || 'admin',
          permissions: response.data.admin?.permissions || []
        };
        
        setUser(userData);
        
        // 存储用户信息和token
        localStorage.setItem(config.USER_KEY, JSON.stringify(userData));
        localStorage.setItem(config.TOKEN_KEY, response.data.token);
        
        return true; // 登录成功
      } else {
        console.error('登录响应格式错误:', response);
        return false; // 登录失败
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      return false; // 登录失败
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('退出登录错误:', error);
    } finally {
      setUser(null);
      localStorage.removeItem(config.USER_KEY);
      localStorage.removeItem(config.TOKEN_KEY);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}; 