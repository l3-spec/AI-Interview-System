/**
 * 数字人视图占位组件
 * 模拟数字人区域，支持说话动画和空闲状态
 */

@Component
export default struct DigitalHumanView {
  @State private var isSpeaking: boolean = false;
  @State private var mouthScale: number = 1.0;
  @State private var animatingMouth: boolean = false;

  private mouthTimer: number = -1;

  aboutToAppear(): void {
    this.startMouthAnimation();
  }

  aboutToDisappear(): void {
    this.stopMouthAnimation();
  }

  private startMouthAnimation() {
    if (this.mouthTimer !== -1) {
      return;
    }
    this.animatingMouth = true;
    this.mouthTimer = setInterval(() => {
      animateTo({
        duration: 150,
        curve: Curve.EaseInOut
      }, () => {
        this.mouthScale = this.isSpeaking ? (this.mouthScale > 1.0 ? 0.7 : 1.3) : 1.0;
      });
    }, 300);
  }

  private stopMouthAnimation() {
    if (this.mouthTimer !== -1) {
      clearInterval(this.mouthTimer);
      this.mouthTimer = -1;
    }
    this.animatingMouth = false;
    this.mouthScale = 1.0;
  }

  /**
   * 设置是否在说话状态
   */
  setSpeaking(speaking: boolean): void {
    this.isSpeaking = speaking;
  }

  build() {
    Stack({ alignContent: Alignment.Center }) {
      // 背景圆形
      Circle() {
        Column() {
          // 数字人占位图
          Stack({ alignContent: Alignment.Center }) {
            // 头部圆形
            Circle() {
              Column() {
                // 眼睛区域
                Row() {
                  Circle() {
                    Text('👁')
                      .fontSize(24)
                  }
                  .width(30)
                  .height(30)
                  .margin({ left: 30, right: 30 })

                  Circle() {
                    Text('👁')
                      .fontSize(24)
                  }
                  .width(30)
                  .height(30)
                }
                .margin({ top: 40 })

                // 嘴巴区域
                Circle() {
                  Text('👄')
                    .fontSize(32)
                }
                .width(50)
                .height(30)
                .scale({ x: this.mouthScale, y: this.mouthScale })
                .margin({ top: 20 })
              }
            }
            .width(150)
            .height(150)
            .backgroundColor(Color.fromARGB(255, 230, 240, 250))
          }
          .width('100%')
          .height(180)
        }
      }
      .width(200)
      .height(200)
      .backgroundColor(Color.fromARGB(255, 200, 230, 245))
      .border({
        width: 2,
        color: Color.fromARGB(128, 0, 173, 195)
      })
      .borderRadius(100)

      // 状态指示
      if (this.isSpeaking) {
        Text('数字人播报中...')
          .fontSize(12)
          .fontColor(Color.fromARGB(200, 0, 173, 195))
          .margin({ top: 220 })
      } else {
        Text('等待开始面试')
          .fontSize(12)
          .fontColor(Color.fromARGB(150, 150, 150, 150))
          .margin({ top: 220 })
      }
    }
    .width('100%')
    .height(250)
  }
}
