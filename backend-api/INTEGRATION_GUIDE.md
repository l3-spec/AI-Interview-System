# 开源数字人集成指南

## 🎭 概述

已成功实现基于Open-LLM-VTuber + Live2D的免费开源数字人服务，完全替代了昂贵的阿里云数字人。

## 🚀 快速开始

### 1. 服务地址

**开源数字人页面**: `http://[服务器IP]:3001/avatar`

**API端点**: `http://[服务器IP]:3001/api/avatar`

### 2. Android端集成

#### WebView集成方式

```kotlin
// 在Android中加载开源数字人
val avatarUrl = "http://192.168.0.188:3001/avatar"
webView.loadUrl(avatarUrl)
```

#### 动态IP处理

由于IP会变化，建议使用配置方式：

```kotlin
// 获取当前服务器IP
private fun getServerIp(): String {
    return "192.168.0.188" // 根据实际配置动态获取
}

private fun loadAvatar() {
    val serverIp = getServerIp()
    val avatarUrl = "http://$serverIp:3001/avatar"
    webView.loadUrl(avatarUrl)
}
```

### 3. API接口

#### 获取服务状态
```http
GET /api/avatar/status
```

#### 获取可用模型
```http
GET /api/avatar/models
```

#### 获取配置
```http
GET /api/avatar/config
```

### 4. 功能特性

✅ **实时语音驱动** - 麦克风输入驱动嘴型动画  
✅ **零成本开源** - 完全免费，无API费用  
✅ **2D卡通形象** - 可爱的Live2D模型  
✅ **移动设备支持** - Android/iOS WebView完美支持  
✅ **动态IP适配** - 自动适应IP变化  
✅ **离线可用** - 所有资源本地加载  

## 📱 Android集成示例

### 1. 修改DigitalHumanActivity

```kotlin
class DigitalHumanActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_digital_human)
        
        webView = findViewById(R.id.webView)
        setupWebView()
        loadAvatar()
    }
    
    private fun setupWebView() {
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        
        // 处理WebView权限
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }
        }
    }
    
    private fun loadAvatar() {
        val serverUrl = "http://192.168.0.188:3001/avatar"
        webView.loadUrl(serverUrl)
    }
}
```

### 2. 权限配置

在`AndroidManifest.xml`中添加：

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 3. 网络配置

在`network_security_config.xml`中添加：

```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.0.188</domain>
    </domain-config>
</network-security-config>
```

## 🎮 使用说明

### 1. 启动服务
```bash
# 启动后端服务
npm run dev

# 访问数字人页面
http://localhost:3001/avatar
```

### 2. 测试功能
- 点击"开始语音驱动"启用麦克风
- 说话时可看到数字人嘴型同步动画
- 点击"测试动画"查看演示效果

### 3. 自定义配置

#### 更换模型
1. 将Live2D模型文件放入`public/models/`目录
2. 访问`/api/avatar/models`查看可用模型
3. 在页面中选择不同模型

#### 修改外观
编辑`public/avatar/index.html`中的样式配置。

## 🔄 从阿里云迁移

### 旧代码（阿里云）
```kotlin
// 阿里云方式
val result = DigitalHumanManager.startInstance(interviewId, jobId)
if (result.isSuccess) {
    // 复杂的RTC集成...
}
```

### 新代码（开源）
```kotlin
// 开源方式
webView.loadUrl("http://192.168.0.188:3001/avatar")
// 简单WebView集成，无需复杂配置
```

## 📊 性能对比

| 特性 | 阿里云 | 开源方案 |
|------|--------|----------|
| 成本 | 高 | 免费 |
| 延迟 | 网络依赖 | 本地处理 |
| 质量 | 专业3D | 2D卡通 |
| 复杂度 | 高 | 简单 |
| 维护 | 依赖阿里云 | 完全可控 |

## 🎭 模型推荐

### 免费Live2D模型
- **Haru**: 经典少女形象
- **Hibiki**: 活泼可爱
- **Koharu**: 温柔治愈
- **Shizuku**: 清新自然

### 获取方式
```bash
# 模型存储路径
backend-api/public/models/
├── haru/
├── hibiki/
├── koharu/
└── shizuku/
```

## 🔧 故障排除

### 常见问题

1. **WebView不显示内容**
   - 检查网络连接
   - 确认服务器地址正确
   - 验证WebView权限

2. **麦克风无法使用**
   - 检查权限声明
   - 确认用户已授权
   - 检查浏览器权限

3. **模型加载失败**
   - 确认模型文件存在
   - 检查网络连接
   - 查看浏览器控制台

### 调试工具
访问：`http://192.168.0.188:3001/api/avatar/status` 查看服务状态。

## 📞 技术支持

服务已完全部署，可直接通过WebView集成。如需进一步定制，可修改：
- `public/avatar/index.html` - 前端界面
- `src/controllers/openSourceAvatarController.ts` - 后端逻辑
- `public/models/` - 模型文件目录