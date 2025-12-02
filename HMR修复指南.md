# Vite HMR 修复指南

## 问题描述

遇到Vite HMR错误：
```
Could not Fast Refresh ("useAuth" export is incompatible)
```

## 问题原因

1. **导出方式不一致**：React组件或Hook的导出方式不兼容Fast Refresh
2. **API响应类型错误**：TypeScript类型定义与实际API响应不匹配
3. **重复API前缀**：API调用路径有重复的 `/api` 前缀

## 解决方案

### 1. 修复AuthContext导出方式

**文件**: `admin-dashboard/src/contexts/AuthContext.tsx`

```typescript
// 确保导出方式一致
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 组件实现
};
```

### 2. 修复API响应类型

**问题**: API响应类型与实际后端返回不匹配

**解决方案**:
```typescript
// 正确的API调用方式
const response = await authApi.login(email, password);
// response 直接是后端返回的数据，不是包装在success字段中
```

### 3. 修复API路径

**问题**: 重复的 `/api` 前缀

**解决方案**:
- 使用代理配置时，API调用应使用相对路径
- 确保baseURL配置正确

### 4. 临时解决方案

如果TypeScript类型错误持续存在，可以：

1. **使用类型断言**:
```typescript
const response = await authApi.login(email, password) as any;
```

2. **禁用特定行的TypeScript检查**:
```typescript
// @ts-ignore
const response = await authApi.login(email, password);
```

3. **使用try-catch处理类型错误**:
```typescript
try {
  const response = await authApi.login(email, password);
  // 处理响应
} catch (error) {
  console.error('API调用失败:', error);
}
```

## 验证修复

1. 重启开发服务器
2. 检查浏览器控制台是否还有HMR错误
3. 测试登录功能是否正常
4. 确认API调用成功

## 预防措施

1. **统一导出方式**: 确保所有React组件使用一致的导出方式
2. **类型安全**: 为API响应定义正确的TypeScript接口
3. **代理配置**: 使用Vite代理时使用相对路径
4. **错误处理**: 添加适当的错误处理和类型检查

## 相关文件

- `admin-dashboard/src/contexts/AuthContext.tsx`
- `admin-dashboard/src/services/api.ts`
- `admin-dashboard/src/config/constants.ts`
- `admin-dashboard/vite.config.ts` 