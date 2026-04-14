/**
 * 录制按钮组件
 * 支持三种状态：待录制、录制中、已完成
 */

@Component
export default struct RecordButton {
  @State private var buttonState: 'idle' | 'recording' | 'completed' = 'idle';
  @State private var pulseScale: number = 1.0;
  @State private var isPulsing: boolean = false;

  private pulseTimer: number = -1;

  // 状态枚举
  static readonly STATE_IDLE: 'idle' = 'idle';
  static readonly STATE_RECORDING: 'recording' = 'recording';
  static readonly STATE_COMPLETED: 'completed' = 'completed';

  // 公开方法
  setIdle(): void {
    this.buttonState = 'idle';
    this.stopPulse();
  }

  setRecording(): void {
    this.buttonState = 'recording';
    this.startPulse();
  }

  setCompleted(): void {
    this.buttonState = 'completed';
    this.stopPulse();
  }

  getState(): 'idle' | 'recording' | 'completed' {
    return this.buttonState;
  }

  private startPulse(): void {
    if (this.pulseTimer !== -1) {
      return;
    }
    this.isPulsing = true;
    this.pulseTimer = setInterval(() => {
      animateTo({
        duration: 500,
        curve: Curve.EaseInOut
      }, () => {
        this.pulseScale = this.pulseScale > 1.0 ? 1.0 : 1.15;
      });
    }, 500);
  }

  private stopPulse(): void {
    if (this.pulseTimer !== -1) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = -1;
    }
    this.isPulsing = false;
    this.pulseScale = 1.0;
  }

  aboutToDisappear(): void {
    this.stopPulse();
  }

  build() {
    Column({ horizontalAlignment: HorizontalAlign.Center }) {
      // 脉冲动画层
      if (this.buttonState === 'recording') {
        Circle() {
          Text('')
            .width(80)
            .height(80)
        }
        .width(100)
        .height(100)
        .backgroundColor(Color.fromARGB(77, 255, 0, 0))
        .borderRadius(50)
        .scale({ x: this.pulseScale, y: this.pulseScale })
        .margin({ bottom: -90 })
      }

      // 主按钮
      Circle() {
        Column() {
          if (this.buttonState === 'idle') {
            Text('🎤')
              .fontSize(28)
            Text('开始')
              .fontSize(12)
              .fontColor(Color.White)
              .margin({ top: 4 })
          } else if (this.buttonState === 'recording') {
            Text('⏹')
              .fontSize(28)
            Text('停止')
              .fontSize(12)
              .fontColor(Color.White)
              .margin({ top: 4 })
          } else {
            Text('✓')
              .fontSize(32)
              .fontColor(Color.White)
          }
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      }
      .width(80)
      .height(80)
      .backgroundColor(this.getButtonColor())
      .borderRadius(40)
      .onClick(() => this.onButtonClick())

      // 状态文字
      Text(this.getStateText())
        .fontSize(12)
        .fontColor(this.getStateTextColor())
        .margin({ top: 12 })
    }
  }

  private getButtonColor(): Color {
    switch (this.buttonState) {
      case 'idle':
        return Color.fromARGB(255, 255, 59, 48); // 红色
      case 'recording':
        return Color.fromARGB(255, 255, 59, 48); // 红色
      case 'completed':
        return Color.fromARGB(255, 52, 199, 89); // 绿色
      default:
        return Color.fromARGB(255, 255, 59, 48);
    }
  }

  private getStateText(): string {
    switch (this.buttonState) {
      case 'idle':
        return '点击开始录制';
      case 'recording':
        return '录制中...';
      case 'completed':
        return '录制完成';
      default:
        return '点击开始录制';
    }
  }

  private getStateTextColor(): Color {
    switch (this.buttonState) {
      case 'idle':
        return Color.fromARGB(180, 100, 100, 100);
      case 'recording':
        return Color.fromARGB(255, 255, 59, 48);
      case 'completed':
        return Color.fromARGB(255, 52, 199, 89);
      default:
        return Color.fromARGB(180, 100, 100, 100);
    }
  }

  private onButtonClick(): void {
    if (this.buttonState === 'idle') {
      this.setRecording();
    } else if (this.buttonState === 'recording') {
      this.setCompleted();
      // 延迟后重置为待录制状态
      setTimeout(() => {
        this.setIdle();
      }, 2000);
    }
  }
}
