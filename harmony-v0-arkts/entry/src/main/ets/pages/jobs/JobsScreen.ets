// JobsScreen.ets - 职位列表完整实现
// 参考 Android JobsScreen.kt 实现完整功能

// 颜色常量
const GradientTop = Color.fromARGB(255, 0, 172, 195);
const GradientBottom = Color.fromARGB(255, 233, 247, 249);
const PageBackground = Color.fromARGB(255, 244, 245, 246);
const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const TextPrimary = Color.fromARGB(255, 45, 48, 54);
const TextSecondary = Color.fromARGB(255, 140, 146, 154);
const SearchPlaceholder = Color.fromARGB(255, 181, 183, 184);
const CardBorder = Color.fromARGB(255, 230, 232, 235);
const TagBackground = Color.fromARGB(255, 245, 247, 250);
const TagText = Color.fromARGB(255, 95, 103, 115);
const FilterGradientTop = Color.fromARGB(255, 81, 171, 185);

// 职位卡片数据模型
export interface JobListing {
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
  type: string;
  level: string;
  posted: string;
}

// 筛选条件
export interface ActiveJobFilters {
  keyword: string;
  location: string;
  experience: string;
  education: string;
  type: string;
  level: string;
  sort: number; // 0: 推荐, 1: 最新
}

// 职位类型
enum JobSort {
  RECOMMENDED = 0,
  LATEST = 1
}

// JobsScreen Props
export interface JobsScreenProps {
  onJobClick: (jobId: string) => void;
  onCompanyClick: (companyId: string) => void;
  onJobSelectionClick: () => void;
  onEditIntentionClick: () => void;
}

// 模拟职位数据
const mockJobs: JobListing[] = [
  {
    id: 'job_1',
    title: '前端开发工程师',
    company: '字节跳动',
    companyLogo: '',
    companyTagline: '短视频领先者',
    salary: '25-50k·16薪',
    location: '北京 海淀区',
    education: '本科',
    experience: '3-5年',
    tags: ['React', 'TypeScript', '前端'],
    type: 'FULL_TIME',
    level: 'MIDDLE',
    posted: '3天前发布'
  },
  {
    id: 'job_2',
    title: '产品经理',
    company: '腾讯',
    companyLogo: '',
    companyTagline: '科技向善',
    salary: '30-55k',
    location: '深圳 南山区',
    education: '本科',
    experience: '5-10年',
    tags: ['产品设计', 'B端', 'SaaS'],
    type: 'FULL_TIME',
    level: 'SENIOR',
    posted: '1周前发布'
  },
  {
    id: 'job_3',
    title: '数据分析师',
    company: '阿里巴巴',
    companyLogo: '',
    companyTagline: '让天下没有难做的生意',
    salary: '20-35k',
    location: '杭州 西湖区',
    education: '本科',
    experience: '1-3年',
    tags: ['SQL', 'Python', '数据分析'],
    type: 'FULL_TIME',
    level: 'JUNIOR',
    posted: '2天前发布'
  },
  {
    id: 'job_4',
    title: 'UI设计师',
    company: '美团',
    companyLogo: '',
    companyTagline: '美好生活小帮手',
    salary: '18-30k',
    location: '北京 朝阳区',
    education: '本科',
    experience: '1-3年',
    tags: ['UI设计', 'Figma', '移动端'],
    type: 'FULL_TIME',
    level: 'JUNIOR',
    posted: '今天发布'
  },
  {
    id: 'job_5',
    title: '后端开发工程师',
    company: '京东',
    companyLogo: '',
    companyTagline: '品质消费',
    salary: '25-45k',
    location: '北京 亦庄',
    education: '本科',
    experience: '3-5年',
    tags: ['Java', '微服务', '分布式'],
    type: 'FULL_TIME',
    level: 'MIDDLE',
    posted: '5天前发布'
  },
  {
    id: 'job_6',
    title: '算法工程师',
    company: '百度',
    companyLogo: '',
    companyTagline: '用科技让复杂的世界更简单',
    salary: '35-60k',
    location: '北京 海淀区',
    education: '硕士',
    experience: '3-5年',
    tags: ['机器学习', 'NLP', '深度学习'],
    type: 'FULL_TIME',
    level: 'MIDDLE',
    posted: '1天前发布'
  },
  {
    id: 'job_7',
    title: '测试开发工程师',
    company: '网易',
    companyLogo: '',
    companyTagline: '网聚人的力量',
    salary: '20-35k',
    location: '杭州 滨江区',
    education: '本科',
    experience: '1-3年',
    tags: ['自动化测试', 'Python', 'CI/CD'],
    type: 'FULL_TIME',
    level: 'JUNIOR',
    posted: '4天前发布'
  },
  {
    id: 'job_8',
    title: '运营实习生',
    company: '小红书',
    companyLogo: '',
    companyTagline: '标记我的生活',
    salary: '150-200/天',
    location: '上海 黄浦区',
    education: '本科',
    experience: '在校生',
    tags: ['内容运营', '用户运营'],
    type: 'INTERN',
    level: 'INTERN',
    posted: '今天发布'
  }
];

@Component
export struct JobsScreen {
  private props: JobsScreenProps;
  @State private currentTab: number = 0; // 0: 全部, 1: 实习, 2: 校招, 3: 社招
  @State private searchText: string = '';
  @State private jobs: JobListing[] = mockJobs;
  @State private selectedJob: JobListing | null = null;
  @State private showFilterSheet: boolean = false;
  @State private filters: ActiveJobFilters = {
    keyword: '前端开发',
    location: '',
    experience: '',
    education: '',
    type: '',
    level: '',
    sort: JobSort.RECOMMENDED
  };

  private tabTitles: string[] = ['全部', '实习', '校招', '社招'];

  build() {
    Stack() {
      // 渐变背景
      Column() {
        Column() {
          Column()
            .width('100%')
            .height(220)
        }
        .width('100%')
        .layoutWeight(1)
        .background(
          new LinearGradient({
            direction: GradientDirection.Top,
            colors: [
              [GradientTop, 0],
              [GradientBottom, 1]
            ]
          })
        )
      }
      .width('100%')
      .height('100%')

      // 主内容
      Column() {
        // 头部占位
        Column()
          .width('100%')
          .height(130)
          .backgroundColor(Color.Transparent)

        // 职位列表
        Column() {
          List() {
            // 意图卡片
            ListItem() {
              this.buildIntentionCard()
            }

            // 职位卡片列表
            ListItem() {
              this.buildJobsList()
            }

            // 底部间距
            ListItem() {
              Column().height(80)
            }
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 12, right: 12 })
        }
        .width('100%')
        .layoutWeight(1)
      }
      .width('100%')
      .height('100%')

      // 固定顶部导航
      Column() {
        this.buildHeader()
      }
      .width('100%')
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(PageBackground)
  }

  // 顶部导航栏
  @Builder
  buildHeader() {
    Column() {
      Row() {
        Text('职岗')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor(TextPrimary)

        // 搜索框
        Row() {
          Image($r('sys.media.ohos_ic_public_search'))
            .width(12)
            .height(12)
            .fillColor(SearchPlaceholder)

          TextInput({ placeholder: '搜索', text: this.searchText })
            .width('100%')
            .height(32)
            .fontSize(14)
            .backgroundColor(Color.White)
            .borderRadius(8)
            .padding({ left: 24, right: 8 })
            .onChange((value: string) => {
              this.searchText = value;
            })
        }
        .width('55%')
        .height(34)
        .backgroundColor(Color.White)
        .borderRadius(8)
        .padding({ left: 8 })
        .onClick(() => {
          // 搜索点击
        })
      }
      .width('100%')
      .height(60)
      .padding({ left: 16, right: 16, top: 8 })
      .justifyContent(FlexAlign.SpaceBetween)

      // Tab 切换
      Row() {
        ForEach(this.tabTitles, (title: string, index: number) => {
          Column() {
            Text(title)
              .fontSize(index === this.currentTab ? 16 : 14)
              .fontColor(index === this.currentTab ? TextPrimary : TextSecondary)
              .fontWeight(index === this.currentTab ? FontWeight.Medium : FontWeight.Normal)
              .padding({ left: 12, right: 12, top: 8, bottom: 8 })
          }
          .onClick(() => {
            this.currentTab = index;
            this.filterJobs();
          })
        })
      }
      .width('100%')
      .padding({ left: 8 })
      .backgroundColor(Color.Transparent)
    }
    .width('100%')
    .background(
      new LinearGradient({
        direction: GradientDirection.Top,
        colors: [[GradientTop, 0], [GradientBottom, 1]]
      })
    )
    .padding({ bottom: 14 })
  }

  // 意图卡片（意向职位）
  @Builder
  buildIntentionCard() {
    Column() {
      // 标题行
      Row() {
        Text(this.filters.keyword || '前端开发')
          .fontSize(24)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(TextPrimary)

        Blank()

        Row() {
          Image($r('sys.media.ohos_ic_public_edit'))
            .width(18)
            .height(18)
            .fillColor(AccentOrange)
        }
        .onClick(() => {
          this.props.onEditIntentionClick?.();
        })
      }
      .width('100%')

      // 排序和筛选
      Row() {
        Row() {
          Text('推荐')
            .fontSize(14)
            .fontColor(this.filters.sort === JobSort.RECOMMENDED ? TextPrimary : TextSecondary)
            .fontWeight(this.filters.sort === JobSort.RECOMMENDED ? FontWeight.Medium : FontWeight.Normal)
            .onClick(() => {
              this.filters.sort = JobSort.RECOMMENDED;
              this.filterJobs();
            })

          Text('|')
            .fontColor(TextSecondary)
            .margin({ left: 12, right: 12 })

          Text('最新')
            .fontSize(14)
            .fontColor(this.filters.sort === JobSort.LATEST ? TextPrimary : TextSecondary)
            .fontWeight(this.filters.sort === JobSort.LATEST ? FontWeight.Medium : FontWeight.Normal)
            .onClick(() => {
              this.filters.sort = JobSort.LATEST;
              this.filterJobs();
            })
        }

        Blank()

        // 筛选按钮
        Row() {
          Text('城市')
            .fontSize(14)
            .fontColor(TextSecondary)
            .onClick(() => {
              this.showFilterSheet = true;
            })

          Image($r('sys.media.ohos_ic_public_arrow_down'))
            .width(10)
            .height(6)
            .fillColor(TextSecondary)
            .margin({ left: 4 })
        }
        .margin({ right: 18 })
        .onClick(() => {
          this.showFilterSheet = true;
        })

        Row() {
          Text('筛选')
            .fontSize(14)
            .fontColor(TextSecondary)
            .onClick(() => {
              this.showFilterSheet = true;
            })

          Image($r('sys.media.ohos_ic_public_arrow_down'))
            .width(10)
            .height(6)
            .fillColor(TextSecondary)
            .margin({ left: 4 })
        }
        .onClick(() => {
          this.showFilterSheet = true;
        })
      }
      .width('100%')
      .margin({ top: 12 })
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .margin({ top: 12, bottom: 12 })
  }

  // 职位列表
  @Builder
  buildJobsList() {
    Column() {
      if (this.jobs.length === 0) {
        // 空状态
        Column() {
          Text('暂无匹配的岗位')
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(TextPrimary)
            .margin({ top: 60 })

          Text('试试调整筛选条件或搜索关键词')
            .fontSize(13)
            .fontColor(TextSecondary)
            .margin({ top: 8 })

          Button('重新获取推荐')
            .type(ButtonType.Capsule)
            .backgroundColor(AccentOrange)
            .fontColor(Color.White)
            .height(40)
            .width(160)
            .margin({ top: 16 })
            .onClick(() => {
              this.filterJobs();
            })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
      } else {
        ForEach(this.jobs, (job: JobListing) => {
          this.buildJobCard(job);
        })
      }
    }
    .width('100%')
  }

  // 职位卡片
  @Builder
  buildJobCard(job: JobListing) {
    Column() {
      Column() {
        // 职位名称和薪资
        Row() {
          Text(job.title)
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor(TextPrimary)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)

          Text(job.salary)
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor(AccentOrange)
        }
        .width('100%')

        // 标签
        Row() {
          if (job.education) {
            this.buildTag(job.education);
          }
          if (job.experience) {
            this.buildTag(job.experience);
          }
          if (job.tags.length > 0) {
            this.buildTag(job.tags[0]);
          }
        }
        .width('100%')
        .margin({ top: 10 })

        // 公司信息和地点
        Row() {
          // 公司 Logo
          Column() {
            Text(job.company.substring(0, 1))
              .fontSize(14)
              .fontColor(Color.White)
              .fontWeight(FontWeight.Bold)
          }
          .width(42)
          .height(42)
          .backgroundColor(AccentOrange.copy((alpha: 0.18) as any))
          .borderRadius(21)
          .justifyContent(FlexAlign.Center)

          Column() {
            Text(job.company)
              .fontSize(14)
              .fontWeight(FontWeight.SemiBold)
              .fontColor(TextPrimary)

            Text(job.companyTagline)
              .fontSize(12)
              .fontColor(TextSecondary)
              .margin({ top: 2 })
          }
          .margin({ left: 12 })
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start)

          Row() {
            Image($r('sys.media.ohos_ic_public_location'))
              .width(14)
              .height(14)
              .fillColor(TextSecondary)

            Text(job.location)
              .fontSize(12)
              .fontColor(TextSecondary)
              .margin({ left: 2 })
          }
        }
        .margin({ top: 12 })
      }
      .width('100%')
      .padding(16)
      .backgroundColor(Color.White)
      .borderRadius(8)
      .border({
        width: 1,
        color: CardBorder,
        radius: 8
      })
      .margin({ bottom: 12 })
      .onClick(() => {
        this.props.onJobClick?.(job.id);
      })
    }
    .width('100%')
  }

  // 标签组件
  @Builder
  buildTag(text: string) {
    Text(text)
      .fontSize(12)
      .fontColor(TagText)
      .fontWeight(FontWeight.Medium)
      .padding({ left: 10, right: 10, top: 5, bottom: 5 })
      .backgroundColor(TagBackground)
      .borderRadius(10)
      .margin({ right: 6 })
  }

  // 筛选职位
  private filterJobs(): void {
    let filtered = mockJobs.filter((job) => {
      // Tab 筛选
      if (this.currentTab === 1) {
        // 实习
        if (job.type !== 'INTERN') return false;
      } else if (this.currentTab === 2) {
        // 校招 - 通常是应届毕业生
        if (job.level === 'JUNIOR' || job.level === 'INTERN') {
          // 校招筛选
        } else {
          return false;
        }
      } else if (this.currentTab === 3) {
        // 社招
        if (job.level === 'INTERN' || job.level === 'JUNIOR') return false;
      }

      // 搜索筛选
      if (this.searchText) {
        const keyword = this.searchText.toLowerCase();
        if (!job.title.toLowerCase().includes(keyword) &&
          !job.company.toLowerCase().includes(keyword)) {
          return false;
        }
      }

      return true;
    });

    // 排序
    if (this.filters.sort === JobSort.LATEST) {
      // 最新排序
    }

    this.jobs = filtered;
  }
}
