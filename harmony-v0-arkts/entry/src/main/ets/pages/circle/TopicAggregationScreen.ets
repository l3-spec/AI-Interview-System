// TopicAggregationScreen.ets - 话题聚合页
// 参考 Android TopicAggregationScreen.kt 实现完整功能

const AccentBlue = Color.fromARGB(255, 99, 102, 241);
const AccentCyan = Color.fromARGB(255, 14, 165, 233);
const AccentOrange = Color.fromARGB(255, 255, 140, 66);
const AccentPink = Color.fromARGB(255, 236, 72, 153);
const TextPrimary = Color.fromARGB(255, 31, 41, 55);
const TextSecondary = Color.fromARGB(255, 75, 85, 115);
const TextTertiary = Color.fromARGB(255, 156, 163, 175);
const CardBackground = Color.White;
const PageBackground = Color.fromARGB(255, 245, 246, 250);

// 话题帖子数据
export interface TopicPost {
  id: string;
  author: string;
  role: string;
  experience: string;
  time: string;
  title: string;
  summary: string;
  primaryTag: string;
  otherTags: string[];
  avatarColor: Color;
}

// 话题聚合详情
export interface TopicAggregationDetail {
  id: string;
  tag: string;
  displayTitle: string;
  description: string;
  participants: number;
  newParticipants: string;
  growth: number;
  expertCount: string;
  heat: number;
  theme: [Color, Color][];
  posts: TopicPost[];
}

// TopicAggregationScreen Props
export interface TopicAggregationScreenProps {
  topicId: string;
  topicTitle: string;
  onBack: () => void;
  onPostClick: (postId: string) => void;
}

// 获取话题颜色主题
function getTopicTheme(topicId: string): [Color, Color][] {
  switch (topicId) {
    case 'topic_resume':
      return [
        [AccentPink, Color.fromARGB(255, 255, 108, 171)],
        [Color.fromARGB(255, 251, 207, 232), Color.fromARGB(255, 255, 255, 255)]
      ];
    case 'topic_offer':
      return [
        [AccentCyan, Color.fromARGB(255, 56, 189, 248)],
        [Color.fromARGB(255, 224, 242, 254), Color.fromARGB(255, 255, 255, 255)]
      ];
    default:
      return [
        [AccentBlue, Color.fromARGB(255, 107, 91, 255)],
        [Color.fromARGB(255, 238, 242, 255), Color.fromARGB(255, 255, 255, 255)]
      ];
  }
}

// 模拟话题数据
function mockTopicAggregation(topicId: string, topicTitle: string): TopicAggregationDetail {
  const theme = getTopicTheme(topicId);
  const tagName = topicId === 'topic_resume' ? '简历加成' : topicId === 'topic_offer' ? '拿Offer' : 'AI求职';

  return {
    id: topicId,
    tag: tagName,
    displayTitle: topicTitle || 'STAR-LINK 热门话题',
    description: '聚合 STAR-LINK 社区的高价值经验、实时招聘信息与职业教练答疑，为你提供最新的岗位洞察与行动建议。',
    participants: 2893,
    newParticipants: '+428',
    growth: 32,
    expertCount: '8 位',
    heat: 9876,
    theme: theme,
    posts: [
      {
        id: `${topicId}_post_1`,
        author: 'Milla',
        role: '数据科学家',
        experience: '经验分享',
        time: '2 小时前',
        title: 'AI 行业岗位如何准备结构化面试',
        summary: '结合 STAR-LINK AI 面试系统的最新追问模块，整理 4 套高频问题应对模板，并附上实时反馈要点，帮助你在追问环节更自信。',
        primaryTag: topicTitle || 'AI求职',
        otherTags: ['面试技巧', 'STAR-LINK'],
        avatarColor: Color.fromARGB(255, 56, 178, 172)
      },
      {
        id: `${topicId}_post_2`,
        author: 'Lance',
        role: '职业教练',
        experience: '教练点评',
        time: '昨天',
        title: '30 分钟优化简历的三步法',
        summary: '精选 6 个真实案例，展示如何从成果拆解、数据量化和项目亮点三个维度打磨 STAR-LINK 候选人的简历内容。',
        primaryTag: '案例拆解',
        otherTags: ['行业洞察', '效率工具'],
        avatarColor: AccentOrange
      },
      {
        id: `${topicId}_post_3`,
        author: '星链校招组',
        role: '招聘团队',
        experience: '官方公告',
        time: '3 天前',
        title: '本周岗位开放职位与面试日程',
        summary: '集中发布最新的开放岗位、面试安排以及应聘者常见问题解答，助你快速锁定最匹配的机会。',
        primaryTag: '招聘信息',
        otherTags: ['岗位推荐', '校招'],
        avatarColor: AccentBlue
      }
    ]
  };
}

@Component
export struct TopicAggregationScreen {
  private props: TopicAggregationScreenProps;
  @State private detail: TopicAggregationDetail = mockTopicAggregation(this.props.topicId, this.props.topicTitle);

  build() {
    Column() {
      // 顶部导航栏
      this.buildTopBar()

      // 内容列表
      List() {
        // 话题英雄卡片
        ListItem() {
          this.buildTopicHero()
        }

        // 话题指标
        ListItem() {
          this.buildTopicMetrics()
        }

        // 精选帖子标题
        ListItem() {
          Text('精选帖子')
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(TextPrimary)
            .width('100%')
            .padding({ left: 20, right: 20, top: 8, bottom: 8 })
        }

        // 帖子卡片列表
        ForEach(this.detail.posts, (post: TopicPost) => {
          ListItem() {
            this.buildPostCard(post)
          }
        })

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
        Text(this.detail.displayTitle)
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(TextPrimary)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(this.detail.participants + ' 人参与 · 热度 ' + this.detail.heat)
          .fontSize(12)
          .fontColor(TextTertiary)
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

  // 话题英雄卡片
  @Builder
  buildTopicHero() {
    Column() {
      // 渐变背景头部
      Column() {
        // 话题标签
        Column() {
          Text('#' + this.detail.tag)
            .fontSize(14)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(Color.White)
        }
        .backgroundColor(Color.fromARGB(38, 255, 255, 255))
        .borderRadius(12)
        .padding({ left: 12, right: 12, top: 6, bottom: 6 })

        Text(this.detail.displayTitle)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .margin({ top: 16 })
          .textAlign(TextAlign.Start)
          .width('100%')

        Text(this.detail.description)
          .fontSize(14)
          .fontColor(Color.fromARGB(230, 255, 255, 255))
          .margin({ top: 12 })
          .lineHeight(22)
      }
      .width('100%')
      .padding(24)
      .background(
        new LinearGradient({
          direction: GradientDirection.Top,
          colors: this.detail.theme[0]
        })
      )
      .borderRadius(24)
      .margin({ top: 12 })
    }
    .width('100%')
  }

  // 话题指标
  @Builder
  buildTopicMetrics() {
    Row() {
      // 近7日新增
      Column() {
        Text('近7日新增')
          .fontSize(12)
          .fontColor(TextSecondary)

        Text(this.detail.newParticipants)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(TextPrimary)
          .margin({ top: 8 })

        Row() {
          Image($r('sys.media.ohos_ic_public_up'))
            .width(18)
            .height(18)
            .fillColor(Color.fromARGB(255, 16, 185, 129))

          Text('+' + this.detail.growth + '% 人关注')
            .fontSize(12)
            .fontColor(Color.fromARGB(255, 16, 185, 129))
        }
        .margin({ top: 8 })
      }
      .layoutWeight(1)
      .padding({ left: 20, right: 20, top: 18, bottom: 18 })
      .backgroundColor(CardBackground)
      .borderRadius(20)
      .shadow({
        radius: 3,
        color: Color.fromARGB(13, 0, 0, 0),
        offsetY: 2
      })

      Column() {
        Text('大咖答疑')
          .fontSize(12)
          .fontColor(TextSecondary)

        Text(this.detail.expertCount)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(TextPrimary)
          .margin({ top: 8 })

        Row() {
          Image($r('sys.media.ohos_ic_public_star'))
            .width(18)
            .height(18)
            .fillColor(Color.fromARGB(255, 16, 185, 129))

          Text('职业教练在线')
            .fontSize(12)
            .fontColor(Color.fromARGB(255, 16, 185, 129))
        }
        .margin({ top: 8 })
      }
      .layoutWeight(1)
      .padding({ left: 20, right: 20, top: 18, bottom: 18 })
      .backgroundColor(CardBackground)
      .borderRadius(20)
      .shadow({
        radius: 3,
        color: Color.fromARGB(13, 0, 0, 0),
        offsetY: 2
      })
      .margin({ left: 12 })
    }
    .width('100%')
    .margin({ top: 16 })
  }

  // 帖子卡片
  @Builder
  buildPostCard(post: TopicPost) {
    Column() {
      // 作者信息
      Row() {
        // 头像
        Column() {
          Text(post.author.substring(0, 1))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(post.avatarColor)
        }
        .width(44)
        .height(44)
        .backgroundColor(Color.fromARGB(41, 255, 140, 66))
        .borderRadius(22)
        .justifyContent(FlexAlign.Center)

        Column() {
          Text(post.author)
            .fontSize(14)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(TextPrimary)

          Text(post.role + ' · ' + post.time)
            .fontSize(12)
            .fontColor(TextTertiary)
            .margin({ top: 2 })
        }
        .margin({ left: 12 })
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)

        // 经验标签
        Column() {
          Text(post.experience)
            .fontSize(12)
            .fontColor(AccentBlue)
        }
        .backgroundColor(Color.fromARGB(31, 102, 126, 234))
        .borderRadius(12)
        .padding({ left: 12, right: 12, top: 6, bottom: 6 })
      }

      // 标题
      Text(post.title)
        .fontSize(16)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(TextPrimary)
        .margin({ top: 16 })
        .textAlign(TextAlign.Start)
        .width('100%')

      // 摘要
      Text(post.summary)
        .fontSize(14)
        .fontColor(TextSecondary)
        .margin({ top: 8 })
        .lineHeight(22)
        .maxLines(4)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      // 分隔线
      Column()
        .width('100%')
        .height(1)
        .backgroundColor(Color.fromARGB(255, 242, 244, 247))
        .margin({ top: 16 })

      // 标签
      Row() {
        this.buildTagChip(post.primaryTag);

        ForEach(post.otherTags.slice(0, 2), (tag: string) => {
          this.buildTagChip(tag);
        })
      }
      .margin({ top: 12 })
    }
    .width('100%')
    .padding(20)
    .backgroundColor(CardBackground)
    .borderRadius(22)
    .shadow({
      radius: 2,
      color: Color.fromARGB(13, 0, 0, 0),
      offsetY: 2
    })
    .margin({ top: 8 })
    .onClick(() => {
      this.props.onPostClick?.(post.id);
    })
  }

  // 标签芯片
  @Builder
  buildTagChip(label: string) {
    Text('# ' + label)
      .fontSize(12)
      .fontColor(Color.fromARGB(255, 79, 70, 229))
      .padding({ left: 10, right: 10, top: 6, bottom: 6 })
      .backgroundColor(Color.fromARGB(255, 243, 244, 246))
      .borderRadius(12)
      .margin({ right: 8 })
  }
}
