# 简历报告 API 结口设计 (Resume Report)

为了配合原生渲染的高保真 UI 设计稿，后端需要提供一份更详细的**报告数据接口**。
目前的 `/api/ai-interview/sessions/:id` (或者新的 endpoint `/api/ai-interview/reports/:id`) 需要返回如下 JSON 结构。

> [!NOTE]
> 该设计基于 Android 客服端中使用的 `ResumeReport` 数据模型，确保 Figma 上的图表、最佳匹配、建议和岗位推荐能精准呈现。

## 请求地址与方法
`GET /api/v1/ai-interview/sessions/:sessionId/report`
(或者可将其补充在原有 getSession 详细接口中 `data.report` 节点下)

## 返回数据结构 (JSON)

```json
{
  "success": true,
  "data": {
    "title": "柚汀教育科技视频简历报告",
    "testedAt": "测试日期 10月17日 22:58",
    "bestMatch": {
      "title": "研发类",
      "description": "具有极强的创新能力、并且对于开放环境感到放松，很适合在初创公司里担任研发工作，能够产生很多的创新产品。",
      "matchRatio": 0.95
    },
    "competencies": [
      {
        "name": "学习研究",
        "score": 0.95,
        "ratingLabel": "优秀",
        "description": "在工作中表现出极强的学习和研究能力，对于新的知识和技能能够快速掌握，对于复杂的问题能够深入研究并找到解决方案。"
      },
      {
        "name": "团队协作",
        "score": 0.90,
        "ratingLabel": "优秀",
        "description": "在团队合作中表现出色，能够快速融入团队..."
      },
      {
        "name": "人际沟通",
        "score": 0.85,
        "ratingLabel": "良好",
        "description": "在人际沟通中表现出良好的沟通能力..."
      },
      {
        "name": "压力承受",
        "score": 0.85,
        "ratingLabel": "良好",
        "description": "在压力下能够保持冷静，能够承受一定的工作压力..."
      },
      {
        "name": "成就导向",
        "score": 0.95,
        "ratingLabel": "优秀",
        "description": "在工作中表现出极强的成就导向，对于目标..."
      },
      {
        "name": "开放创新",
        "score": 0.90,
        "ratingLabel": "优秀",
        "description": "在工作中表现出极强的创新能力，对于新的事物..."
      }
    ],
    "tips": "你的团队协作能力很好，继续保持～对于一些高压的情况下也可以尝试深呼吸，你可以做的更好～也可以多关注一下身边人的情绪，这样你在团队协同中会表现得更好。",
    "generatedNote": "报告生成于10月17日 报告有效期为您测试日为准后之一年内有效",
    "recommendedJobs": [
      {
        "title": "前端开发",
        "salaryRange": "10-20K",
        "tags": ["本科", "经验不限", "弹性工作"],
        "companyName": "星链科技",
        "companyDescription": "A轮 | 100-499人",
        "location": "上海 徐汇区"
      },
      {
        "title": "后端开发",
        "salaryRange": "15-30K",
        "tags": ["本科", "3-5年", "双休"],
        "companyName": "未来之力",
        "companyDescription": "B轮 | 500-999人",
        "location": "北京 海淀区"
      }
    ]
  }
}
```

## 字段说明

| 字段映射 | 类型 | 说明 |
| :--- | :--- | :--- |
| `title` | String | 报告大标题，如 `柚汀教育科技视频简历报告` |
| `testedAt` | String | 顶部测评日期时间展示，如 `测试日期 10月17日 22:58` |
| `bestMatch.title` | String | 匹配岗位分类大写，如 `研发类` |
| `bestMatch.description` | String | 解释为什么推荐该类别的评语 |
| `bestMatch.matchRatio` | Float | 匹配度百分比 (0.00 ~ 1.00，客户端自动格式化为如 `95%`) |
| `competencies` | Array | 雷达图所需的六边形（六大维度）数据数组，需要固定6个（对应UI） |
| `competencies[].name` | String | 维度名称（如 "开放创新"） |
| `competencies[].score` | Float | **雷达图及进度条真实数值**，区间 (0.00 ~ 1.00) |
| `competencies[].ratingLabel`| String | UI 进度条右侧的橙色文字评级角标（如"优秀"、"良好"）|
| `tips` | String | 针对用户的总结性职场改善或者夸奖建议 |
| `generatedNote` | String | 底部卡片的生成时间和有效期说明 |
| `recommendedJobs` | Array | 底部关联推荐的工作列表 |

> [!TIP] 
> 后端可以直接基于大语言模型(LLM) 对面试完成者的对话进行提取，按以上 Schema 格式化输出，直接持久化到数据库中。后期 Android 客户端拿到上述结构就能直接映射到对应的 `ResumeReport` 数据类中完成渲染。
