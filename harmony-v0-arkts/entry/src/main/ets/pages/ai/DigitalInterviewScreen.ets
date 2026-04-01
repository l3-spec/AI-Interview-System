/**
 * 数字人面试主屏
 * 核心AI面试流程页面
 */

// 面试状态枚举
enum InterviewState {
  PREPARING = 'PREPARING',
  QUESTION_SHOWN = 'QUESTION_SHOWN',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  NEXT = 'NEXT'
}

// 示例面试问题
const INTERVIEW_QUESTIONS: string[] = [
  '请简单介绍一下你自己，以及你为什么对这个岗位感兴趣？',
  '请描述一下你过去项目中遇到的最大挑战，以及你是如何解决的？',
  '你在团队合作中通常扮演什么角色？请举例说明。',
  '请分享一个你主动学习新技能或知识的经历。',
  '你对这个行业的未来发展有什么看法？',
  '如果给你一个新项目，你会如何规划和执行？',
  '请描述一次你与同事产生分歧的经历，你是如何处理的？',
  '你对自己的职业发展有什么规划？'
];

interface DigitalInterviewScreenProps {
  positionId: string;
  positionName: string;
  onBack: () => void;
  onComplete: (sessionId: string) => void;
  onSkip: () => void = () => {};
}

@Component
export default struct DigitalInterviewScreen {
  props: DigitalInterviewScreenProps = {
    positionId: '',
    positionName: '',
    onBack: () => {},
    onComplete: () => {},
    onSkip: () => {}
  };

  @State private interviewState: InterviewState = InterviewState.PREPARING;
  @State private currentQuestionIndex: number = 0;
  @State private totalQuestions: number = INTERVIEW_QUESTIONS.length;
  @State private questionText: string = '';
  @State private questionSubtitle: string = '';
  @State private statusText: string = '准备中...';
  @State private isRecording: boolean = false;
  @State private isDigitalHumanSpeaking: boolean = false;
  @State private elapsedSeconds: number = 0;
  @State private recordingDuration: number = 0;
  @State private showProcessing: boolean = false;
  @State private mouthScale: number = 1.0;

  private timerId: number = -1;
  private mouthAnimTimer: number = -1;
  private sessionId: string = '';

  aboutToAppear(): void {
    this.sessionId = this.generateSessionId();
    this.startTimer();
    this.startMouthAnimation();
    // 模拟加载问题
    setTimeout(() => {
      this.showFirstQuestion();
    }, 2000);
  }

  aboutToDisappear(): void {
    this.stopTimer();
    this.stopMouthAnimation();
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private startTimer(): void {
    if (this.timerId !== -1) return;
    this.timerId = setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
  }

  private startMouthAnimation(): void {
    if (this.mouthAnimTimer !== -1) return;
    this.mouthAnimTimer = setInterval(() => {
      if (this.isDigitalHumanSpeaking) {
        animateTo({
          duration: 150,
          curve: Curve.EaseInOut
        }, () => {
          this.mouthScale = this.mouthScale > 1.0 ? 0.7 : 1.3;
        });
      }
    }, 300);
  }

  private stopMouthAnimation(): void {
    if (this.mouthAnimTimer !== -1) {
      clearInterval(this.mouthAnimTimer);
      this.mouthAnimTimer = -1;
    }
    this.mouthScale = 1.0;
  }

  private showFirstQuestion(): void {
    this.currentQuestionIndex = 0;
    this.interviewState = InterviewState.QUESTION_SHOWN;
    this.updateQuestionDisplay();
  }

  private updateQuestionDisplay(): void {
    this.questionText = INTERVIEW_QUESTIONS[this.currentQuestionIndex];
    this.questionSubtitle = `问题 ${this.currentQuestionIndex + 1} / ${this.totalQuestions}`;
    this.isDigitalHumanSpeaking = true;

    // 数字人说话3秒后停止
    setTimeout(() => {
      this.isDigitalHumanSpeaking = false;
      this.statusText = '请回答';
      this.interviewState = InterviewState.QUESTION_SHOWN;
    }, 3000);
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private onRecordClick(): void {
    if (this.interviewState === InterviewState.QUESTION_SHOWN) {
      this.startRecording();
    } else if (this.interviewState === InterviewState.RECORDING) {
      this.stopRecording();
    }
  }

  private startRecording(): void {
    this.interviewState = InterviewState.RECORDING;
    this.isRecording = true;
    this.statusText = '录制中...';
    this.recordingDuration = 0;

    // 开始录制计时
    setInterval(() => {
      this.recordingDuration++;
    }, 1000);
  }

  private stopRecording(): void {
    this.isRecording = false;
    this.interviewState = InterviewState.PROCESSING;
    this.statusText = '分析回答中...';
    this.showProcessing = true;

    // 模拟处理
    setTimeout(() => {
      this.showProcessing = false;
      this.goToNext();
    }, 2000);
  }

  private goToNext(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.currentQuestionIndex++;
      this.interviewState = InterviewState.NEXT;
      this.statusText = '下一题准备中...';

      // 模拟进入下一题
      setTimeout(() => {
        this.interviewState = InterviewState.QUESTION_SHOWN;
        this.updateQuestionDisplay();
      }, 1500);
    } else {
      // 面试完成
      this.interviewState = InterviewState.PROCESSING;
      this.statusText = '生成报告中...';

      setTimeout(() => {
        this.props.onComplete?.(this.sessionId);
      }, 2000);
    }
  }

  private onSkip(): void {
    if (this.currentQuestionIndex < this.totalQuestions - 1) {
      this.goToNext();
    } else {
      this.props.onComplete?.(this.sessionId);
    }
  }

  build() {
    Stack() {
      // 全屏深色渐变背景
      Column() {
        // 顶部到下的渐变
        Column() {
          // 背景会在下面被填充
        }
        .width('100%')
        .height('100%')
        .backgroundColor(this.getBackgroundColor())
      }
      .width('100%')
      .height('100%')

      // 内容层
      Column() {
        // 顶部栏
        this.buildTopBar()

        // 数字人区域
        this.buildDigitalHumanArea()

        // 底部问题区域
        this.buildQuestionArea()
      }
      .width('100%')
      .height('100%')

      // 处理中遮罩
      if (this.showProcessing) {
        this.buildProcessingOverlay()
      }
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  private buildTopBar() {
    Row() {
      // 返回按钮
      Button('←', { type: ButtonType.Circle })
        .fontSize(18)
        .fontColor(Color.White)
        .width(40)
        .height(40)
        .backgroundColor(Color.fromARGB(77, 255, 255, 255))
        .onClick(() => this.props.onBack?.())

      Blank()

      // 进度显示
      Column() {
        Text(`${this.currentQuestionIndex + 1}/${this.totalQuestions}`)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)

        // 小进度条
        Row() {
          Rect()
            .width(`${((this.currentQuestionIndex + 1) / this.totalQuestions) * 100}%`)
            .height(2)
            .backgroundColor(Color.fromARGB(255, 255, 162, 71))
            .borderRadius(1)
        }
        .width(60)
        .height(2)
        .backgroundColor(Color.fromARGB(77, 255, 255, 255))
        .borderRadius(1)
      }

      Blank()

      // 更多按钮
      Button('⋮', { type: ButtonType.Circle })
        .fontSize(18)
        .fontColor(Color.White)
        .width(40)
        .height(40)
        .backgroundColor(Color.fromARGB(77, 255, 255, 255))
        .onClick(() => {
          // 显示菜单
        })
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 16, bottom: 12 })
    .alignItems(VerticalAlign.Center)
  }

  @Builder
  private buildDigitalHumanArea() {
    Column() {
      // 计时器
      Row() {
        Text('⏱')
          .fontSize(14)
          .fontColor(Color.fromARGB(180, 255, 255, 255))
        Text(this.formatTime(this.elapsedSeconds))
          .fontSize(14)
          .fontColor(Color.fromARGB(180, 255, 255, 255))
          .margin({ left: 4 })
      }
      .margin({ bottom: 20 })

      // 数字人占位区域
      Stack({ alignContent: Alignment.Center }) {
        // 外圈光晕
        Circle() {
          Column() {
            // 数字人头部
            Column() {
              // 眼睛
              Row() {
                Circle() {
                  Text('●')
                    .fontSize(20)
                    .fontColor(Color.fromARGB(255, 50, 50, 50))
                }
                .width(20)
                .height(20)

                Text('  ')
                  .fontSize(12)

                Circle() {
                  Text('●')
                    .fontSize(20)
                    .fontColor(Color.fromARGB(255, 50, 50, 50))
                }
                .width(20)
                .height(20)
              }

              // 嘴巴
              Text('◡')
                .fontSize(24)
                .fontColor(Color.fromARGB(255, 200, 100, 100))
                .margin({ top: 8 })
            }
            .scale({ x: this.mouthScale, y: this.mouthScale })
          }
        }
        .width(200)
        .height(200)
        .backgroundColor(Color.fromARGB(255, 200, 230, 250))
        .border({
          width: 3,
          color: Color.fromARGB(128, 0, 173, 195)
        })
        .borderRadius(100)
      }
      .width('100%')
      .height(220)

      // 数字人状态文字
      Text(this.isDigitalHumanSpeaking ? '🤖 数字人播报中...' : '🤖 等待回答')
        .fontSize(12)
        .fontColor(this.isDigitalHumanSpeaking ?
          Color.fromARGB(255, 255, 162, 71) : Color.fromARGB(150, 200, 200, 200))
        .margin({ top: 12 })
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
    .layoutWeight(1)
  }

  @Builder
  private buildQuestionArea() {
    Column() {
      // 问题文字
      if (this.interviewState !== InterviewState.PREPARING &&
          this.interviewState !== InterviewState.PROCESSING) {
        Text(this.questionText)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor(Color.White)
          .textAlign(TextAlign.Center)
          .padding({ left: 24, right: 24 })

        // 问题副标题
        Text(this.questionSubtitle)
          .fontSize(12)
          .fontColor(Color.fromARGB(150, 200, 200, 200))
          .margin({ top: 8 })
      }

      // 状态指示
      Text(this.statusText)
        .fontSize(14)
        .fontColor(this.getStatusColor())
        .margin({ top: 16 })

      // 录制按钮
      this.buildRecordButton()

      // 跳过按钮
      Button('跳过此题 →')
        .fontSize(13)
        .fontColor(Color.fromARGB(180, 200, 200, 200))
        .backgroundColor(Color.Transparent)
        .margin({ top: 12, bottom: 32 })
        .onClick(() => this.onSkip())
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
    .padding({ bottom: 24 })
  }

  @Builder
  private buildRecordButton() {
    Column() {
      // 录制按钮大圆
      Circle() {
        Column() {
          if (this.isRecording) {
            Text('⏹')
              .fontSize(32)
              .fontColor(Color.White)
          } else {
            Text('🎤')
              .fontSize(28)
              .fontColor(Color.White)
          }
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      }
      .width(70)
      .height(70)
      .backgroundColor(this.isRecording ?
        Color.fromARGB(255, 255, 59, 48) : Color.fromARGB(255, 0, 173, 195))
      .borderRadius(35)
      .onClick(() => this.onRecordClick())

      // 录制状态文字
      Text(this.isRecording ? '点击停止' : '点击开始')
        .fontSize(12)
        .fontColor(Color.fromARGB(150, 200, 200, 200))
        .margin({ top: 8 })
    }
    .margin({ top: 20 })
  }

  @Builder
  private buildProcessingOverlay() {
    Column() {
      // 半透明背景
      Column() {
        Column() {
          Text('⏳')
            .fontSize(48)
            .margin({ bottom: 16 })

          Text('正在分析您的回答...')
            .fontSize(16)
            .fontColor(Color.White)

          Text('请稍候')
            .fontSize(14)
            .fontColor(Color.fromARGB(180, 200, 200, 200))
            .margin({ top: 8 })
        }
        .padding(40)
        .backgroundColor(Color.fromARGB(200, 50, 50, 50))
        .borderRadius(20)
      }
      .width('100%')
      .height('100%')
      .backgroundColor(Color.fromARGB(128, 0, 0, 0))
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
  }

  private getBackgroundColor(): Color {
    switch (this.interviewState) {
      case InterviewState.PREPARING:
        return Color.fromARGB(255, 30, 40, 60);
      case InterviewState.QUESTION_SHOWN:
        return Color.fromARGB(255, 25, 35, 55);
      case InterviewState.RECORDING:
        return Color.fromARGB(255, 50, 30, 30);
      case InterviewState.PROCESSING:
        return Color.fromARGB(255, 40, 40, 50);
      case InterviewState.NEXT:
        return Color.fromARGB(255, 25, 35, 55);
      default:
        return Color.fromARGB(255, 30, 40, 60);
    }
  }

  private getStatusColor(): Color {
    switch (this.interviewState) {
      case InterviewState.PREPARING:
        return Color.fromARGB(150, 200, 200, 200);
      case InterviewState.QUESTION_SHOWN:
        return Color.fromARGB(255, 0, 173, 195);
      case InterviewState.RECORDING:
        return Color.fromARGB(255, 255, 59, 48);
      case InterviewState.PROCESSING:
        return Color.fromARGB(255, 255, 162, 71);
      case InterviewState.NEXT:
        return Color.fromARGB(150, 200, 200, 200);
      default:
        return Color.fromARGB(150, 200, 200, 200);
    }
  }
}
