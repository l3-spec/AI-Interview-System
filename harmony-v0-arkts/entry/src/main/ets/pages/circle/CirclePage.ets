@Component
export default struct CirclePage {
  private readonly postIndices: number[] = [0, 1, 2, 3, 4, 5];

  build() {
    Column({ space: 16 }) {
      Text('职圈动态')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
      Text('迁移后将展示安卓端的瀑布流帖子、互动与评论系统。')
        .fontSize(14)
        .fontColor(Color.fromARGB(170, 80, 80, 80))

      ForEach(this.postIndices, (index) => {
        Column({ space: 6 }) {
          Text(`面试经验分享 · ${index + 1}`)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
          Text('记录真实面试场景、常见提问与 AI 面试技巧。')
            .fontSize(14)
            .fontColor(Color.fromARGB(170, 90, 90, 90))
        }
        .padding(18)
        .backgroundColor(Color.White)
        .borderRadius(18)
        .shadow({ radius: 10, color: Color.fromARGB(40, 0, 0, 0), offsetY: 3 })
      }, (index) => `${index}`)
    }
    .width('100%')
    .height('100%')
    .padding({ left: 16, right: 16, top: 24, bottom: 24 })
    .backgroundColor(Color.fromARGB(255, 247, 247, 247))
  }
}
