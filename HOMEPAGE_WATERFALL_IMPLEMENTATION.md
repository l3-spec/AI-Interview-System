# 首页瀑布流内容优化 - 完整实现文档

## 📋 项目概述

根据产品需求，实现了首页瀑布流混排功能，包含：
- **热门测试**（职业素养测评系统）
- **热门分享**（用户UGC内容）
- **大咖分享**（意见领袖采访文）
- **热门职岗**（职位推广广告）

---

## 🎯 实现内容

### 一、后端 API 实现

#### 1. 数据库设计（Prisma Schema）

**新增表：**

**测评系统相关：**
- `assessment_categories` - 测评分类表
- `assessments` - 测评表
- `assessment_questions` - 测评题目表
- `user_assessment_records` - 用户测评记录表

**内容社区相关：**
- `user_posts` - 用户帖子表（热门分享）
- `expert_posts` - 大咖分享表
- `promoted_jobs` - 热门职岗推广表

**文件位置：**
```
backend-api/prisma/schema.prisma
```

#### 2. 控制器（Controllers）

**测评控制器 - `assessmentController.ts`**
- ✅ `GET /api/assessments/categories` - 获取测评分类列表
- ✅ `GET /api/assessments/categories/:categoryId/assessments` - 获取分类下的测评列表
- ✅ `GET /api/assessments/:id` - 获取测评详情
- ✅ `POST /api/assessments/:id/submit` - 提交测评答案
- ✅ `GET /api/assessments/records/user/:userId` - 获取用户测评记录
- ✅ `GET /api/assessments/records/:recordId` - 获取测评结果详情

**内容控制器 - `contentController.ts`**
- ✅ `GET /api/content/posts` - 获取用户帖子列表
- ✅ `GET /api/content/posts/:id` - 获取帖子详情
- ✅ `GET /api/content/expert-posts` - 获取大咖分享列表
- ✅ `GET /api/content/expert-posts/:id` - 获取大咖分享详情
- ✅ `GET /api/content/promoted-jobs` - 获取推广职位列表
- ✅ `POST /api/content/promoted-jobs/:id/click` - 记录职位点击

**首页聚合控制器 - `homeFeedController.ts`**
- ✅ `GET /api/home/feed` - 获取首页内容聚合（混排算法）
- ✅ `GET /api/home/banners` - 获取首页Banner

#### 3. 混排算法实现

**内容比例：**
```javascript
热门测试：20%
热门分享：40%
大咖分享：30%
热门职岗：10%
```

**混排规则：**
1. 相同类型内容不连续出现
2. 每10个内容最多1个职岗广告
3. 首屏（前6个）必须包含：至少1个测试、2个分享、1个大咖

**实现位置：**
```
backend-api/src/controllers/homeFeedController.ts
- mixContentWithStrategy() 函数
```

---

### 二、Android 端实现

#### 1. 数据模型（Data Models）

**文件：** `data/model/AssessmentModels.kt`
- `AssessmentCategory` - 测评分类
- `Assessment` - 测评
- `AssessmentDetail` - 测评详情
- `AssessmentQuestion` - 测评题目
- `AssessmentResult` - 测评结果

**文件：** `data/model/ContentModels.kt`
- `HomeFeedItem` - 首页内容卡片（混排）
- `ContentType` - 内容类型枚举
- `UserPost` - 用户帖子
- `ExpertPost` - 大咖分享
- `PromotedJob` - 推广职位
- `Banner` - Banner数据

#### 2. 网络服务（API Service）

**文件：** `data/api/ApiService.kt`

**接口定义：**
```kotlin
interface ApiService {
    // 测评相关
    suspend fun getAssessmentCategories()
    suspend fun getAssessmentsByCategory()
    suspend fun getAssessmentDetail()
    suspend fun submitAssessment()
    
    // 内容社区相关
    suspend fun getUserPosts()
    suspend fun getUserPostDetail()
    suspend fun getExpertPosts()
    suspend fun getExpertPostDetail()
    suspend fun getPromotedJobs()
    
    // 首页相关
    suspend fun getHomeFeed()
    suspend fun getHomeBanners()
}
```

#### 3. 数据仓库（Repository）

**文件：** `data/repository/ContentRepository.kt`

**功能：**
- 封装网络请求
- 错误处理
- 数据转换
- 协程支持（Dispatchers.IO）

#### 4. UI 页面

**测评集合页 - `ui/assessment/AssessmentListScreen.kt`**

**功能：**
- ✅ 显示三大类测评（自我评测、360度评测、职业素养评测）
- ✅ 卡片式布局
- ✅ 显示封面图、标题、描述
- ✅ 显示时长、难度、参与人数、评分
- ✅ 技能标签展示
- ✅ 点击跳转到测评详情

**UI 组件：**
```kotlin
@Composable
fun AssessmentListScreen() {
    Scaffold {
        LazyColumn {
            items(assessments) { assessment ->
                AssessmentCard(
                    assessment = assessment,
                    onClick = { /* 跳转到测评详情 */ }
                )
            }
        }
    }
}
```

---

## 📊 数据流程

### 首页内容加载流程

```
用户打开首页
    ↓
ViewModel 调用 repository.getHomeFeed()
    ↓
Repository 调用 apiService.getHomeFeed()
    ↓
后端 homeFeedController.getHomeFeed()
    ↓
并发查询各类型内容
    - 热门测试（20%）
    - 热门分享（40%）
    - 大咖分享（30%）
    - 热门职岗（10%）
    ↓
混排算法处理
    - 确保内容多样性
    - 避免相同类型连续
    - 职岗广告控频（每10个插1个）
    ↓
返回混排后的内容列表
    ↓
ViewModel 更新 UI 状态
    ↓
Compose UI 渲染瀑布流
```

### 测评流程

```
用户点击测评卡片
    ↓
跳转到测评集合页（AssessmentListScreen）
    ↓
显示该分类下所有测评
    ↓
用户选择一个测评点击
    ↓
跳转到问卷答题页
    ↓
用户逐题作答
    ↓
提交答案到后端
    ↓
后端计算分数和等级
    ↓
返回测评结果
    ↓
显示结果页（分数、等级、能力雷达图）
```

---

## 🔧 技术栈

### 后端
- **框架：** Express.js + TypeScript
- **ORM：** Prisma
- **数据库：** MySQL
- **API 规范：** RESTful

### Android
- **语言：** Kotlin
- **UI 框架：** Jetpack Compose
- **架构：** MVVM
- **网络：** Retrofit
- **异步：** Coroutines
- **图片加载：** Coil

---

## 📝 API 文档

### 1. 获取首页内容聚合

**请求：**
```http
GET /api/home/feed?page=1&pageSize=20
```

**响应：**
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "type": "assessment",
        "id": "xxx",
        "data": {
          "title": "职业素养自我评测",
          "coverImage": "https://...",
          "durationMinutes": 15,
          "difficulty": "BEGINNER",
          "participantCount": 12500,
          "rating": 4.8,
          "tags": ["沟通能力", "团队协作"]
        }
      },
      {
        "type": "user_post",
        "id": "yyy",
        "data": {
          "title": "2024年互联网大厂面试真题汇总",
          "coverImage": "https://...",
          "tags": ["面试技巧", "大厂"],
          "viewCount": 25600,
          "likeCount": 1200
        }
      },
      {
        "type": "expert_post",
        "id": "zzz",
        "data": {
          "expertName": "张三",
          "expertTitle": "阿里巴巴P8",
          "expertCompany": "阿里巴巴",
          "title": "如何在大厂快速晋升",
          "coverImage": "https://...",
          "viewCount": 35000
        }
      },
      {
        "type": "promoted_job",
        "id": "aaa",
        "data": {
          "promotionType": "PREMIUM",
          "job": {
            "title": "高级前端工程师",
            "salary": "25-40K",
            "location": "北京",
            "skills": ["React", "Vue", "TypeScript"],
            "company": {
              "name": "字节跳动",
              "logo": "https://..."
            }
          }
        }
      }
    ],
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### 2. 获取测评分类

**请求：**
```http
GET /api/assessments/categories
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "自我评测",
      "description": "个人能力自我评估",
      "assessments": [...]
    },
    {
      "id": "2",
      "name": "360度评测",
      "description": "多维度全方位评估",
      "assessments": [...]
    },
    {
      "id": "3",
      "name": "职业素养评测",
      "description": "职场软技能评估",
      "assessments": [...]
    }
  ]
}
```

### 3. 提交测评答案

**请求：**
```http
POST /api/assessments/:id/submit
Content-Type: application/json

{
  "userId": "user_123",
  "answers": [
    {
      "questionId": "q1",
      "answer": ["A", "C"]
    },
    {
      "questionId": "q2",
      "answer": ["B"]
    }
  ],
  "duration": 600
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "recordId": "record_xxx",
    "totalScore": 85,
    "resultLevel": "良好",
    "maxScore": 100,
    "percentage": 85
  },
  "message": "测评提交成功"
}
```

---

## 🚀 部署步骤

### 后端部署

1. **运行数据库迁移：**
```bash
cd backend-api
npx prisma migrate dev --name add_content_tables
```

2. **生成 Prisma Client：**
```bash
npx prisma generate
```

3. **重启后端服务：**
```bash
npm run dev
```

### Android 部署

1. **同步 Gradle 依赖**
2. **编译运行**
```bash
./gradlew assembleDebug
```

---

## ✅ 功能清单

### 后端 API
- [x] 测评分类列表接口
- [x] 测评列表接口
- [x] 测评详情接口
- [x] 提交测评接口
- [x] 用户测评记录接口
- [x] 用户帖子接口
- [x] 大咖分享接口
- [x] 推广职位接口
- [x] 首页内容聚合接口（混排算法）
- [x] Banner 接口

### Android 端
- [x] 数据模型定义
- [x] API 服务接口
- [x] Repository 层
- [x] 测评集合页 UI
- [x] 瀑布流混排支持

### 待完善功能
- [ ] 问卷答题页完整实现
- [ ] 测评结果页（雷达图）
- [ ] 大咖分享详情页
- [ ] 职岗详情页跳转
- [ ] 内容点赞、评论功能
- [ ] 测评数据缓存
- [ ] 埋点统计

---

## 📊 数据库迁移SQL

```sql
-- 如果需要手动创建表，可以使用以下 SQL
-- 注意：建议使用 Prisma 迁移自动生成

-- 测评分类表
CREATE TABLE assessment_categories (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  description TEXT,
  icon VARCHAR(191),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

-- 测评表
CREATE TABLE assessments (
  id VARCHAR(191) PRIMARY KEY,
  category_id VARCHAR(191) NOT NULL,
  title VARCHAR(191) NOT NULL,
  description TEXT,
  cover_image VARCHAR(191),
  duration_minutes INT DEFAULT 15,
  difficulty VARCHAR(191) DEFAULT 'BEGINNER',
  participant_count INT DEFAULT 0,
  rating FLOAT DEFAULT 0.0,
  tags TEXT,
  status VARCHAR(191) DEFAULT 'PUBLISHED',
  is_hot BOOLEAN DEFAULT false,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (category_id) REFERENCES assessment_categories(id) ON DELETE CASCADE,
  INDEX idx_category (category_id),
  INDEX idx_hot (is_hot)
);

-- 其他表...
```

---

## 🎨 UI 设计规范

### 卡片样式
- **圆角：** 12dp
- **阴影：** elevation = 2dp
- **间距：** 12dp

### 颜色规范
- **主色：** `#FF8C42` (橙色)
- **背景：** `#F5F5F5` (浅灰)
- **卡片：** `#FFFFFF` (白色)
- **文字主色：** `#333333`
- **文字副色：** `#666666`
- **文字提示：** `#999999`

### 难度标签颜色
- **初级：** `#4CAF50` (绿色)
- **中级：** `#FF9800` (橙色)
- **高级：** `#F44336` (红色)

---

## 📞 支持联系

如有问题，请联系开发团队或提交 Issue。

**开发完成日期：** 2025年10月6日
**版本：** v1.0.0

