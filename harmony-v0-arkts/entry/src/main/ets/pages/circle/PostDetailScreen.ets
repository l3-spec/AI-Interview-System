// PostDetailScreen.ets - 帖子详情页
// 参考 Android PostDetailScreen.kt 实现完整功能

const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const AccentCyan = Color.fromARGB(255, 0, 172, 195);
const PrimaryText = Color.fromARGB(255, 0, 0, 0);
const SecondaryText = Color.fromARGB(255, 181, 183, 184);
const MutedText = Color.fromARGB(255, 133, 134, 135);
const DividerColor = Color.fromARGB(255, 229, 231, 235);
const CardBackground = Color.White;
const PageBackground = Color.fromARGB(255, 244, 245, 246);

// 作者信息
export interface PostAuthor {
  name: string;
  title: string;
  highlight: string;
  tags: string[];
  avatarColor: Color;
  avatarUrl: string;
}

// 评论数据
export interface PostComment {
  id: string;
  author: string;
  identity: string;
  content: string;
  time: string;
  avatarColor: Color;
}

// 帖子详情数据
export interface PostDetail {
  id: string;
  title: string;
  publishDate: string;
  viewCount: string;
  likeCount: number;
  collectCount: number;
  commentCount: number;
  author: PostAuthor;
  heroImageUrl: string;
  content: string;
  comments: PostComment[];
}

// PostDetailScreen Props
export interface PostDetailScreenProps {
  postId: string;
  onBack: () => void;
}

// 模拟帖子详情数据
const mockPostDetail: PostDetail = {
  id: 'post_1',
  title: 'AI时代下的职业转型指南',
  publishDate: '编辑于2025年10月07日 北京',
  viewCount: '729',
  likeCount: 190,
  collectCount: 190,
  commentCount: 7,
  author: {
    name: '产品老司机',
    title: '简单介绍',
    highlight: '',
    tags: [],
    avatarColor: AccentOrange,
    avatarUrl: ''
  },
  heroImageUrl: '',
  content: `对留学生而言，回国求职最大的挑战并非能力，而是 "信息差" 和 "时间差"。熟悉并高效利用以下招聘渠道，是成功上岸的第一步。

第一类：企业官方渠道（最权威，最核心）

这是所有求职渠道中优先级最高的方式，尤其针对你的目标公司。

1. 公司官网 Careers Page
是什么：几乎所有大中型企业都会在自己官方网站上设立"人才招聘"或"校园招聘"板块。

优点：
• 信息最准确权威，职位描述（JD）最详细
• 投递流程最正式，直接进入企业人才库（ATS）
• 通常会完整展示企业文化、培养体系

使用技巧：
• 建立你的 "目标公司清单"，定期巡查其官网的招聘动态
• 注意申请截止日期
• 留学生务必仔细阅读毕业时间要求`,
  comments: [
    {
      id: 'comment_1',
      author: '产品老司机',
      identity: '',
      content: '这里展示评论的文字内容这里展示评论的文字内容这里展示评论的文字内容',
      time: '2025-05-16 13:00',
      avatarColor: AccentOrange
    },
    {
      id: 'comment_2',
      author: '用户甲',
      identity: '',
      content: '感谢分享！这些信息对我很有帮助。',
      time: '2025-05-16 14:30',
      avatarColor: AccentCyan
    },
    {
      id: 'comment_3',
      author: '求职者乙',
      identity: '',
      content: '请问有没有针对留学生的特别建议？',
      time: '2025-05-17 09:00',
      avatarColor: Color.fromARGB(255, 99, 102, 241)
    }
  ]
};

@Component
export struct PostDetailScreen {
  private props: PostDetailScreenProps;
  @State private detail: PostDetail = mockPostDetail;
  @State private isLoading: boolean = false;
  @State private commentText: string = '';

  build() {
    Column() {
      // 顶部导航栏
      this.buildTopBar()

      // 内容列表
      List() {
        // 帖子头部
        ListItem() {
          this.buildPostHeader()
        }

        // 主图
        if (this.detail.heroImageUrl) {
          ListItem() {
            this.buildHeroImage()
          }
        }

        // 作者信息卡片
        ListItem() {
          this.buildAuthorCard()
        }

        // 正文内容
        ListItem() {
          this.buildContent()
        }

        // 评论标题
        ListItem() {
          Row() {
            Column()
              .width('100%')
              .height(1)
              .backgroundColor(DividerColor)
          }
          .width('100%')
          .padding({ left: 12, right: 12 })
        }

        ListItem() {
          Text('共' + this.detail.commentCount + '条评论')
            .fontSize(12)
            .fontColor(SecondaryText)
            .fontWeight(FontWeight.Light)
            .padding({ left: 12, right: 12, top: 12, bottom: 10 })
        }

        // 评论列表
        ForEach(this.detail.comments, (comment: PostComment) => {
          ListItem() {
            this.buildCommentItem(comment)
          }
        })

        // 底部间距
        ListItem() {
          Column().height(96)
        }
      }
      .width('100%')
      .layoutWeight(1)
      .padding({ left: 12, right: 12 })
      .sticky(StickyStyle.None)

      // 底部评论输入框
      this.buildBottomBar()
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
        .fillColor(PrimaryText)
        .onClick(() => {
          this.props.onBack?.();
        })

      Text(this.detail.title)
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(PrimaryText)
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .margin({ left: 4, right: 4 })
    }
    .width('100%')
    .height(56)
    .padding({ left: 12, right: 12 })
    .backgroundColor(CardBackground)
    .alignItems(VerticalAlign.Center)
  }

  // 帖子头部
  @Builder
  buildPostHeader() {
    Column() {
      Row() {
        Text(this.detail.publishDate)
          .fontSize(12)
          .fontColor(SecondaryText)
          .fontWeight(FontWeight.Light)
          .lineHeight(21)

        Image($r('sys.media.ohos_ic_public_view'))
          .width(16)
          .height(16)
          .fillColor(SecondaryText)
          .margin({ left: 8 })

        Text(this.detail.viewCount)
          .fontSize(12)
          .fontColor(SecondaryText)
          .fontWeight(FontWeight.Light)
          .margin({ left: 4 })
      }
      .width('100%')
      .padding({ left: 0, right: 0, top: 8, bottom: 0 })
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 8, bottom: 8 })
  }

  // 主图
  @Builder
  buildHeroImage() {
    Column() {
      if (this.detail.heroImageUrl) {
        Image(this.detail.heroImageUrl)
          .width('100%')
          .height(197)
          .borderRadius(8)
          .objectFit(ImageFit.Cover)
      } else {
        // 占位图
        Column() {
          Text('📄')
            .fontSize(48)
        }
        .width('100%')
        .height(197)
        .backgroundColor(Color.fromARGB(255, 229, 231, 235))
        .borderRadius(8)
        .justifyContent(FlexAlign.Center)
      }
    }
    .width('100%')
    .padding({ left: 12, right: 12 })
  }

  // 作者信息卡片
  @Builder
  buildAuthorCard() {
    Row() {
      // 头像
      if (this.detail.author.avatarUrl) {
        Image(this.detail.author.avatarUrl)
          .width(36)
          .height(36)
          .borderRadius(18)
      } else {
        Column() {
          Text(this.detail.author.name.substring(0, 1))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.detail.author.avatarColor)
        }
        .width(36)
        .height(36)
        .backgroundColor(this.detail.author.avatarColor.copy((alpha: 0.16) as any))
        .borderRadius(18)
        .justifyContent(FlexAlign.Center)
      }

      Column() {
        Text(this.detail.author.name)
          .fontSize(12)
          .fontColor(AccentOrange)
          .fontWeight(FontWeight.Light)
          .lineHeight(21)

        if (this.detail.author.title) {
          Text(this.detail.author.title)
            .fontSize(12)
            .fontColor(SecondaryText)
            .fontWeight(FontWeight.Light)
            .lineHeight(21)
        }
      }
      .margin({ left: 12 })
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding(12)
    .backgroundColor(CardBackground)
    .borderRadius(8)
    .margin({ left: 12, right: 12, top: 12 })
    .alignItems(VerticalAlign.Center)
  }

  // 正文内容
  @Builder
  buildContent() {
    Column() {
      Text(this.detail.content)
        .fontSize(14)
        .fontColor(PrimaryText)
        .fontWeight(FontWeight.Normal)
        .lineHeight(22)
    }
    .width('100%')
    .padding(12)
    .backgroundColor(CardBackground)
    .margin({ left: 12, right: 12, top: 12 })
    .alignItems(HorizontalAlign.Start)
  }

  // 评论项
  @Builder
  buildCommentItem(comment: PostComment) {
    Row() {
      // 头像
      Column() {
        Text(comment.author.substring(0, 1))
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(comment.avatarColor)
      }
      .width(36)
      .height(36)
      .backgroundColor(comment.avatarColor.copy((alpha: 0.16) as any))
      .borderRadius(18)
      .justifyContent(FlexAlign.Center)

      Column() {
        Text(comment.author)
          .fontSize(12)
          .fontColor(AccentOrange)
          .fontWeight(FontWeight.Light)
          .lineHeight(21)

        Text(comment.content)
          .fontSize(14)
          .fontColor(PrimaryText)
          .fontWeight(FontWeight.Normal)
          .lineHeight(22)
          .margin({ top: 2 })

        Text(comment.time)
          .fontSize(12)
          .fontColor(MutedText)
          .fontWeight(FontWeight.Light)
          .lineHeight(21)
          .margin({ top: 2 })
      }
      .margin({ left: 12 })
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 12, bottom: 12 })
    .backgroundColor(CardBackground)
    .margin({ left: 12, right: 12, top: 8 })
    .alignItems(VerticalAlign.Top)
  }

  // 底部操作栏
  @Builder
  buildBottomBar() {
    Column() {
      // 分隔线
      Column() {
        Column()
          .width('100%')
          .height(1)
          .backgroundColor(DividerColor)
      }
      .width('100%')

      Row() {
        // 评论输入框
        TextInput({ placeholder: '添加评论', text: this.commentText })
          .width('55%')
          .height(32)
          .fontSize(12)
          .fontColor(PrimaryText)
          .backgroundColor(Color.White)
          .borderRadius(8)
          .border({
            width: 1,
            color: SecondaryText,
            radius: 8
          })
          .padding({ left: 8, right: 8 })
          .onChange((value: string) => {
            this.commentText = value;
          })

        // 操作按钮
        Row() {
          // 点赞
          Column() {
            Row() {
              Image($r('sys.media.ohos_ic_public_thumbs_up'))
                .width(24)
                .height(24)
                .fillColor(PrimaryText)

              Text(this.detail.likeCount.toString())
                .fontSize(12)
                .fontColor(PrimaryText)
                .fontWeight(FontWeight.Light)
                .margin({ left: 2 })
            }
          }
          .margin({ left: 16 })

          // 收藏
          Column() {
            Row() {
              Image($r('sys.media.ohos_ic_public_collect'))
                .width(24)
                .height(24)
                .fillColor(PrimaryText)

              Text(this.detail.collectCount.toString())
                .fontSize(12)
                .fontColor(PrimaryText)
                .fontWeight(FontWeight.Light)
                .margin({ left: 2 })
            }
          }
          .margin({ left: 16 })

          // 评论
          Column() {
            Row() {
              Image($r('sys.media.ohos_ic_public_message'))
                .width(24)
                .height(24)
                .fillColor(PrimaryText)

              Text(this.detail.commentCount.toString())
                .fontSize(12)
                .fontColor(PrimaryText)
                .fontWeight(FontWeight.Light)
                .margin({ left: 2 })
            }
          }
          .margin({ left: 16 })
        }
        .margin({ left: 10 })
      }
      .width('100%')
      .padding({ left: 12, right: 12, top: 10, bottom: 10 })
      .backgroundColor(CardBackground)
    }
    .width('100%')
    .shadow({
      radius: 8,
      color: Color.Black.copy((alpha: 0.1) as any)
    })
  }
}
