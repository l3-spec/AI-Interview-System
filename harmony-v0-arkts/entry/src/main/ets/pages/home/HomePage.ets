interface HomePageProps {
  onNavigateToJobs: () => void;
  onNavigateToCircle: () => void;
}

@Component
export default struct HomePage {
  onNavigateToJobs: () => void;
  onNavigateToCircle: () => void;

  private banners: string[] = [
    '开启 AI 面试之旅',
    '一键生成模拟题，随时练习',
    '面试数据全流程追踪',
  ];
  private readonly recommendedIndices: number[] = [0, 1, 2, 3, 4, 5];

  build() {
    Column({ space: 12 }) {
      this.buildTopBar();
      this.buildBannerCarousel();
      this.buildShortcutRow();
      this.buildContentList();
    }
    .width('100%')
    .height('100%')
    .padding({ left: 16, right: 16, top: 24, bottom: 24 })
    .backgroundColor(Color.fromARGB(255, 235, 235, 235))
  }

  private buildTopBar() {
    Column() {
      Text('AI 面试系统')
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
      Text('智能面试助手，提升候选人体验')
        .fontSize(14)
        .fontColor(Color.fromARGB(178, 0, 0, 0))
        .margin({ top: 4 })
    }
  }

  private buildBannerCarousel() {
    Scroll() {
      Row({ space: 16 }) {
        ForEach(this.banners, (item, index) => {
          Column() {
            Text(item)
              .fontSize(18)
              .fontWeight(FontWeight.Medium)
              .fontColor(Color.White)
              .margin({ bottom: 8 })
            Text('立即了解')
              .fontSize(14)
              .fontColor(Color.fromARGB(230, 255, 255, 255))
          }
          .width(220)
          .padding(20)
          .backgroundColor(this.bannerColor(index))
          .borderRadius(20)
          .shadow({ radius: 12, color: Color.fromARGB(64, 0, 0, 0), offsetY: 4 })
        }, (_, idx) => `${idx}`)
      }
      .padding({ right: 8 })
    }
    .scrollable(ScrollDirection.Horizontal)
    .height(140)
  }

  private buildShortcutRow() {
    Row({ space: 12 }) {
      this.shortcutCard('岗位推荐', '查看最新岗位', () => this.onNavigateToJobs?.())
      this.shortcutCard('职圈热点', '了解候选人心声', () => this.onNavigateToCircle?.())
    }
  }

  private shortcutCard(title: string, subtitle: string, onClick: () => void) {
    Column() {
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.fromARGB(255, 51, 51, 51))
      Text(subtitle)
        .fontSize(14)
        .fontColor(Color.fromARGB(180, 80, 80, 80))
        .margin({ top: 6 })
    }
    .width('50%')
    .padding(18)
    .backgroundColor(Color.White)
    .borderRadius(18)
    .shadow({ radius: 12, color: Color.fromARGB(52, 0, 0, 0), offsetY: 4 })
    .onClick(() => onClick?.())
  }

  private buildContentList() {
    Column({ space: 12 }) {
      Text('为你推荐')
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
      ForEach(this.recommendedIndices, (index) => {
        Column({ space: 6 }) {
          Text(`面试辅导主题 ${index + 1}`)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
          Text('通过 AI 视频面试、实时互动和多维评估帮助候选人脱颖而出。')
            .fontSize(14)
            .fontColor(Color.fromARGB(170, 60, 60, 60))
        }
        .padding(16)
        .backgroundColor(Color.White)
        .borderRadius(16)
        .shadow({ radius: 10, color: Color.fromARGB(40, 0, 0, 0), offsetY: 2 })
      }, (index) => `${index}`)
    }
    .margin({ top: 16 })
  }

  private bannerColor(index: number): Color {
    const colors = [
      Color.fromARGB(255, 0, 172, 195),
      Color.fromARGB(255, 236, 124, 56),
      Color.fromARGB(255, 109, 139, 224),
    ];
    return colors[index % colors.length];
  }
}
