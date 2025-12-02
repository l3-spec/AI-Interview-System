@Component
export default struct JobsPage {
  private readonly jobIndices: number[] = [0, 1, 2, 3, 4];

  build() {
    Column({ space: 16 }) {
      Text('精选岗位')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
      Text('同步安卓版本的岗位推荐、收藏与筛选功能。当前为鸿蒙占位页。')
        .fontSize(14)
        .fontColor(Color.fromARGB(170, 80, 80, 80))

      ForEach(this.jobIndices, (index) => {
        Column({ space: 8 }) {
          Text(`AI 算法工程师 · ${index + 1}`)
            .fontSize(18)
            .fontWeight(FontWeight.SemiBold)
          Text('负责 AI 面试平台算法设计，需熟悉深度学习与实时推理。')
            .fontSize(14)
            .fontColor(Color.fromARGB(170, 90, 90, 90))
        }
        .padding(16)
        .backgroundColor(Color.White)
        .borderRadius(16)
        .shadow({ radius: 12, color: Color.fromARGB(32, 0, 0, 0), offsetY: 2 })
      }, (index) => `${index}`)
    }
    .width('100%')
    .height('100%')
    .padding({ left: 16, right: 16, top: 24, bottom: 24 })
    .backgroundColor(Color.fromARGB(255, 243, 243, 243))
  }
}
