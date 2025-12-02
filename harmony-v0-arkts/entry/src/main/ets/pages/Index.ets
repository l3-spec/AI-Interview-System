import promptAction from '@ohos.promptAction';

@Entry
@Component
struct Index {
  @State message: string = 'AI Interview HarmonyOS 版本正在迁移中';

  build() {
    Column() {
      Text('AI Interview')
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 24 })
      Text(this.message)
        .fontSize(16)
        .opacity(0.8)
        .margin({ top: 12, bottom: 32, left: 24, right: 24 })
      Button('查看安卓实现参考') {
        this.openReference()
      }
        .type(ButtonType.Capsule)
        .margin({ top: 12 })
    }
    .justifyContent(FlexAlign.Center)
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
    .padding({ left: 24, right: 24 })
  }

  private openReference() {
    // Placeholder action. Replace with a real navigation once ArkTS pages are ready.
    promptAction.showToast({
      message: '请参考 entry/src/main/reference/android 目录进行迁移'
    });
  }
}
