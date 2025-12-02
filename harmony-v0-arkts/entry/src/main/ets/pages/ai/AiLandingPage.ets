interface AiLandingPageProps {
  onBack: () => void;
}

@Component
export default struct AiLandingPage {
  onBack: () => void;

  build() {
    Column({ space: 18 }) {
      Row() {
        Text('AI 面试中心')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
        Button('返回主界面', { type: ButtonType.Capsule })
          .onClick(() => this.onBack?.())
      }
      .justifyContent(FlexAlign.SpaceBetween)
      Text('这里将接入安卓端的数字人会话、实时音视频、题库驱动与面试记录。')
        .fontSize(15)
        .fontColor(Color.fromARGB(180, 70, 70, 70))
      this.buildFeatureCards()
    }
    .width('100%')
    .height('100%')
    .padding({ left: 16, right: 16, top: 32, bottom: 24 })
    .backgroundColor(Color.fromARGB(255, 246, 248, 252))
  }

  private buildFeatureCards() {
    Column({ space: 14 }) {
      this.featureCard('实时数字人', '支持 WebRTC/HLS 拉流，与候选人实时互动。')
      this.featureCard('音频驱动', '上传语音驱动数字人播报面试题。')
      this.featureCard('文本驱动', '快速生成模拟面试脚本，提升候选人体验。')
    }
  }

  private featureCard(title: string, subtitle: string) {
    Column({ space: 8 }) {
      Text(title)
        .fontSize(18)
        .fontWeight(FontWeight.SemiBold)
      Text(subtitle)
        .fontSize(14)
        .fontColor(Color.fromARGB(180, 90, 90, 90))
    }
    .padding(18)
    .backgroundColor(Color.White)
    .borderRadius(18)
    .shadow({ radius: 12, color: Color.fromARGB(42, 0, 0, 0), offsetY: 3 })
  }
}
