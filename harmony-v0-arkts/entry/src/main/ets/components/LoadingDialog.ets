/**
 * 通用加载弹窗组件 - Loading 遮罩
 */

@Component
export struct LoadingDialog {
  @Prop message: string = '加载中...';
  @Prop visible: boolean = true;

  build() {
    if (this.visible) {
      Stack() {
        // 半透明遮罩背景
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(128, 0, 0, 0))
          .onClick(() => {
            // 拦截背景点击，防止误操作
          })

        // 加载内容卡片
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color(Color.fromARGB(255, 255, 255, 255))

          Text(this.message)
            .fontSize(14)
            .fontColor(Color.fromARGB(255, 255, 255, 255))
            .margin({ top: 16 })
        }
        .padding(32)
        .backgroundColor(Color.fromARGB(204, 58, 58, 58))
        .borderRadius(16)
        .align(Alignment.Center)
      }
      .width('100%')
      .height('100%')
    }
  }
}

/**
 * 全屏加载遮罩（可点击背景关闭）
 */
@Component
export struct LoadingOverlay {
  @Prop visible: boolean = true;
  @Prop dismissible: boolean = false;
  @Prop message: string = '加载中...';
  onDismiss?: () => void;

  build() {
    if (this.visible) {
      Stack() {
        // 点击遮罩关闭
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(100, 0, 0, 0))
          .onClick(() => {
            if (this.dismissible) {
              this.onDismiss?.();
            }
          })

        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color(Color.fromARGB(255, 236, 124, 56))

          Text(this.message)
            .fontSize(14)
            .fontColor(Color.fromARGB(179, 44, 44, 44))
            .margin({ top: 16 })
        }
        .padding(32)
        .backgroundColor(Color.fromARGB(230, 255, 255, 255))
        .borderRadius(16)
        .shadow({
          radius: 20,
          color: Color.fromARGB(64, 0, 0, 0),
          offsetY: 4,
        })
        .align(Alignment.Center)
      }
      .width('100%')
      .height('100%')
    }
  }
}

/**
 * 按钮内嵌小加载指示器
 */
@Component
export struct SmallLoading {
  @Prop color: Color = Color.White;
  @Prop size: number = 20;

  build() {
    LoadingProgress()
      .width(this.size)
      .height(this.size)
      .color(this.color)
  }
}
