/**
 * 面试完成页面
 * 显示面试结果统计
 */

interface InterviewCompleteScreenProps {
  totalQuestions: number;
  answeredQuestions: number;
  totalDuration: number; // 秒
  onBackHome: () => void;
  onViewReport: () => void;
  onPracticeAgain: () => void;
}

@Component
export default struct InterviewCompleteScreen {
  props: InterviewCompleteScreenProps = {
    totalQuestions: 8,
    answeredQuestions: 8,
    totalDuration: 0,
    onBackHome: () => {},
    onViewReport: () => {},
    onPracticeAgain: () => {}
  };

  @State private countdown: number = 5;
  @State private showContent: boolean = false;
  @State private checkScale: number = 1.0;

  aboutToAppear(): void {
    // 入场动画
    setTimeout(() => {
      this.showContent = true;
      // 复选框缩放动画
      animateTo({
        duration: 400,
        curve: Curve.EaseOut
      }, () => {
        this.checkScale = 1.1;
      });
      animateTo({
        duration: 300,
        curve: Curve.EaseIn
      }, () => {
        this.checkScale = 1.0;
      });
    }, 300);

    // 倒计时返回首页
    this.startCountdown();
  }

  private timerId: number = -1;

  private startCountdown(): void {
    this.countdown = 5;
    this.timerId = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.stopCountdown();
        this.props.onBackHome?.();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  }

  build() {
    Column() {
      // 顶部留白
      Column() {}
        .height(60)

      // 完成图标区域
      if (this.showContent) {
        Column() {
          // 渐变背景卡片
          Column() {
            // 圆角矩形背景
            Column() {
              // 橙色圆形对勾
              Circle() {
                Text('✓')
                  .fontSize(48)
                  .fontColor(Color.White)
                  .fontWeight(FontWeight.Bold)
              }
              .width(80)
              .height(80)
              .backgroundColor(Color.fromARGB(255, 255, 162, 71))
              .scale({ x: this.checkScale, y: this.checkScale })
            }
            .width(200)
            .height(150)
            .backgroundColor(Color.fromARGB(255, 230, 248, 255))
            .borderRadius(20)
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
          }
          .width(220)
          .height(170)

          // 标题
          Text('🎉 面试已完成!')
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.fromARGB(255, 50, 50, 50))
            .margin({ top: 24 })

          Text('恭喜你完成了本次AI模拟面试')
            .fontSize(14)
            .fontColor(Color.fromARGB(150, 100, 100, 100))
            .margin({ top: 8 })
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
      }

      Blank()

      // 统计信息卡片
      if (this.showContent) {
        Column() {
          // 统计卡片
          Column() {
            // 三个统计项
            Row() {
              this.buildStatItem('📋', '总题数', `${this.props.totalQuestions}题`)
              this.buildStatItem('⏱', '用时', this.formatDuration(this.props.totalDuration))
              this.buildStatItem('✅', '已答', `${this.props.answeredQuestions}题`)
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceEvenly)
          }
          .width('100%')
          .padding({ top: 24, bottom: 24 })
          .backgroundColor(Color.White)
          .borderRadius(16)
          .margin({ left: 24, right: 24 })
        }
      }

      Blank()

      // 按钮区域
      if (this.showContent) {
        Column() {
          // 查看报告按钮
          Button('查看面试报告')
            .width('100%')
            .height(50)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .backgroundColor(Color.fromARGB(255, 0, 173, 195))
            .borderRadius(25)
            .margin({ left: 24, right: 24 })
            .onClick(() => this.props.onViewReport?.())

          // 再练一次按钮
          Button('再练一次')
            .width('100%')
            .height(50)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor(Color.fromARGB(255, 0, 173, 195))
            .backgroundColor(Color.Transparent)
            .border({
              width: 1.5,
              color: Color.fromARGB(255, 0, 173, 195)
            })
            .borderRadius(25)
            .margin({ left: 24, right: 24, top: 12 })
            .onClick(() => this.props.onPracticeAgain?.())

          // 返回首页按钮
          Row() {
            Text(`${this.countdown}s后自动返回首页`)
              .fontSize(12)
              .fontColor(Color.fromARGB(150, 150, 150, 150))
            Text(' | ')
              .fontSize(12)
              .fontColor(Color.fromARGB(150, 150, 150, 150))
            Text('返回首页')
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 0, 173, 195))
              .onClick(() => {
                this.stopCountdown();
                this.props.onBackHome?.();
              })
          }
          .margin({ top: 20, bottom: 32 })
        }
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.fromARGB(255, 246, 248, 252))
  }

  @Builder
  private buildStatItem(icon: string, label: string, value: string) {
    Column() {
      Text(icon)
        .fontSize(24)

      Text(label)
        .fontSize(12)
        .fontColor(Color.fromARGB(150, 120, 120, 120))
        .margin({ top: 4 })

      Text(value)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.fromARGB(255, 50, 50, 50))
        .margin({ top: 2 })
    }
    .alignItems(HorizontalAlign.Center)
  }
}
