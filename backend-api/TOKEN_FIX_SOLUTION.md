# 🔧 Token验证失败完整解决方案

## 🚨 问题确认

根据调试结果，后端Token验证机制完全正常，问题出现在前端Token存储或格式上。

### 问题现象：
- system-admin 访问 `/api/admin/dashboard/stats` 返回 401 错误
- 错误信息: "令牌验证失败"
- Network面板显示 Authorization header 可能为空或格式错误

## 🔍 根本原因分析

### 1. Token类型不匹配
前端可能存储了错误类型的Token：
- 期望: `type: 'admin'`
- 实际: `type: 'user'` 或其他类型

### 2. Token格式错误
- 空Token: `Authorization: Bearer `
- 格式错误: `Authorization: <token>` (缺少Bearer前缀)
- 无效Token: 签名错误或已过期

### 3. 前端存储问题
- localStorage中的Token被清除或损坏
- 多个应用之间的Token冲突

## 🛠️ 立即修复方案

### 方案1: 清除缓存重新登录 (推荐)

```javascript
// 在浏览器控制台执行
localStorage.clear();
window.location.reload();
```

然后使用正确账号登录：
- **邮箱**: `superadmin@aiinterview.com`
- **密码**: `superadmin123`

### 方案2: 手动设置正确Token

```javascript
// 在浏览器控制台执行
const correctToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkMzJmOTAzLTcyNjEtNGEzYS1iYTg4LTRjODFjYzRkYjlhYSIsImVtYWlsIjoic3VwZXJhZG1pbkBhaWludGVydmlldy5jb20iLCJ0eXBlIjoiYWRtaW4iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NTUwMTI5MzAsImV4cCI6MTc1NTA5OTMzMH0.QkwdLAlh-_LF2cCoJliokbkdheS21POCFXpOpJIZ9go';

localStorage.setItem('admin_token', correctToken);
localStorage.setItem('admin_user', JSON.stringify({
  id: 'ad32f903-7261-4a3a-ba88-4c81cc4db9aa',
  email: 'superadmin@aiinterview.com',
  name: '超级管理员',
  role: 'SUPER_ADMIN'
}));

window.location.reload();
```

### 方案3: 检查并修复Token

```javascript
// 在浏览器控制台执行
const token = localStorage.getItem('admin_token');
console.log('当前Token:', token);

if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token内容:', payload);
    
    if (payload.type !== 'admin') {
      console.log('❌ Token类型错误，需要重新登录');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.reload();
    }
  } catch (e) {
    console.log('❌ Token解析失败，需要重新登录');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.reload();
  }
} else {
  console.log('❌ 没有找到Token，需要登录');
}
```

## 🔐 各端认证方式详解

### 1. 系统管理后台 (system-admin)
- **端口**: 5175
- **Token类型**: `admin`
- **默认账号**: `superadmin@aiinterview.com` / `superadmin123`
- **权限**: 系统管理、用户管理、企业管理等

### 2. 企业管理后台 (admin-dashboard)
- **端口**: 5174
- **Token类型**: `company`
- **默认账号**: `company@example.com` / `company123`
- **权限**: 企业管理、职位管理、候选人管理等

### 3. 移动端应用 (android-app)
- **Token类型**: `user`
- **权限**: 面试、个人信息管理等

## 📊 验证步骤

### 1. 检查Token内容
```javascript
// 在浏览器控制台执行
const token = localStorage.getItem('admin_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token类型:', payload.type);
  console.log('用户邮箱:', payload.email);
  console.log('用户角色:', payload.role);
  console.log('是否过期:', new Date(payload.exp * 1000) < new Date());
}
```

### 2. 检查Network请求
1. 打开浏览器开发者工具
2. 切换到Network标签
3. 刷新页面
4. 查看API请求的Headers
5. 确认Authorization header格式正确

### 3. 测试API请求
```bash
# 使用curl测试
curl -H "Authorization: Bearer <your-token>" \
     http://localhost:3001/api/admin/dashboard/stats
```

## 🎯 预防措施

### 1. 前端Token管理
```typescript
// 确保登录时正确设置Token
const login = async (email: string, password: string) => {
  const response = await authApi.login(email, password);
  if (response.success && response.data) {
    localStorage.setItem('admin_token', response.data.token);
    localStorage.setItem('admin_user', JSON.stringify(response.data.admin));
  }
};
```

### 2. Token自动刷新
```typescript
// 在API拦截器中检查Token过期
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        // Token过期，清除并重定向到登录页
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject('Token已过期');
      }
    } catch (e) {
      // Token格式错误，清除并重定向到登录页
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject('Token格式错误');
    }
  }
  return config;
});
```

### 3. 错误处理
```typescript
// 在响应拦截器中处理401错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## ✅ 验证修复结果

修复成功后，你应该看到：

1. **浏览器界面**: 不再显示"令牌验证失败"错误
2. **Network面板**: API请求返回200状态码
3. **控制台**: 没有认证相关错误
4. **功能**: 可以正常访问系统管理功能

## 🔧 如果问题仍然存在

如果按照上述方案操作后问题仍然存在，请：

1. **检查后端日志**:
   ```bash
   tail -f backend-api/logs/app.log | grep "Token验证"
   ```

2. **检查环境变量**:
   ```bash
   echo $JWT_SECRET
   ```

3. **重启服务**:
   ```bash
   # 重启后端服务
   cd backend-api && npm run dev
   
   # 重启前端服务
   cd system-admin && npm run dev
   ```

4. **联系技术支持**: 提供详细的错误日志和操作步骤

---

**总结**: Token验证失败主要是前端Token存储问题，按照上述方案操作即可解决。确保使用正确的账号登录，并检查Token格式和类型。 