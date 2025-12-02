import React, { createContext, useState, useContext, useEffect } from 'react';
import { AUTH_CONSTANTS } from '../config/constants';
import { authApi } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  isVerified: boolean;
}

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
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
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthContext: 初始化认证状态');
    // 从localStorage检查用户登录状态
    const storedUser = localStorage.getItem(AUTH_CONSTANTS.USER_KEY);
    const storedToken = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
    
    console.log('AuthContext: 存储的用户信息:', storedUser);
    console.log('AuthContext: 存储的token:', storedToken);
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('AuthContext: 解析用户数据:', userData);
        setUser(userData);
        setToken(storedToken);
      } catch (error) {
        console.error('解析存储的用户信息失败:', error);
        // 清除无效的存储数据
        localStorage.removeItem(AUTH_CONSTANTS.USER_KEY);
        localStorage.removeItem(AUTH_CONSTANTS.TOKEN_KEY);
      }
    }
    
    setLoading(false);
    console.log('AuthContext: 初始化完成');
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: 开始登录，邮箱:', email);
    try {
      // 使用API服务调用企业登录
      const response = await authApi.login(email, password) as any;
      console.log('AuthContext: 登录响应:', response);
      
      // 检查响应格式 - 后端返回的是直接的数据
      if (response && response.success && response.data && response.data.token) {
        console.log('AuthContext: 登录成功，设置用户信息');
        const userData: User = {
          id: response.data.company?.id?.toString() || '',
          email: response.data.company?.email || email,
          name: response.data.company?.name || '',
          role: 'company',
          permissions: [],
          isVerified: response.data.company?.isVerified || false
        };
        setToken(response.data.token);
        setUser(userData);
        
        // 存储用户信息和token
        localStorage.setItem(AUTH_CONSTANTS.USER_KEY, JSON.stringify(userData));
        localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, response.data.token);
        
        return true; // 登录成功
      } else {
        console.error('AuthContext: 登录响应格式错误:', response);
        return false; // 登录失败
      }
    } catch (error: any) {
      console.error('AuthContext: 登录错误:', error);
      // 返回false而不是抛出错误，让调用方处理
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_CONSTANTS.USER_KEY);
    localStorage.removeItem(AUTH_CONSTANTS.TOKEN_KEY);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
