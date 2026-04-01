// HomeScreen.ets - 首页完整实现
// 参考 Android HomeScreen.kt 实现完整功能

// 颜色常量
const GradientTop = Color.fromARGB(255, 0, 172, 195);
const GradientBottom = Color.fromARGB(255, 233, 247, 249);
const PageBackground = Color.fromARGB(255, 244, 245, 246);
const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const TextPrimary = Color.fromARGB(255, 0, 0, 0);
const TextSecondary = Color.fromARGB(255, 139, 146, 154);
const SearchPlaceholder = Color.fromARGB(255, 181, 183, 184);
const CardBorder = Color.fromARGB(255, 230, 232, 235);
const TagBackground = Color.fromARGB(255, 245, 247, 250);
const TagText = Color.fromARGB(255, 95, 103, 115);

// Banner 数据模型
export interface BannerData {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

// 内容卡片数据模型
export interface ContentCard {
  id: string;
  title: string;
  author: string;
  avatarUrl: string;
  imageUrl: string;
  tags: string[];
  views: string;
  publishDate: string;
}

// 首页 Props
export interface HomeScreenProps {
  onNavigateToJobs: () => void;
  onNavigateToCircle: () => void;
  onNavigateToSearch: () => void;
  onCardClick?: (card: ContentCard) => void;
}

// 模拟 Banner 数据
const mockBanners: BannerData[] = [
  {
    id: 'banner_1',
    label: '限时活动',
    title: '开启 AI 面试之旅',
    subtitle: '一键生成模拟题，随时练习',
    imageUrl: ''
  },
  {
    id: 'banner_2',
    label: '热门推荐',
    title: '数据分析师特训营',
    subtitle: '行业专家带你从0到1',
    imageUrl: ''
  },
  {
    id: 'banner_3',
    label: '求职干货',
    title: '简历优化指南',
    subtitle: '让你的简历脱颖而出',
    imageUrl: ''
  }
];

// 模拟内容卡片数据
const mockContentCards: ContentCard[] = [
  {
    id: 'card_1',
    title: '字节跳动产品经理面经分享',
    author: '产品小王',
    avatarUrl: '',
    imageUrl: '',
    tags: ['面经', '产品经理', '字节跳动'],
    views: '1.2k',
    publishDate: '2小时前'
  },
  {
    id: 'card_2',
    title: '秋招上岸指南：从小厂到BAT',
    author: '校招达人',
    avatarUrl: '',
    imageUrl: '',
    tags: ['校招', '求职经验'],
    views: '2.3k',
    publishDate: '昨天'
  },
  {
    id: 'card_3',
    title: 'AI面试常见问题汇总',
    author: '面试专家',
    avatarUrl: '',
    imageUrl: '',
    tags: ['AI面试', '技巧'],
    views: '856',
    publishDate: '3天前'
  },
  {
    id: 'card_4',
    title: '数据分析岗面试真题',
    author: '数据分析师',
    avatarUrl: '',
    imageUrl: '',
    tags: ['数据分析师', '面试题'],
    views: '1.5k',
    publishDate: '1周前'
  },
  {
    id: 'card_5',
    title: '如何优雅地谈薪资',
    author: '职场老鸟',
    avatarUrl: '',
    imageUrl: '',
    tags: ['职场', '薪资谈判'],
    views: '3.2k',
    publishDate: '2周前'
  },
  {
    id: 'card_6',
    title: '前端开发面试必考点',
    author: '前端工程师',
    avatarUrl: '',
    imageUrl: '',
    tags: ['前端', '面试题'],
    views: '1.8k',
    publishDate: '3天前'
  }
];

@Component
export struct HomeScreen {
  private props: HomeScreenProps;
  @State private currentBannerIndex: number = 0;
  @State private isRefreshing: boolean = false;
  @State private contentCards: ContentCard[] = mockContentCards;

  build() {
    Stack() {
      // 渐变背景
      Column() {
        Column() {
          // 顶部渐变背景占位
          Column()
            .width('100%')
            .height(520)
            .backgroundColor(Color.Transparent)
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

      // 主内容区域
      Column() {
        // 头部占位空间
        Column()
          .width('100%')
          .height(this.getHeaderHeight())
          .backgroundColor(Color.Transparent)

        // 可滚动内容
        List() {
          // Banner 轮播
          ListItem() {
            this.buildBannerSection()
          }

          // 内容卡片列表
          ListItem() {
            this.buildContentGrid()
          }

          // 底部间距
          ListItem() {
            Column().height(100)
          }
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 12, right: 12 })
        .sticky(StickyStyle.None)
      }
      .width('100%')
      .height('100%')

      // 固定顶部导航栏
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

  // 获取头部高度（用于占位）
  private getHeaderHeight(): number {
    return 140;
  }

  // 顶部导航栏
  @Builder
  buildHeader() {
    Column() {
      Row() {
        Column() {
          Text('首页')
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(TextPrimary)
        }
        .width('30%')

        // 搜索框
        Row() {
          Image($r('sys.media.ohos_ic_public_search'))
            .width(14)
            .height(14)
            .fillColor(SearchPlaceholder)
          Text('搜索')
            .fontSize(12)
            .fontColor(SearchPlaceholder)
            .margin({ left: 6 })
        }
        .width('55%')
        .height(34)
        .backgroundColor(Color.White)
        .borderRadius(8)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          this.props.onNavigateToSearch?.();
        })

        // 消息图标
        Row() {
          Badge({
            value: '3',
            style: {
              badgeSize: 14,
              badgeColor: AccentOrange,
              fontSize: 10
            },
            position: BadgePosition.RightTop
          }) {
            Image($r('sys.media.ohos_ic_public_notifications'))
              .width(22)
              .height(22)
              .fillColor(TextPrimary)
          }
        }
        .width('15%')
        .justifyContent(FlexAlign.Center)
      }
      .width('100%')
      .height(60)
      .padding({ left: 16, right: 16, top: 8 })
    }
    .width('100%')
    .background(
      new LinearGradient({
        direction: GradientDirection.Top,
        colors: [
          [GradientTop, 0],
          [GradientBottom, 1]
        ]
      })
    )
    .padding({ bottom: 12 })
  }

  // Banner 区域
  @Builder
  buildBannerSection() {
    Column() {
      // Banner 卡片
      Column() {
        if (mockBanners.length > 0) {
          let banner = mockBanners[this.currentBannerIndex % mockBanners.length];
          Column() {
            // Banner 背景
            Column()
              .width('100%')
              .height(140)
              .backgroundColor(this.getBannerColor(this.currentBannerIndex % mockBanners.length))
              .borderRadius(12)
              .padding(16)
              .justifyContent(FlexAlign.End) {
                Column() {
                  Text(banner.label)
                    .fontSize(12)
                    .fontColor(Color.White.copy((alpha: 0.9) as any))
                    .fontWeight(FontWeight.Medium)

                  Text(banner.title)
                    .fontSize(20)
                    .fontColor(Color.White)
                    .fontWeight(FontWeight.Bold)
                    .margin({ top: 6 })

                  Text(banner.subtitle)
                    .fontSize(13)
                    .fontColor(Color.White.copy((alpha: 0.85) as any))
                    .margin({ top: 4 })
                }
                .alignItems(HorizontalAlign.Start)
              }
          }
          .width('100%')
          .onClick(() => {
            // Banner 点击处理
          })
        }

        // 轮播指示器
        Row() {
          ForEach(mockBanners, (banner: BannerData, index: number) => {
            Column()
              .width(index === this.currentBannerIndex % mockBanners.length ? 12 : 4)
              .height(4)
              .backgroundColor(
                index === this.currentBannerIndex % mockBanners.length
                  ? AccentOrange
                  : Color.White.copy((alpha: 0.3) as any)
              )
              .borderRadius(2)
              .margin({ left: 3, right: 3 })
          })
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .margin({ top: 12 })
      }
      .width('100%')
      .margin({ top: 12 })
    }
    .width('100%')
    .onVisibleAreaChange([0, 1], (isVisible: boolean) => {
      if (isVisible) {
        this.startBannerAutoScroll();
      }
    })
  }

  // 内容网格（瀑布流双列布局）
  @Builder
  buildContentGrid() {
    Column() {
      // 标题
      Row() {
        Text('为你推荐')
          .fontSize(18)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(TextPrimary)

        Blank()

        Text('查看更多 >')
          .fontSize(14)
          .fontColor(TextSecondary)
          .onClick(() => {
            this.props.onNavigateToCircle?.();
          })
      }
      .width('100%')
      .margin({ top: 16, bottom: 12 })

      // 双列瀑布流
      Row() {
        // 左列
        Column() {
          ForEach(this.getLeftColumnCards(), (card: ContentCard) => {
            this.buildContentCard(card);
          })
        }
        .width('50%')
        .padding({ right: 4 })

        // 右列
        Column() {
          ForEach(this.getRightColumnCards(), (card: ContentCard) => {
            this.buildContentCard(card);
          })
        }
        .width('50%')
        .padding({ left: 4 })
      }
      .width('100%')
    }
    .width('100%')
  }

  // 构建内容卡片
  @Builder
  buildContentCard(card: ContentCard) {
    Column() {
      // 图片区域
      Column() {
        if (card.imageUrl) {
          Image(card.imageUrl)
            .width('100%')
            .height(150)
            .borderRadius({
              topLeft: 8,
              topRight: 8,
              bottomLeft: 0,
              bottomRight: 0
            })
            .objectFit(ImageFit.Cover)
        } else {
          // 占位图
          Column()
            .width('100%')
            .height(card.id.hashCode() % 3 === 0 ? 180 : 140)
            .backgroundColor(TagBackground)
            .borderRadius(8)
            .justifyContent(FlexAlign.Center) {
              Text('📄')
                .fontSize(32)
            }
        }
      }
      .width('100%')
      .clip(true)
      .borderRadius(8)

      // 内容区域
      Column() {
        Text(card.title)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor(TextPrimary)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 8 })

        if (card.tags.length > 0) {
          Text(card.tags.slice(0, 2).map(t => '#' + t).join(' '))
            .fontSize(12)
            .fontColor(AccentOrange)
            .margin({ top: 4 })
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }

        // 作者信息
        Row() {
          // 头像
          if (card.avatarUrl) {
            Image(card.avatarUrl)
              .width(24)
              .height(24)
              .borderRadius(12)
          } else {
            Column() {
              Text(card.author.substring(0, 1))
                .fontSize(12)
                .fontColor(Color.White)
                .fontWeight(FontWeight.Medium)
            }
            .width(24)
            .height(24)
            .backgroundColor(AccentOrange.copy((alpha: 0.18) as any))
            .borderRadius(12)
            .justifyContent(FlexAlign.Center)
          }

          Text(card.author)
            .fontSize(12)
            .fontColor(TextPrimary)
            .fontWeight(FontWeight.Light)
            .margin({ left: 6 })
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })

          Blank()

          Row() {
            Image($r('sys.media.ohos_ic_public_view'))
              .width(14)
              .height(14)
              .fillColor(TextSecondary)
            Text(card.views)
              .fontSize(12)
              .fontColor(TextSecondary)
              .fontWeight(FontWeight.Light)
              .margin({ left: 2 })
          }
        }
        .margin({ top: 8 })
        .width('100%')
      }
      .width('100%')
      .padding({ left: 4, right: 4, bottom: 8 })
    }
    .width('100%')
    .backgroundColor(Color.White)
    .borderRadius(8)
    .margin({ bottom: 8 })
    .onClick(() => {
      this.props.onCardClick?.(card);
    })
  }

  // 获取左列卡片（交替分配）
  private getLeftColumnCards(): ContentCard[] {
    let leftCards: ContentCard[] = [];
    this.contentCards.forEach((card, index) => {
      if (index % 2 === 0) {
        leftCards.push(card);
      }
    });
    return leftCards;
  }

  // 获取右列卡片
  private getRightColumnCards(): ContentCard[] {
    let rightCards: ContentCard[] = [];
    this.contentCards.forEach((card, index) => {
      if (index % 2 === 1) {
        rightCards.push(card);
      }
    });
    return rightCards;
  }

  // Banner 颜色
  private getBannerColor(index: number): Color {
    const colors = [
      Color.fromARGB(255, 0, 172, 195),
      Color.fromARGB(255, 236, 124, 56),
      Color.fromARGB(255, 109, 139, 224)
    ];
    return colors[index % colors.length];
  }

  // 自动滚动 Banner
  private startBannerAutoScroll(): void {
    setInterval(() => {
      this.currentBannerIndex = (this.currentBannerIndex + 1) % mockBanners.length;
    }, 3000);
  }
}
