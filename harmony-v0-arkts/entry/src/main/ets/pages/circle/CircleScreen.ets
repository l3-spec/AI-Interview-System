// CircleScreen.ets - 职圈主页完整实现
// 参考 Android CircleScreen.kt 实现完整功能

const HeroGradientStart = Color.fromARGB(255, 0, 172, 195);
const HeroGradientEnd = Color.fromARGB(255, 233, 247, 249);
const PageBackground = Color.fromARGB(255, 244, 245, 246);
const SearchPlaceholder = Color.fromARGB(255, 181, 183, 184);
const PrimaryText = Color.fromARGB(255, 0, 0, 0);
const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const WhiteColor = Color.White;
const CardCorner = 8;
const TextSecondary = Color.fromARGB(255, 139, 146, 154);

// 圈子卡片数据模型
export interface CircleCard {
  id: string;
  title: string;
  coverImage: string;
  authorName: string;
  authorAvatar: string;
  tags: string[];
  viewCount: number;
  isExpert: boolean;
}

// 圈子分类
enum CircleCategory {
  ALL = 'all',
  INTERVIEW = 'interview',
  WORK_LIFE = 'work_life',
  HELP = 'help'
}

// CircleScreen Props
export interface CircleScreenProps {
  onSearchClick: () => void;
  onCardClick: (card: CircleCard) => void;
  onCreatePost: () => void;
}

// 模拟圈子数据
const mockCircleCards: CircleCard[] = [
  {
    id: 'card_1',
    title: '字节跳动产品经理面经分享',
    coverImage: '',
    authorName: '产品小王',
    authorAvatar: '',
    tags: ['面经', '产品经理', '字节跳动'],
    viewCount: 1256,
    isExpert: true
  },
  {
    id: 'card_2',
    title: '秋招上岸指南：从小厂到BAT的全过程记录',
    coverImage: '',
    authorName: '校招达人',
    authorAvatar: '',
    tags: ['校招', '求职经验'],
    viewCount: 2340,
    isExpert: false
  },
  {
    id: 'card_3',
    title: 'AI面试常见问题汇总及答题技巧',
    coverImage: '',
    authorName: '面试专家',
    authorAvatar: '',
    tags: ['AI面试', '技巧'],
    viewCount: 856,
    isExpert: true
  },
  {
    id: 'card_4',
    title: '数据分析岗面试真题及答案解析',
    coverImage: '',
    authorName: '数据分析师',
    authorAvatar: '',
    tags: ['数据分析师', '面试题'],
    viewCount: 1502,
    isExpert: false
  },
  {
    id: 'card_5',
    title: '如何优雅地谈薪资：HR不会告诉你的秘密',
    coverImage: '',
    authorName: '职场老鸟',
    authorAvatar: '',
    tags: ['职场', '薪资谈判'],
    viewCount: 3200,
    isExpert: false
  },
  {
    id: 'card_6',
    title: '前端开发面试必考点总结',
    coverImage: '',
    authorName: '前端工程师',
    authorAvatar: '',
    tags: ['前端', '面试题'],
    viewCount: 1856,
    isExpert: true
  },
  {
    id: 'card_7',
    title: '面试紧张怎么办？这些技巧帮你克服',
    coverImage: '',
    authorName: '心理导师',
    authorAvatar: '',
    tags: ['面试技巧', '心理建设'],
    viewCount: 980,
    isExpert: false
  },
  {
    id: 'card_8',
    title: '简历优化指南：让HR一眼看上你',
    coverImage: '',
    authorName: 'HR小姐姐',
    authorAvatar: '',
    tags: ['简历', '求职技巧'],
    viewCount: 4120,
    isExpert: true
  }
];

@Component
export struct CircleScreen {
  private props: CircleScreenProps;
  @State private currentCategory: CircleCategory = CircleCategory.ALL;
  @State private cards: CircleCard[] = mockCircleCards;
  @State private isLoading: boolean = false;
  @State private isRefreshing: boolean = false;

  private categoryTabs: { key: CircleCategory; label: string }[] = [
    { key: CircleCategory.ALL, label: '全部' },
    { key: CircleCategory.INTERVIEW, label: '面试经验' },
    { key: CircleCategory.WORK_LIFE, label: '职场吐槽' },
    { key: CircleCategory.HELP, label: '求助帖' }
  ];

  build() {
    Stack() {
      // 渐变背景
      Column() {
        Column() {
          Column()
            .width('100%')
            .height(520)
        }
        .width('100%')
        .layoutWeight(1)
        .background(
          new LinearGradient({
            direction: GradientDirection.Top,
            colors: [
              [HeroGradientStart, 0],
              [HeroGradientEnd, 1]
            ]
          })
        )
      }
      .width('100%')
      .height('100%')

      // 主内容
      Column() {
        // 头部占位空间
        Column()
          .width('100%')
          .height(this.getHeaderHeight())
          .backgroundColor(Color.Transparent)

        // 分类 Tab
        Row() {
          ForEach(this.categoryTabs, (tab: { key: CircleCategory; label: string }) => {
            Column() {
              Text(tab.label)
                .fontSize(tab.key === this.currentCategory ? 16 : 14)
                .fontColor(tab.key === this.currentCategory ? PrimaryText : TextSecondary)
                .fontWeight(tab.key === this.currentCategory ? FontWeight.Medium : FontWeight.Normal)
                .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            }
            .onClick(() => {
              this.currentCategory = tab.key;
              this.filterCards();
            })
          })
        }
        .width('100%')
        .padding({ left: 12 })
        .backgroundColor(Color.Transparent)

        // 卡片列表（瀑布流双列）
        Column() {
          this.buildMasonryGrid()
        }
        .layoutWeight(1)
        .padding({ left: 12, right: 12, top: 12 })
      }
      .width('100%')
      .height('100%')

      // 固定顶部导航栏
      Column() {
        this.buildHeader()
      }
      .width('100%')
      .alignItems(HorizontalAlign.Start)

      // 发帖悬浮按钮
      Column() {
        this.buildCreatePostButton()
      }
      .width('100%')
      .height('100%')
      .alignItems(HorizontalAlign.End)
      .alignItems(VerticalAlign.Bottom)
      .padding({ right: 16, bottom: 174 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(PageBackground)
  }

  // 获取头部高度
  private getHeaderHeight(): number {
    return 140;
  }

  // 顶部导航栏
  @Builder
  buildHeader() {
    Column() {
      Row() {
        Column() {
          Text('职圈')
            .fontSize(24)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(PrimaryText)
        }
        .width('30%')

        Text('大咖分享')
          .fontSize(14)
          .fontColor(Color.fromARGB(140, 0, 0, 0))
          .fontWeight(FontWeight.Medium)

        // 搜索框
        Row() {
          Image($r('sys.media.ohos_ic_public_search'))
            .width(18)
            .height(18)
            .fillColor(SearchPlaceholder)

          Text('搜索')
            .fontSize(12)
            .fontColor(SearchPlaceholder)
            .fontWeight(FontWeight.Light)
            .margin({ left: 10 })
        }
        .width('40%')
        .height(44)
        .backgroundColor(Color.White)
        .borderRadius(16)
        .justifyContent(FlexAlign.Center)
        .shadow({
          radius: 6,
          color: Color.fromARGB(20, 0, 0, 0)
        })
        .onClick(() => {
          this.props.onSearchClick?.();
        })
      }
      .width('100%')
      .height(68)
      .padding({ left: 18, right: 18, top: 12 })
    }
    .width('100%')
    .background(
      new LinearGradient({
        direction: GradientDirection.Top,
        colors: [
          [HeroGradientStart, 0],
          [HeroGradientEnd, 1]
        ]
      })
    )
  }

  // 瀑布流网格
  @Builder
  buildMasonryGrid() {
    Column() {
      Row() {
        // 左列
        Column() {
          ForEach(this.getLeftColumnCards(), (card: CircleCard) => {
            this.buildPostCard(card);
          })
        }
        .width('50%')
        .padding({ right: 4 })

        // 右列
        Column() {
          ForEach(this.getRightColumnCards(), (card: CircleCard) => {
            this.buildPostCard(card);
          })
        }
        .width('50%')
        .padding({ left: 4 })
      }
    }
    .width('100%')
    .height('100%')
  }

  // 构建帖子卡片
  @Builder
  buildPostCard(card: CircleCard) {
    Column() {
      // 图片区域
      Column() {
        if (card.coverImage) {
          Image(card.coverImage)
            .width('100%')
            .height(this.getImageHeight(card))
            .borderRadius({
              topLeft: CardCorner,
              topRight: CardCorner,
              bottomLeft: 0,
              bottomRight: 0
            })
            .objectFit(ImageFit.Cover)
        } else {
          // 占位图
          Column()
            .width('100%')
            .height(this.getImageHeight(card))
            .backgroundColor(Color.fromARGB(255, 229, 231, 235))
            .borderRadius({
              topLeft: CardCorner,
              topRight: CardCorner,
              bottomLeft: 0,
              bottomRight: 0
            })
        }

        // 大咖观点标签
        if (card.isExpert) {
          Column() {
            Text('大咖观点')
              .fontSize(12)
              .fontColor(Color.White)
              .fontWeight(FontWeight.Medium)
          }
          .backgroundColor(Color.fromARGB(229, 236, 124, 56))
          .borderRadius({
            topLeft: 0,
            topRight: CardCorner,
            bottomLeft: 0,
            bottomRight: 0
          })
          .padding({ left: 8, right: 8, top: 4, bottom: 4 })
          .position({ x: 0, y: 0 })
        }
      }
      .width('100%')
      .clip(true)

      // 内容区域
      Column() {
        Text(card.title)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor(PrimaryText)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .lineHeight(21)

        if (card.tags.length > 0) {
          Text(card.tags.slice(0, 2).map(t => '#' + t).join(' '))
            .fontSize(12)
            .fontColor(AccentOrange)
            .fontWeight(FontWeight.Normal)
            .margin({ top: 10 })
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .lineHeight(21)
        }
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 10, bottom: 8 })
      .alignItems(HorizontalAlign.Start)

      // 作者和浏览数
      Row() {
        // 头像
        if (card.authorAvatar) {
          Image(card.authorAvatar)
            .width(24)
            .height(24)
            .borderRadius(12)
        } else {
          Column() {
            Text(card.authorName.substring(0, 1))
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 75, 85, 99))
              .fontWeight(FontWeight.SemiBold)
          }
          .width(24)
          .height(24)
          .backgroundColor(Color.fromARGB(255, 239, 241, 244))
          .borderRadius(12)
          .justifyContent(FlexAlign.Center)
        }

        Text(card.authorName)
          .fontSize(12)
          .fontColor(PrimaryText)
          .fontWeight(FontWeight.Light)
          .margin({ left: 5 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .lineHeight(21)

        Blank()

        Row() {
          Image($r('sys.media.ohos_ic_public_view'))
            .width(16)
            .height(16)
            .fillColor(SearchPlaceholder)

          Text(this.formatViewCount(card.viewCount))
            .fontSize(12)
            .fontColor(SearchPlaceholder)
            .fontWeight(FontWeight.Light)
            .margin({ left: 4 })
        }
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 6, bottom: 8 })
    }
    .width('100%')
    .backgroundColor(WhiteColor)
    .borderRadius(CardCorner)
    .margin({ bottom: 8 })
    .onClick(() => {
      this.props.onCardClick?.(card);
    })
  }

  // 获取图片高度（根据卡片 ID 哈希值生成不同高度）
  private getImageHeight(card: CircleCard): number {
    const hash = Math.abs(card.id.hashCode());
    const heights = [170, 200, 180, 160, 190];
    return heights[hash % heights.length];
  }

  // 获取左列卡片
  private getLeftColumnCards(): CircleCard[] {
    let leftCards: CircleCard[] = [];
    this.cards.forEach((card, index) => {
      if (index % 2 === 0) {
        leftCards.push(card);
      }
    });
    return leftCards;
  }

  // 获取右列卡片
  private getRightColumnCards(): CircleCard[] {
    let rightCards: CircleCard[] = [];
    this.cards.forEach((card, index) => {
      if (index % 2 === 1) {
        rightCards.push(card);
      }
    });
    return rightCards;
  }

  // 格式化浏览数
  private formatViewCount(count: number): string {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  }

  // 过滤卡片
  private filterCards(): void {
    // 根据分类过滤
    if (this.currentCategory === CircleCategory.ALL) {
      this.cards = mockCircleCards;
    } else {
      // 模拟分类过滤
      this.cards = mockCircleCards;
    }
  }

  // 发帖悬浮按钮
  @Builder
  buildCreatePostButton() {
    Column() {
      Column() {
        Image($r('sys.media.ohos_ic_public_edit'))
          .width(20)
          .height(20)
          .fillColor(WhiteColor)
      }
      .width(60)
      .height(60)
      .backgroundColor(AccentOrange)
      .borderRadius(16)
      .shadow({
        radius: 6,
        color: Color.fromARGB(64, 0, 0, 0),
        offsetY: 2
      })
      .justifyContent(FlexAlign.Center)
      .onClick(() => {
        this.props.onCreatePost?.();
      })
    }
  }
}
