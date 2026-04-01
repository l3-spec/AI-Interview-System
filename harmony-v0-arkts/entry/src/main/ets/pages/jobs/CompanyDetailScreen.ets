// CompanyDetailScreen.ets - 公司详情页面
// 参考 Android CompanyDetailScreen.kt 实现完整功能

const AccentOrange = Color.fromARGB(255, 255, 125, 56);
const AccentBlue = Color.fromARGB(255, 59, 130, 246);
const TextPrimary = Color.fromARGB(255, 31, 41, 55);
const TextSecondary = Color.fromARGB(255, 75, 85, 115);
const TextTertiary = Color.fromARGB(255, 156, 163, 175);
const CardBackground = Color.White;
const PageBackground = Color.fromARGB(255, 246, 247, 251);

// 公司统计数据
export interface CompanyStat {
  value: string;
  label: string;
  accent: Color;
}

// 公司资料
export interface CompanyProfile {
  id: string;
  name: string;
  tagline: string;
  location: string;
  description: string;
  highlights: string[];
  culture: string[];
  stats: CompanyStat[];
  website: string;
  gradient: [Color, Color][];
  openRoles: CompanyJobListing[];
}

// 公司职位列表项
export interface CompanyJobListing {
  id: string;
  title: string;
  company: string;
  badgeColor: Color;
  salary: string;
  experience: string;
  location: string;
  tags: string[];
  posted: string;
}

// CompanyDetailScreen Props
export interface CompanyDetailScreenProps {
  companyId: string;
  onBack: () => void;
  onRoleClick: (jobId: string) => void;
}

// 模拟公司数据
const mockCompanyProfile: CompanyProfile = {
  id: 'company_1',
  name: '字节跳动',
  tagline: '全球创作与交流平台',
  location: '北京 海淀区',
  description: '字节跳动是一家为全球用户提供内容平台的科技公司。我们的产品覆盖 150 个国家和地区，旗下产品包括今日头条、抖音、TikTok 等。\n\n我们致力于连接人与信息，让优质内容触达更广泛的用户群体。通过机器学习和人工智能技术，我们不断优化用户体验，为创作者提供更多价值。',
  highlights: [
    '扁平化管理，快速发展',
    '弹性工作制，远程办公',
    '免费三餐下午茶',
    '年度旅游与体检'
  ],
  culture: [
    '追求极致，务实敢为',
    '开放谦逊，坦诚清晰',
    '始终创业，永不止步'
  ],
  stats: [
    { value: '10万+', label: '员工规模', accent: AccentBlue },
    { value: '150+', label: '覆盖国家', accent: AccentOrange },
    { value: '20+', label: '产品矩阵', accent: Color.fromARGB(255, 16, 185, 129) }
  ],
  website: 'www.bytedance.com',
  gradient: [
    [Color.fromARGB(255, 239, 68, 68), 0],
    [Color.fromARGB(255, 245, 158, 11), 1]
  ],
  openRoles: [
    {
      id: 'job_1',
      title: '前端开发工程师',
      company: '字节跳动',
      badgeColor: AccentOrange,
      salary: '25-50k',
      experience: '3-5年',
      location: '北京 海淀区',
      tags: ['React', 'TypeScript'],
      posted: '3天前发布'
    },
    {
      id: 'job_2',
      title: '后端开发工程师',
      company: '字节跳动',
      badgeColor: AccentBlue,
      salary: '30-55k',
      experience: '5-10年',
      location: '北京 海淀区',
      tags: ['Go', '微服务'],
      posted: '1周前发布'
    },
    {
      id: 'job_3',
      title: '产品经理',
      company: '字节跳动',
      badgeColor: Color.fromARGB(255, 16, 185, 129),
      salary: '35-60k',
      experience: '5-10年',
      location: '北京 海淀区',
      tags: ['短视频', '社交'],
      posted: '2天前发布'
    }
  ]
};

@Component
export struct CompanyDetailScreen {
  private props: CompanyDetailScreenProps;
  @State private profile: CompanyProfile = mockCompanyProfile;
  @State private isLoading: boolean = false;

  build() {
    Column() {
      // 顶部导航栏
      this.buildTopBar()

      // 内容列表
      List() {
        // 公司英雄卡片
        ListItem() {
          this.buildHeroCard()
        }

        // 公司介绍
        ListItem() {
          this.buildSectionTitle('公司介绍')
        }

        ListItem() {
          this.buildDescription()
        }

        // 企业亮点
        ListItem() {
          this.buildSectionTitle('企业亮点')
        }

        ListItem() {
          this.buildHighlights()
        }

        // 企业文化
        ListItem() {
          this.buildSectionTitle('企业文化')
        }

        ListItem() {
          this.buildCulture()
        }

        // 开放岗位
        if (this.profile.openRoles.length > 0) {
          ListItem() {
            this.buildSectionTitle('热门开放岗位')
          }

          ForEach(this.profile.openRoles, (job: CompanyJobListing) => {
            ListItem() {
              this.buildJobCard(job)
            }
          })
        }

        // 了解更多
        ListItem() {
          this.buildSectionTitle('了解更多')
        }

        ListItem() {
          this.buildFooter()
        }

        // 底部间距
        ListItem() {
          Column().height(64)
        }
      }
      .width('100%')
      .layoutWeight(1)
      .padding({ left: 20, right: 20 })
      .sticky(StickyStyle.None)
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

      Column() {
        Text(this.profile.name)
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(TextPrimary)

        Text(this.profile.tagline)
          .fontSize(12)
          .fontColor(TextTertiary)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .margin({ left: 12 })
      .layoutWeight(1)
    }
    .width('100%')
    .height(56)
    .padding({ left: 12, right: 12 })
    .backgroundColor(CardBackground)
    .alignItems(VerticalAlign.Center)
  }

  // 公司英雄卡片
  @Builder
  buildHeroCard() {
    Column() {
      // 渐变背景头部
      Column() {
        // 公司首字母 Logo
        Column() {
          Text(this.profile.name.substring(0, 2))
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
        }
        .padding({ left: 18, right: 18, top: 6, bottom: 6 })
        .backgroundColor(Color.White.copy((alpha: 0.18) as any))
        .borderRadius(12)

        Text(this.profile.name)
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .margin({ top: 18 })

        Text(this.profile.tagline)
          .fontSize(14)
          .fontColor(Color.White.copy((alpha: 0.9) as any))
          .margin({ top: 6 })

        // 地点
        Row() {
          Image($r('sys.media.ohos_ic_public_location'))
            .width(14)
            .height(14)
            .fillColor(Color.White.copy((alpha: 0.9) as any))

          Text(this.profile.location)
            .fontSize(12)
            .fontColor(Color.White.copy((alpha: 0.92) as any))
            .margin({ left: 6 })
        }
        .margin({ top: 18 })

        // 统计数据
        Row() {
          ForEach(this.profile.stats, (stat: CompanyStat) => {
            Column() {
              Text(stat.value)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor(stat.accent)

              Text(stat.label)
                .fontSize(12)
                .fontColor(Color.White.copy((alpha: 0.86) as any))
            }
            .layoutWeight(1)
            .padding({ left: 14, right: 14, top: 12, bottom: 12 })
            .backgroundColor(Color.White.copy((alpha: 0.18) as any))
            .borderRadius(16)
          })
        }
        .margin({ top: 18 })
      }
      .width('100%')
      .padding(24)
      .background(
        new LinearGradient({
          direction: GradientDirection.Top,
          colors: this.profile.gradient
        })
      )
      .borderRadius(26)
      .margin({ top: 12 })
    }
    .width('100%')
  }

  // 区域标题
  @Builder
  buildSectionTitle(title: string) {
    Text(title)
      .fontSize(16)
      .fontWeight(FontWeight.SemiBold)
      .fontColor(TextPrimary)
      .width('100%')
      .margin({ top: 20 })
      .alignItems(HorizontalAlign.Start)
  }

  // 公司描述
  @Builder
  buildDescription() {
    Text(this.profile.description)
      .fontSize(14)
      .fontColor(TextSecondary)
      .width('100%')
      .padding({ top: 12, left: 0, right: 0 })
      .lineHeight(22)
  }

  // 企业亮点
  @Builder
  buildHighlights() {
    Column() {
      ForEach(this.profile.highlights, (highlight: string) => {
        Row() {
          Image($r('sys.media.ohos_ic_public_star'))
            .width(18)
            .height(18)
            .fillColor(Color.fromARGB(255, 255, 170, 76))

          Text(highlight)
            .fontSize(14)
            .fontColor(TextSecondary)
            .margin({ left: 12 })
        }
        .width('100%')
        .padding({ left: 18, right: 18, top: 12, bottom: 12 })
        .backgroundColor(CardBackground)
        .borderRadius(18)
        .margin({ top: 6 })
      })
    }
    .width('100%')
    .margin({ top: 12 })
  }

  // 企业文化
  @Builder
  buildCulture() {
    Column() {
      ForEach(this.profile.culture, (item: string) => {
        Row() {
          // 蓝色圆点
          Column() {
            Column()
              .width(6)
              .height(6)
              .backgroundColor(AccentBlue)
              .borderRadius(3)
          }
          .width(20)
          .height(20)
          .backgroundColor(AccentBlue.copy((alpha: 0.12) as any))
          .borderRadius(10)
          .justifyContent(FlexAlign.Center)

          Text(item)
            .fontSize(14)
            .fontColor(TextPrimary)
            .margin({ left: 12 })
        }
        .width('100%')
        .padding({ top: 12, bottom: 12 })
      })
    }
    .width('100%')
    .padding({ left: 20, right: 20, top: 8, bottom: 8 })
    .backgroundColor(CardBackground)
    .borderRadius(22)
    .margin({ top: 12 })
  }

  // 职位卡片
  @Builder
  buildJobCard(job: CompanyJobListing) {
    Column() {
      Row() {
        // 公司 Logo
        Column() {
          Text(job.company.substring(0, 1))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(job.badgeColor)
        }
        .width(46)
        .height(46)
        .backgroundColor(job.badgeColor.copy((alpha: 0.16) as any))
        .borderRadius(14)
        .justifyContent(FlexAlign.Center)

        Column() {
          Text(job.title)
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(TextPrimary)

          Text(job.company + ' · ' + job.location)
            .fontSize(13)
            .fontColor(TextTertiary)
            .margin({ top: 4 })
        }
        .margin({ left: 16 })
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
      }

      Row() {
        // 薪资
        Row() {
          Image($r('sys.media.ohos_ic_public_online'))
            .width(12)
            .height(12)
            .fillColor(job.badgeColor)

          Text(job.salary)
            .fontSize(12)
            .fontColor(job.badgeColor)
            .margin({ left: 6 })
        }
        .backgroundColor(job.badgeColor.copy((alpha: 0.12) as any))
        .borderRadius(12)
        .padding({ left: 12, right: 12, top: 6, bottom: 6 })
        .margin({ right: 12 })

        // 经验
        Row() {
          Image($r('sys.media.ohos_ic_public_star'))
            .width(12)
            .height(12)
            .fillColor(Color.fromARGB(255, 99, 102, 241))

          Text(job.experience)
            .fontSize(12)
            .fontColor(Color.fromARGB(255, 99, 102, 241))
            .margin({ left: 6 })
        }
        .backgroundColor(Color.fromARGB(255, 99, 102, 241).copy((alpha: 0.12) as any))
        .borderRadius(12)
        .padding({ left: 12, right: 12, top: 6, bottom: 6 })
      }
      .margin({ top: 16 })

      // 标签
      Row() {
        ForEach(job.tags.slice(0, 3), (tag: string) => {
          Text('# ' + tag)
            .fontSize(12)
            .fontColor(Color.fromARGB(255, 99, 102, 241))
            .padding({ left: 10, right: 10, top: 6, bottom: 6 })
            .backgroundColor(Color.fromARGB(255, 242, 244, 247))
            .borderRadius(10)
            .margin({ right: 8 })
        })
      }
      .margin({ top: 14 })

      Text(job.posted)
        .fontSize(12)
        .fontColor(TextTertiary)
        .margin({ top: 14 })
    }
    .width('100%')
    .padding(20)
    .backgroundColor(CardBackground)
    .borderRadius(22)
    .margin({ top: 8 })
    .shadow({
      radius: 3,
      color: Color.Black.copy((alpha: 0.05) as any),
      offsetY: 2
    })
    .onClick(() => {
      this.props.onRoleClick?.(job.id);
    })
  }

  // 底部信息
  @Builder
  buildFooter() {
    Column() {
      Text('了解更多')
        .fontSize(14)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(TextPrimary)
        .width('100%')

      Row() {
        Image($r('sys.media.ohos_ic_public_web'))
          .width(20)
          .height(20)
          .fillColor(AccentBlue)

        Column() {
          Text(this.profile.website)
            .fontSize(14)
            .fontColor(AccentBlue)

          Text(this.profile.location)
            .fontSize(12)
            .fontColor(TextTertiary)
        }
        .margin({ left: 12 })
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 14, bottom: 14 })
      .backgroundColor(CardBackground)
      .borderRadius(16)
      .margin({ top: 12 })
    }
    .width('100%')
    .margin({ top: 12 })
  }
}
