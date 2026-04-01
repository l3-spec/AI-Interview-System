/**
 * 面试进度条组件
 * 显示当前题数/总题数、进度条、时间计时
 */

@Component
export default struct InterviewProgressBar {
  @State private var elapsedSeconds: number = 0;
  @State private var timerRunning: boolean = false;

  private timerId: number = -1;

  // props
  currentIndex: number = 1;
  totalQuestions: number = 8;
  onTimerUpdate?: (seconds: number) => void = undefined;

  aboutToAppear(): void {
    this.startTimer();
  }

  aboutToDisappear(): void {
    this.stopTimer();
  }

  /**
   * 开始计时
   */
  startTimer(): void {
    if (this.timerRunning) {
      return;
    }
    this.timerRunning = true;
    this.timerId = setInterval(() => {
      this.elapsedSeconds++;
      if (this.onTimerUpdate) {
        this.onTimerUpdate(this.elapsedSeconds);
      }
    }, 1000);
  }

  /**
   * 停止计时
   */
  stopTimer(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
    this.timerRunning = false;
  }

  /**
   * 重置计时器
   */
  resetTimer(): void {
    this.stopTimer();
    this.elapsedSeconds = 0;
  }

  /**
   * 获取格式化的时间字符串 (分:秒)
   */
  private getFormattedTime(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 获取进度百分比
   */
  private getProgressRatio(): number {
    if (this.totalQuestions <= 0) return 0;
    return this.currentIndex / this.totalQuestions;
  }

  build() {
    Column() {
      // 顶部信息栏
      Row() {
        // 进度文本
        Text(`${this.currentIndex}/${this.totalQuestions}`)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)

        Blank()

        // 计时器
        Row() {
          Text('⏱')
            .fontSize(14)
          Text(this.getFormattedTime())
            .fontSize(14)
            .fontColor(Color.White)
            .margin({ left: 4 })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 8, bottom: 8 })

      // 进度条背景
      Stack() {
        // 灰色底条
        Rect()
          .width('100%')
          .height(4)
          .backgroundColor(Color.fromARGB(77, 255, 255, 255))
          .borderRadius(2)

        // 渐变填充条
        Rect()
          .width(`${this.getProgressRatio() * 100}%`)
          .height(4)
          .borderRadius(2)
          .linearGradient({
            angle: 0,
            colors: [
              Color.fromARGB(255, 255, 162, 71), // 橙色
              Color.fromARGB(255, 255, 59, 48) // 红色
            ]
          })
      }
      .width('100%')
      .height(4)
      .margin({ left: 16, right: 16, bottom: 8 })
    }
    .width('100%')
  }
}
