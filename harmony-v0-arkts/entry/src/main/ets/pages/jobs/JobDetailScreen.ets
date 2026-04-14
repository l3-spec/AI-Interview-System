// JobDetailScreen.ets - 职位详情页面
// 参考 Android JobDetailScreen.kt 实现完整功能

const PageBackground = Color.fromARGB(255, 245, 245, 245);
const AccentOrange = Color.fromARGB(255, 255, 125, 56);
const TextPrimary = Color.fromARGB(255, 34, 34, 34);
const TextSecondary = Color.fromARGB(255, 102, 102, 102);
const TextTertiary = Color.fromARGB(255, 153, 153, 153);
const CardBackground = Color.White;
const ChipBackground = Color.fromARGB(255, 245, 247, 250);
const ChipText = Color.fromARGB(255, 95, 103, 115);
const DividerColor = Color.fromARGB(255, 229, 231, 235);

// 职位详情数据模型
export interface JobDetail {
  id: string;
  title: string;
  salary: string;
  education: string;
  experience: string;
  tags: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  company: string;
  companyId: string;
  companyLogo: string;
  companyTagline: string;
  location: string;
  category: string;
}

// 推荐的职位数据
export interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  companyTagline: string;
  salary: string;
  location: string;
  education: string;
  experience: string;
  tags: string[];
}

// JobDetailScreen Props
export interface JobDetailScreenProps {
  jobId: string;
  onBack: () => void;
  onCompanyClick: (companyId: string) => void;
  onJobClick: (jobId: string) => void;
  onStartInterview: (position: string, category: string) => void;
}

// 模拟职位详情数据
const mockJobDetail: JobDetail = {
  id: 'job_1',
  title: '前端开发工程师',
  salary: '25-50k·16薪',
  education: '本科',
  experience: '3-5年',
  tags: ['React', 'TypeScript', '前端工程化'],
  description: '负责公司核心产品的前端开发工作，参与技术架构设计与优化。\n\n我们希望你：\n1. 具备扎实的前端基础，熟悉React/Vue等主流框架\n2. 良好的代码规范意识和团队协作能力\n3. 对技术有热情，追求卓越',
  responsibilities: [
    '负责产品前端模块的设计与开发',
    '参与技术方案评审，推动技术改进',
    '优化前端性能，提升用户体验'
  ],
  requirements: [
    '3年以上前端开发经验',
    '精通React或Vue，熟悉工程化实践',
    '熟悉前端性能优化，了解常见安全问题',
    '良好的沟通能力和团队协作精神'
  ],
  company: '字节跳动',
  companyId: 'company_1',
  companyLogo: '',
  companyTagline: '短视频领先者',
  location: '北京 海淀区',
  category: '前端开发'
};

// 模拟推荐职位
const mockRecommendedJobs: RecommendedJob[] = [
  {
    id: 'job_2',
    title: '高级前端开发工程师',
    company: '腾讯',
    companyLogo: '',
    companyTagline: '科技向善',
    salary: '35-60k',
    location: '深圳',
    education: '本科',
    experience: '5-10年',
    tags: ['React', '前端架构']
  },
  {
    id: 'job_3',
    title: '前端开发',
    company: '阿里巴巴',
    companyLogo: '',
    companyTagline: '让天下没有难做的生意',
    salary: '20-40k',
    location: '杭州',
    education: '本科',
    experience: '1-3年',
    tags: ['Vue', 'JavaScript']
  }
];

@Component
export struct JobDetailScreen {
  private props: JobDetailScreenProps;
  @State private jobDetail: JobDetail = mockJobDetail;
  @State private recommendedJobs: RecommendedJob[] = mockRecommendedJobs;
  @State private isDescriptionExpanded: boolean = false;
  @State private isApplying: boolean = false;
  @State private applySuccess: boolean = false;
  @State private isLoading: boolean = false;

  build() {
    Stack() {
      // 背景色
      Column() {
        Column() {
          Blank()
        }
        .width('100%')
        .height('100%')
        .backgroundColor(PageBackground)
      }
      .width('100%')
      .height('100%')

      // 主内容
      Column() {
        // 顶部导航栏
        this.buildTopBar()

        // 内容列表
        List() {
          // 职位概要卡片
          ListItem() {
            this.buildJobSummaryCard()
          }

          // 公司信息卡片
          ListItem() {
            this.buildCompanyCard()
          }

          // 职位描述卡片
          ListItem() {
            this.buildDescriptionCard()
          }

          // 任职要求卡片
          ListItem() {
            this.buildRequirementsCard()
          }

          // 推荐职位
          ListItem() {
            this.buildRecommendSection()
          }

          // 底部间距
          ListItem() {
            Column().height(100)
          }
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16 })
        .sticky(StickyStyle.None)
      }
      .width('100%')
      .height('100%')

      // 底部操作栏
      Column() {
        this.buildBottomBar()
      }
      .width('100%')
      .alignItems(HorizontalAlign.End)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(PageBackground)
  }

  // 顶部导航栏
  @Builder
  buildTopBar() {
    Row() {
      Image($r('sys.media.ohos_ic_public_arrow_left'))
        .width(24)
        .height(24)
        .fillColor(TextPrimary)
        .onClick(() => {
          this.props.onBack?.();
        })

      Text('职位详情')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(TextPrimary)
        .layoutWeight(1)
        .textAlign(TextAlign.Center)

      // 占位保持对称
      Column().width(24).height(24)
    }
    .width('100%')
    .height(56)
    .padding({ left: 12, right: 12 })
    .backgroundColor(Color.White)
  }

  // 职位概要卡片
  @Builder
  buildJobSummaryCard() {
    Column() {
      Text(this.jobDetail.title)
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .fontColor(TextPrimary)

      Text(this.jobDetail.salary)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(AccentOrange)
        .margin({ top: 10 })

      // 标签
      Row() {
        if (this.jobDetail.education) {
          this.buildTag(this.jobDetail.education);
        }
        if (this.jobDetail.experience) {
          this.buildTag(this.jobDetail.experience);
        }
        ForEach(this.jobDetail.tags.slice(0, 2), (tag: string) => {
          this.buildTag(tag);
        })
      }
      .margin({ top: 14 })
    }
    .width('100%')
    .padding(20)
    .backgroundColor(CardBackground)
    .borderRadius(12)
    .margin({ top: 12 })
    .alignItems(HorizontalAlign.Start)
  }

  // 公司信息卡片
  @Builder
  buildCompanyCard() {
    Row() {
      // 公司 Logo
      Column() {
        Text(this.jobDetail.company.substring(0, 1))
          .fontSize(16)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
      }
      .width(48)
      .height(48)
      .backgroundColor(AccentOrange)
      .borderRadius(24)
      .justifyContent(FlexAlign.Center)

      Column() {
        Text(this.jobDetail.company)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor(TextPrimary)

        Text(this.jobDetail.companyTagline)
          .fontSize(13)
          .fontColor(TextTertiary)
          .margin({ top: 2 })
      }
      .margin({ left: 12 })
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Image($r('sys.media.ohos_ic_public_arrow_right'))
        .width(20)
        .height(20)
        .fillColor(TextTertiary)
    }
    .width('100%')
    .padding(16)
    .backgroundColor(CardBackground)
    .borderRadius(12)
    .margin({ top: 12 })
    .onClick(() => {
      this.props.onCompanyClick?.(this.jobDetail.companyId);
    })
  }

  // 职位描述卡片
  @Builder
  buildDescriptionCard() {
    Column() {
      Row() {
        Text('职位描述')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(TextPrimary)

        Blank()

        Text(this.isDescriptionExpanded ? '收起' : '展开')
          .fontSize(14)
          .fontColor(AccentOrange)
          .onClick(() => {
            this.isDescriptionExpanded = !this.isDescriptionExpanded;
          })
      }
      .width('100%')

      Column() {
        Text(this.jobDetail.description)
          .fontSize(15)
          .fontColor(TextSecondary)
          .lineHeight(24)
          .maxLines(this.isDescriptionExpanded ? 100 : 3)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 12 })
      }
      .width('100%')
    }
    .width('100%')
    .padding(20)
    .backgroundColor(CardBackground)
    .borderRadius(12)
    .margin({ top: 12 })
    .alignItems(HorizontalAlign.Start)
  }

  // 任职要求卡片
  @Builder
  buildRequirementsCard() {
    Column() {
      Text('任职资格')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(TextPrimary)

      ForEach(this.jobDetail.requirements, (req: string, index: number) => {
        Row() {
          Text('${index + 1}、')
            .fontSize(15)
            .fontColor(TextSecondary)
            .lineHeight(24)

          Text(req)
            .fontSize(15)
            .fontColor(TextSecondary)
            .lineHeight(24)
        }
        .width('100%')
        .margin({ top: 10 })
        .alignItems(VerticalAlign.Top)
      }, (req: string) => req)
    }
    .width('100%')
    .padding(20)
    .backgroundColor(CardBackground)
    .borderRadius(12)
    .margin({ top: 12 })
    .alignItems(HorizontalAlign.Start)
  }

  // 推荐职位区域
  @Builder
  buildRecommendSection() {
    Column() {
      Row() {
        Text('猜你喜欢')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(TextPrimary)

        Blank()

        Row() {
          Image($r('sys.media.ohos_ic_public_refresh'))
            .width(14)
            .height(14)
            .fillColor(TextTertiary)

          Text('换一批')
            .fontSize(13)
            .fontColor(TextTertiary)
            .margin({ left: 4 })
        }
        .onClick(() => {
          // 刷新推荐
        })
      }
      .width('100%')
      .margin({ top: 20 })

      ForEach(this.recommendedJobs, (job: RecommendedJob) => {
        this.buildRecommendJobCard(job);
      })
    }
    .width('100%')
  }

  // 推荐职位卡片
  @Builder
  buildRecommendJobCard(job: RecommendedJob) {
    Column() {
      Row() {
        Text(job.title)
          .fontSize(17)
          .fontWeight(FontWeight.Bold)
          .fontColor(TextPrimary)
          .layoutWeight(1)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(job.salary)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(AccentOrange)
          .margin({ left: 8 })
      }
      .width('100%')

      // 标签
      Row() {
        if (job.education) {
          this.buildSmallTag(job.education);
        }
        if (job.experience) {
          this.buildSmallTag(job.experience);
        }
      }
      .margin({ top: 10 })

      Row() {
        // 公司 Logo
        Column() {
          Text(job.company.substring(0, 1))
            .fontSize(12)
            .fontColor(Color.White)
        }
        .width(24)
        .height(24)
        .backgroundColor(Color.fromARGB(46, 236, 124, 56))
        .borderRadius(12)
        .justifyContent(FlexAlign.Center)

        Column() {
          Text(job.company)
            .fontSize(13)
            .fontColor(TextSecondary)

          if (job.companyTagline) {
            Text(job.companyTagline)
              .fontSize(12)
              .fontColor(TextTertiary)
          }
        }
        .margin({ left: 8 })
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)

        Text(job.location)
          .fontSize(13)
          .fontColor(TextSecondary)
      }
      .margin({ top: 12 })
    }
    .width('100%')
    .padding(16)
    .backgroundColor(CardBackground)
    .borderRadius(12)
    .margin({ top: 12 })
    .onClick(() => {
      this.props.onJobClick?.(job.id);
    })
  }

  // 底部操作栏
  @Builder
  buildBottomBar() {
    Row() {
      // 收藏按钮
      Column() {
        Image($r('sys.media.ohos_ic_public_collect'))
          .width(24)
          .height(24)
          .fillColor(TextSecondary)

        Text('收藏')
          .fontSize(12)
          .fontColor(TextSecondary)
          .margin({ top: 4 })
      }
      .width(60)
      .padding({ top: 12, bottom: 12 })
      .justifyContent(FlexAlign.Center)

      // 投递按钮
      Button('立即投递')
        .type(ButtonType.Capsule)
        .height(52)
        .width(240)
        .backgroundColor(AccentOrange)
        .fontColor(Color.White)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .enabled(!this.isApplying && !this.applySuccess)
        .onClick(() => {
          this.handleApply();
        })
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .backgroundColor(Color.White)
    .shadow({
      radius: 8,
      color: Color.fromARGB(26, 0, 0, 0),
      offsetY: -2
    })
    .justifyContent(FlexAlign.Center)
    .alignItems(VerticalAlign.Center)
  }

  // 标签组件
  @Builder
  buildTag(text: string) {
    Text(text)
      .fontSize(12)
      .fontColor(ChipText)
      .fontWeight(FontWeight.Medium)
      .padding({ left: 10, right: 10, top: 6, bottom: 6 })
      .backgroundColor(ChipBackground)
      .borderRadius(10)
      .margin({ right: 8 })
  }

  // 小标签组件
  @Builder
  buildSmallTag(text: string) {
    Text(text)
      .fontSize(12)
      .fontColor(ChipText)
      .padding({ left: 8, right: 8, top: 4, bottom: 4 })
      .backgroundColor(ChipBackground)
      .borderRadius(10)
      .margin({ right: 6 })
  }

  // 处理投递
  private handleApply(): void {
    this.isApplying = true;
    setTimeout(() => {
      this.isApplying = false;
      this.applySuccess = true;
      // 触发AI面试
      this.props.onStartInterview?.(this.jobDetail.title, this.jobDetail.category);
    }, 1500);
  }
}
