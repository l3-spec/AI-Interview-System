/**
 * DigitalInterviewScreen.ets - 数字人面试主屏
 * 参考 Android DigitalInterviewScreen.kt 实现
 */

import promptAction from '@ohos.promptAction';
import { InterviewService } from '../../services/InterviewService';
import { showToast } from '../../utils/Toast';
import { RecordButton } from '../../components/interview/RecordButton';
import { DigitalHumanView } from '../../components/interview/DigitalHumanView';
import { InterviewProgressBar } from '../../components/interview/InterviewProgressBar';

// 面试状态枚举
enum InterviewState {
  PREPARING = 'PREPARING',
  QUESTION_SHOWN = 'QUESTION_SHOWN',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  NEXT = 'NEXT'
}

// 模拟问题数据
interface MockQuestion {
  id: string;
  index: number;
  text: string;
  audioUrl: string;
  tips: string;
}

const mockQuestions: MockQuestion[] = [
  { id: 'q1', index: 1, text: '请做一个简短的自我介绍', audioUrl: '', tips: '控制在2分钟内' },
  { id: 'q2', index: 2, text: '你为什么对这个岗位感兴趣？', audioUrl: '', tips: '结合岗位要求回答' },
  { id: 'q3', index: 3, text: '请描述一次你解决困难问题的经历', audioUrl: '', tips: '使用STAR法则' },
  { id: 'q4', index: 4, text: '你的职业规划是什么？', audioUrl: '', tips: '体现长期发展思维' },
  { id: 'q5', index: 5, text: '你有什么问题想问面试官吗？', audioUrl: '', tips: '体现求职诚意' }
];

export interface DigitalInterviewScreenProps {
  sessionId: string;
  jobPosition: string;
  onComplete: (reportId: string) => void;
  onExit: () => void;
}

@Component
export struct DigitalInterviewScreen {
  @State private state: InterviewState = InterviewState.PREPARING;
  @State private currentQuestionIndex: number = 0;
  @State private totalQuestions: number = 5;
  @State private questionText: string = '';
  @State private questionTips: string = '';
  @State private isRecording: boolean = false;
  @State private recordingDuration: number = 0;
  @State private isDigitalHumanSpeaking: boolean = false;
  @State private currentTipText: string = '即将开始，请做好准备';
  @State private answersSubmitted: number = 0;

  private props: DigitalInterviewScreenProps = {} as DigitalInterviewScreenProps;
  private interviewService: InterviewService = new InterviewService();
  private recordingTimer: number = -1;

  aboutToDisappear(): void {
    if (this.recordingTimer !== -1) {
      clearInterval(this.recordingTimer);
    }
  }

  build() {
    Stack() {
      // 背景：深色渐变
      Column() {
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 16, 18, 27))
      }
      .width('100%')
      .height('100%')

      // 数字人区域（中部）
      Column() {
        // 数字人视图
        DigitalHumanView({
          isSpeaking: this.isDigitalHumanSpeaking
        })
          .width(220)
          .height(300)
          .margin({ top: 40 })

        // 当前提示文字
        Text(this.currentTipText)
          .fontSize(14)
          .fontColor(Color.fromARGB(255, 160, 160, 160))
          .margin({ top: 20 })
      }
      .width('100%')
      .height('55%')

      // 底部内容区（白色圆角面板）
      Column() {
        // 顶部圆角手柄
        Column()
          .width(36)
          .height(4)
          .backgroundColor(Color.fromARGB(255, 200, 200, 200))
          .borderRadius(2)
          .margin({ top: 10 })

        // 进度条
        InterviewProgressBar({
          currentIndex: this.currentQuestionIndex + 1,
          total: this.totalQuestions,
          durationSeconds: this.recordingDuration
        })
          .margin({ top: 20 })

        // 问题文字
        Column() {
          Text(this.questionText || '即将开始面试')
            .fontSize(22)
            .fontWeight(FontWeight.Medium)
            .fontColor(Color.fromARGB(255, 26, 26, 26))
            .textAlign(TextAlign.Center)
            .width('100%')
        }
        .width('100%')
        .padding({ left: 24, right: 24, top: 24 })

        // 问题提示
        if (this.questionTips) {
          Text('💡 ' + this.questionTips)
            .fontSize(13)
            .fontColor(Color.fromARGB(255, 102, 126, 234))
            .padding({ left: 24, right: 24, top: 8 })
        }
        .width('100%')

        Blank()

        // 底部操作区
        Row() {
          // 跳过按钮
          Button('跳过')
            .fontSize(14)
            .fontColor(Color.fromARGB(255, 102, 126, 234))
            .backgroundColor(TransparentColor)
            .onClick(() => {
              this.handleSkip();
            })

          Blank()

          // 录制按钮
          RecordButton({
            isRecording: this.isRecording,
            onClick: () => {
              this.handleRecordClick();
            }
          })
            .width(80)
            .height(80)

          Blank()

          // 下一题
          Button('下一题')
            .fontSize(14)
            .fontColor(Color.fromARGB(255, 102, 126, 234))
            .backgroundColor(TransparentColor)
            .onClick(() => {
              this.handleNext();
            })
        }
        .width('100%')
        .padding({ left: 40, right: 40, bottom: 40 })
      }
      .width('100%')
      .height('50%')
      .backgroundColor(Color.White)
      .borderRadius({ topLeft: 24, topRight: 24 })

      // 顶部导航栏
      this.buildTopBar()
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  buildTopBar() {
    Row() {
      // 返回按钮
      Column() {
        Image($r('sys.media.ohos_ic_public_arrow_left'))
          .width(24)
          .height(24)
          .fillColor(Color.White)
      }
      .width(44)
      .height(44)
      .justifyContent(FlexAlign.Center)
      .onClick(() => {
        this.handleExit();
      })

      // 进度文字
      Text(`${this.currentQuestionIndex + 1} / ${this.totalQuestions}`)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor(Color.White)

      // 更多按钮
      Column() {
        Image($r('sys.media.ohos_ic_public_more'))
          .width(24)
          .height(24)
          .fillColor(Color.White)
      }
      .width(44)
      .height(44)
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .height(56)
    .padding({ left: 8, right: 8 })
    .position({ y: 0 })
  }

  aboutToAppear(): void {
    // 自动开始第一题
    setTimeout(() => {
      this.showNextQuestion();
    }, 2000);
  }

  private async showNextQuestion(): Promise<void> {
    if (this.currentQuestionIndex >= mockQuestions.length) {
      this.handleComplete();
      return;
    }

    const q = mockQuestions[this.currentQuestionIndex];
    this.state = InterviewState.QUESTION_SHOWN;
    this.questionText = q.text;
    this.questionTips = q.tips;
    this.currentTipText = '请认真思考后回答';

    // 模拟数字人读题动画
    this.isDigitalHumanSpeaking = true;
    setTimeout(() => {
      this.isDigitalHumanSpeaking = false;
      this.state = InterviewState.QUESTION_SHOWN;
      this.currentTipText = '点击下方按钮开始回答';
    }, 2000);
  }

  private handleRecordClick(): void {
    if (this.state === InterviewState.QUESTION_SHOWN) {
      this.startRecording();
    } else if (this.state === InterviewState.RECORDING) {
      this.stopRecording();
    }
  }

  private startRecording(): void {
    this.state = InterviewState.RECORDING;
    this.isRecording = true;
    this.isDigitalHumanSpeaking = false;
    this.currentTipText = '录音中...';
    this.recordingDuration = 0;
    this.recordingTimer = setInterval(() => {
      this.recordingDuration++;
    }, 1000) as unknown as number;
  }

  private async stopRecording(): Promise<void> {
    if (this.recordingTimer !== -1) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = -1;
    }
    this.isRecording = false;
    this.state = InterviewState.PROCESSING;
    this.currentTipText = '分析回答中...';

    // 模拟分析
    setTimeout(() => {
      this.answersSubmitted++;
      this.handleNext();
    }, 2000);
  }

  private handleSkip(): void {
    if (this.state === InterviewState.RECORDING) {
      this.stopRecording();
    } else {
      this.handleNext();
    }
  }

  private handleNext(): void {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= mockQuestions.length) {
      this.handleComplete();
    } else {
      this.showNextQuestion();
    }
  }

  private async handleComplete(): Promise<void> {
    this.state = InterviewState.PROCESSING;
    this.currentTipText = '生成面试报告中...';

    setTimeout(() => {
      this.props.onComplete('report_xxx');
    }, 2000);
  }

  private handleExit(): void {
    promptAction.showToast({ message: '面试已退出', duration: 2000 });
    this.props.onExit?.();
  }
}
