/**
 * 评估页面组
 * 包含：评估首页、答题页面、评估结果页面
 */

// ==================== 数据模型 ====================

interface AssessmentCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  questionCount: number;
}

interface AssessmentQuestion {
  id: string;
  title: string;
  type: 'single' | 'multiple';
  options: AssessmentOption[];
}

interface AssessmentOption {
  id: string;
  text: string;
  score: number;
}

interface AssessmentResult {
  totalScore: number;
  maxScore: number;
  dimensions: AssessmentDimension[];
  suggestion: string;
}

interface AssessmentDimension {
  name: string;
  score: number;
  maxScore: number;
  level: string; // 'excellent' | 'good' | 'fair' | 'poor'
}

// 示例数据
const ASSESSMENT_CATEGORIES: AssessmentCategory[] = [
  {
    id: 'interview',
    title: '面试题练习',
    description: '常见面试问题练习与评分',
    icon: '💬',
    questionCount: 20
  },
  {
    id: 'quality',
    title: '职场素质测评',
    description: '职业素养与综合能力评估',
    icon: '📊',
    questionCount: 30
  },
  {
    id: 'resume',
    title: '简历优化',
    description: '简历完整度与竞争力分析',
    icon: '📝',
    questionCount: 15
  },
  {
    id: 'career',
    title: '职业规划',
    description: '职业发展方向与路径规划',
    icon: '🎯',
    questionCount: 25
  }
];

const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'q1',
    title: '你在团队合作中通常扮演什么角色？',
    type: 'single',
    options: [
      { id: 'a', text: '领导者，统筹协调团队工作', score: 4 },
      { id: 'b', text: '核心贡献者，主动承担重要任务', score: 3 },
      { id: 'c', text: '支持者，积极配合团队成员', score: 2 },
      { id: 'd', text: '独立工作者，偏好独自完成任务', score: 1 }
    ]
  },
  {
    id: 'q2',
    title: '面对压力时，你通常如何应对？',
    type: 'single',
    options: [
      { id: 'a', text: '制定详细计划，分解任务逐步解决', score: 4 },
      { id: 'b', text: '向他人寻求建议和支持', score: 3 },
      { id: 'c', text: '暂时放松，调整心态后再处理', score: 2 },
      { id: 'd', text: '回避问题，希望问题自行消失', score: 1 }
    ]
  },
  {
    id: 'q3',
    title: '你认为自己的优势有哪些？（可多选）',
    type: 'multiple',
    options: [
      { id: 'a', text: '学习能力强，快速掌握新技能', score: 3 },
      { id: 'b', text: '沟通表达能力出色', score: 3 },
      { id: 'c', text: '逻辑思维清晰，问题分析能力强', score: 3 },
      { id: 'd', text: '执行能力强，做事高效', score: 3 },
      { id: 'e', text: '创新能力突出，善于发现问题', score: 3 }
    ]
  },
  {
    id: 'q4',
    title: '你如何处理工作中的不确定性？',
    type: 'single',
    options: [
      { id: 'a', text: '收集信息，分析各种可能性', score: 4 },
      { id: 'b', text: '请教有经验的同事或上级', score: 3 },
      { id: 'c', text: '凭直觉做出判断', score: 2 },
      { id: 'd', text: '等待更多信息再做决定', score: 1 }
    ]
  },
  {
    id: 'q5',
    title: '你通常如何规划自己的职业发展？',
    type: 'single',
    options: [
      { id: 'a', text: '有清晰的长期职业规划', score: 4 },
      { id: 'b', text: '有短期目标，逐步推进', score: 3 },
      { id: 'c', text: '随遇而安，不做太多规划', score: 2 },
      { id: 'd', text: '不确定，不清楚方向', score: 1 }
    ]
  }
];

const SAMPLE_RESULT: AssessmentResult = {
  totalScore: 78,
  maxScore: 100,
  dimensions: [
    { name: '团队协作', score: 85, maxScore: 100, level: 'excellent' },
    { name: '抗压能力', score: 72, maxScore: 100, level: 'good' },
    { name: '学习能力', score: 90, maxScore: 100, level: 'excellent' },
    { name: '沟通表达', score: 65, maxScore: 100, level: 'fair' },
    { name: '职业规划', score: 80, maxScore: 100, level: 'good' }
  ],
  suggestion: '您的综合素养表现良好，尤其在学习能力和团队协作方面表现突出。建议继续加强沟通表达能力，制定更明确的职业发展规划。'
};

// ==================== Props 接口 ====================

interface AssessmentHomeScreenProps {
  onBack: () => void;
  onCategorySelected: (categoryId: string) => void;
}

interface AssessmentQuestionScreenProps {
  categoryId: string;
  categoryTitle: string;
  onBack: () => void;
  onComplete: (answers: Map<string, string[]>) => void;
}

interface AssessmentResultScreenProps {
  result: AssessmentResult;
  onBack: () => void;
  onRetry: () => void;
}

// ==================== 评估首页 ====================

@Component
export default struct AssessmentHomeScreen {
  props: AssessmentHomeScreenProps = {
    onBack: () => {},
    onCategorySelected: () => {}
  };

  build() {
    Column() {
      // 顶部标题栏
      Column() {
        Row() {
          Button('←', { type: ButtonType.Capsule })
            .fontSize(16)
            .fontColor(Color.White)
            .width(36)
            .height(36)
            .backgroundColor(Color.fromARGB(50, 255, 255, 255))
            .onClick(() => this.props.onBack?.())

          Blank()

          Text('能力评估')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)

          Blank()
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 16 })
      }
      .width('100%')
      .backgroundColor(Color.fromARGB(255, 0, 173, 195))

      // 评估类型卡片列表
      List() {
        ForEach(ASSESSMENT_CATEGORIES, (category: AssessmentCategory) => {
          ListItem() {
            this.buildCategoryCard(category)
          }
        });
      }
      .listDirection(Axis.Vertical)
      .edgeEffect(EdgeEffect.Spring)
      .width('100%')
      .layoutWeight(1)
      .padding({ left: 16, right: 16, top: 16 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.fromARGB(255, 246, 248, 252))
  }

  @Builder
  private buildCategoryCard(category: AssessmentCategory) {
    Column() {
      Row() {
        // 图标
        Column() {
          Text(category.icon)
            .fontSize(32)
        }
        .width(60)
        .height(60)
        .backgroundColor(Color.fromARGB(255, 223, 251, 255))
        .borderRadius(12)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)

        // 标题和描述
        Column() {
          Text(category.title)
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(Color.fromARGB(200, 50, 50, 50))

          Text(category.description)
            .fontSize(12)
            .fontColor(Color.fromARGB(150, 120, 120, 120))
            .margin({ top: 4 })

          Text(`${category.questionCount}道题`)
            .fontSize(11)
            .fontColor(Color.fromARGB(180, 0, 173, 195))
            .margin({ top: 4 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
        .margin({ left: 12 })

        // 开始按钮
        Button('开始')
          .fontSize(13)
          .fontColor(Color.White)
          .backgroundColor(Color.fromARGB(255, 0, 173, 195))
          .borderRadius(16)
          .height(32)
          .onClick(() => this.props.onCategorySelected?.(category.id))
      }
      .width('100%')
      .padding(16)
    }
    .width('100%')
    .backgroundColor(Color.White)
    .borderRadius(16)
    .shadow({
      radius: 8,
      color: Color.fromARGB(25, 0, 0, 0),
      offsetY: 2
    })
    .margin({ bottom: 12 })
  }
}

// ==================== 答题页面 ====================

@Component
export struct AssessmentQuestionScreen {
  props: AssessmentQuestionScreenProps = {
    categoryId: '',
    categoryTitle: '',
    onBack: () => {},
    onComplete: () => {}
  };

  @State private currentIndex: number = 0;
  @State private answers: Map<string, string[]> = new Map();
  @State private questions: AssessmentQuestion[] = SAMPLE_QUESTIONS;
  @State private selectedOptions: Set<string> = new Set();
  @State private showConfirmDialog: boolean = false;

  private get currentQuestion(): AssessmentQuestion {
    return this.questions[this.currentIndex];
  }

  private get progress(): number {
    return (this.currentIndex + 1) / this.questions.length;
  }

  aboutToAppear(): void {
    this.answers = new Map();
    this.selectedOptions = new Set();
  }

  private onOptionSelected(optionId: string): void {
    if (this.currentQuestion.type === 'single') {
      this.selectedOptions = new Set([optionId]);
    } else {
      // 多选题
      if (this.selectedOptions.has(optionId)) {
        this.selectedOptions.delete(optionId);
      } else {
        this.selectedOptions.add(optionId);
      }
      this.selectedOptions = new Set(this.selectedOptions);
    }
  }

  private isOptionSelected(optionId: string): boolean {
    return this.selectedOptions.has(optionId);
  }

  private goToPrevious(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadCurrentAnswer();
    }
  }

  private goToNext(): void {
    // 保存当前答案
    if (this.selectedOptions.size > 0) {
      const answerList: string[] = [];
      this.selectedOptions.forEach((id: string) => answerList.push(id));
      this.answers.set(this.currentQuestion.id, answerList);
    }

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.loadCurrentAnswer();
    } else {
      // 显示确认对话框
      this.showConfirmDialog = true;
    }
  }

  private loadCurrentAnswer(): void {
    const savedAnswer = this.answers.get(this.currentQuestion.id);
    if (savedAnswer) {
      this.selectedOptions = new Set(savedAnswer);
    } else {
      this.selectedOptions = new Set();
    }
  }

  private submitAnswers(): void {
    // 保存最后一题答案
    if (this.selectedOptions.size > 0) {
      const answerList: string[] = [];
      this.selectedOptions.forEach((id: string) => answerList.push(id));
      this.answers.set(this.currentQuestion.id, answerList);
    }
    this.showConfirmDialog = false;
    this.props.onComplete?.(this.answers);
  }

  build() {
    Column() {
      // 顶部进度条
      this.buildProgressBar()

      // 问题内容
      Column() {
        // 题目标题
        Column() {
          Text(`题目 ${this.currentIndex + 1}`)
            .fontSize(14)
            .fontColor(Color.fromARGB(150, 120, 120, 120))

          Text(this.currentQuestion.title)
            .fontSize(17)
            .fontWeight(FontWeight.Medium)
            .fontColor(Color.fromARGB(200, 50, 50, 50))
            .margin({ top: 8 })

          Text(this.currentQuestion.type === 'single' ? '（单选）' : '（多选）')
            .fontSize(12)
            .fontColor(Color.fromARGB(180, 0, 173, 195))
            .margin({ top: 4 })
        }
        .width('100%')
        .padding({ left: 20, right: 20, top: 20 })

        // 选项列表
        Column() {
          ForEach(this.currentQuestion.options, (option: AssessmentOption) => {
            this.buildOptionItem(option);
          });
        }
        .padding({ left: 16, right: 16, top: 16 })
      }
      .layoutWeight(1)

      // 底部按钮
      this.buildBottomButtons()

      // 确认对话框
      if (this.showConfirmDialog) {
        this.buildConfirmDialog()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.fromARGB(255, 246, 248, 252))
  }

  @Builder
  private buildProgressBar() {
    Column() {
      Row() {
        Button('×', { type: ButtonType.Circle })
          .fontSize(18)
          .fontColor(Color.White)
          .width(36)
          .height(36)
          .backgroundColor(Color.fromARGB(50, 255, 255, 255))
          .onClick(() => this.props.onBack?.())

        Blank()

        Text(`${this.currentIndex + 1}/${this.questions.length}`)
          .fontSize(14)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.White)

        Blank()
      }
      .width('100%')
      .padding({ left: 12, right: 12, top: 12, bottom: 10 })

      // 进度条
      Stack() {
        Rect()
          .width('100%')
          .height(3)
          .backgroundColor(Color.fromARGB(77, 255, 255, 255))
          .borderRadius(1.5)

        Rect()
          .width(`${this.progress * 100}%`)
          .height(3)
          .backgroundColor(Color.White)
          .borderRadius(1.5)
      }
      .width('100%')
      .padding({ left: 12, right: 12 })
    }
    .width('100%')
    .backgroundColor(Color.fromARGB(255, 0, 173, 195))
  }

  @Builder
  private buildOptionItem(option: AssessmentOption) {
    Column() {
      Row() {
        // 选择状态图标
        if (this.currentQuestion.type === 'single') {
          Circle() {
            if (this.isOptionSelected(option.id)) {
              Circle() {
                Text('')
                  .width(12)
                  .height(12)
                  .backgroundColor(Color.White)
                  .borderRadius(6)
              }
              .width(18)
              .height(18)
              .backgroundColor(Color.fromARGB(255, 0, 173, 195))
              .borderRadius(9)
            } else {
              Text('')
                .width(18)
                .height(18)
                .backgroundColor(Color.Transparent)
                .border({
                  width: 2,
                  color: Color.fromARGB(150, 180, 180, 180)
                })
                .borderRadius(9)
            }
          }
          .width(24)
          .height(24)
        } else {
          Circle() {
            if (this.isOptionSelected(option.id)) {
              Text('✓')
                .fontSize(12)
                .fontColor(Color.White)
            } else {
              Text('')
            }
          }
          .width(22)
          .height(22)
          .backgroundColor(this.isOptionSelected(option.id) ?
            Color.fromARGB(255, 0, 173, 195) : Color.Transparent)
          .border({
            width: 2,
            color: this.isOptionSelected(option.id) ?
              Color.fromARGB(255, 0, 173, 195) : Color.fromARGB(150, 180, 180, 180)
          })
          .borderRadius(4)
        }

        Text(option.text)
          .fontSize(15)
          .fontColor(this.isOptionSelected(option.id) ?
            Color.fromARGB(255, 0, 173, 195) : Color.fromARGB(200, 80, 80, 80))
          .margin({ left: 12 })
      }
      .width('100%')
      .padding(16)
    }
    .width('100%')
    .backgroundColor(this.isOptionSelected(option.id) ?
      Color.fromARGB(255, 223, 251, 255) : Color.White)
    .borderRadius(12)
    .border({
      width: this.isOptionSelected(option.id) ? 1.5 : 0,
      color: Color.fromARGB(255, 0, 173, 195)
    })
    .margin({ bottom: 10 })
    .onClick(() => this.onOptionSelected(option.id))
  }

  @Builder
  private buildBottomButtons() {
    Row() {
      // 上一题
      Button('← 上一题')
        .fontSize(14)
        .fontColor(this.currentIndex > 0 ?
          Color.fromARGB(255, 0, 173, 195) : Color.fromARGB(100, 180, 180, 180))
        .backgroundColor(Color.Transparent)
        .enabled(this.currentIndex > 0)
        .onClick(() => this.goToPrevious())

      Blank()

      // 下一题/提交
      Button(this.currentIndex < this.questions.length - 1 ? '下一题 →' : '提交')
        .fontSize(14)
        .fontColor(Color.White)
        .backgroundColor(Color.fromARGB(255, 0, 173, 195))
        .borderRadius(20)
        .height(40)
        .onClick(() => this.goToNext())
    }
    .width('100%')
    .padding({ left: 20, right: 20, bottom: 24 })
  }

  @Builder
  private buildConfirmDialog() {
    Column() {
      Column() {
        Text('提交确认')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))

        Text(`您已完成 ${this.questions.length} 道题，是否确认提交？`)
          .fontSize(14)
          .fontColor(Color.fromARGB(150, 120, 120, 120))
          .margin({ top: 8 })

        Row() {
          Button('取消')
            .fontSize(14)
            .fontColor(Color.fromARGB(150, 120, 120, 120))
            .backgroundColor(Color.Transparent)
            .onClick(() => this.showConfirmDialog = false)

          Blank()

          Button('确认提交')
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor(Color.fromARGB(255, 0, 173, 195))
            .borderRadius(16)
            .onClick(() => this.submitAnswers())
        }
        .margin({ top: 20 })
      }
      .padding(24)
      .backgroundColor(Color.White)
      .borderRadius(16)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.fromARGB(128, 0, 0, 0))
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }
}

// ==================== 评估结果页面 ====================

@Component
export struct AssessmentResultScreen {
  props: AssessmentResultScreenProps = {
    result: SAMPLE_RESULT,
    onBack: () => {},
    onRetry: () => {}
  };

  @State private showContent: boolean = false;

  aboutToAppear(): void {
    setTimeout(() => {
      this.showContent = true;
    }, 300);
  }

  private getLevelColor(level: string): Color {
    switch (level) {
      case 'excellent':
        return Color.fromARGB(255, 52, 199, 89);
      case 'good':
        return Color.fromARGB(255, 0, 173, 195);
      case 'fair':
        return Color.fromARGB(255, 255, 162, 71);
      case 'poor':
        return Color.fromARGB(255, 255, 59, 48);
      default:
        return Color.fromARGB(255, 150, 150, 150);
    }
  }

  private getLevelText(level: string): string {
    switch (level) {
      case 'excellent':
        return '优秀';
      case 'good':
        return '良好';
      case 'fair':
        return '一般';
      case 'poor':
        return '需提升';
      default:
        return '未知';
    }
  }

  build() {
    Column() {
      // 顶部标题
      Column() {
        Row() {
          Button('←', { type: ButtonType.Capsule })
            .fontSize(16)
            .fontColor(Color.White)
            .width(36)
            .height(36)
            .backgroundColor(Color.fromARGB(50, 255, 255, 255))
            .onClick(() => this.props.onBack?.())

          Blank()

          Text('评估报告')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)

          Blank()
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 16 })
      }
      .width('100%')
      .backgroundColor(Color.fromARGB(255, 0, 173, 195))

      // 结果内容
      if (this.showContent) {
        Scroll() {
          Column() {
            // 总分卡片
            this.buildScoreCard()

            // 雷达图区域（用形状模拟）
            this.buildRadarChart()

            // 各维度评分
            this.buildDimensionList()

            // 建议
            this.buildSuggestionCard()

            // 按钮
            this.buildActionButtons()
          }
          .padding({ left: 16, right: 16, bottom: 24 })
        }
        .scrollable(ScrollDirection.Vertical)
        .scrollBar(BarState.Off)
        .edgeEffect(EdgeEffect.Spring)
        .width('100%')
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.fromARGB(255, 246, 248, 252))
  }

  @Builder
  private buildScoreCard() {
    Column() {
      Text('综合评分')
        .fontSize(14)
        .fontColor(Color.White)
        .margin({ top: 20 })

      Text(`${this.props.result.totalScore}`)
        .fontSize(56)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .margin({ top: 4 })

      Text(`/ ${this.props.result.maxScore} 分`)
        .fontSize(14)
        .fontColor(Color.fromARGB(180, 255, 255, 255))
        .margin({ bottom: 20 })
    }
    .width('100%')
    .alignItems(HorizontalAlign.Center)
    .backgroundColor(Color.fromARGB(255, 0, 173, 195))
    .borderRadius(16)
    .margin({ top: 16 })
  }

  @Builder
  private buildRadarChart() {
    Column() {
      Text('能力雷达图')
        .fontSize(14)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.fromARGB(200, 50, 50, 50))
        .alignSelf(HorizontalAlign.Start)
        .margin({ top: 20, bottom: 12 })

      // 模拟雷达图（使用多边形占位）
      Stack({ alignContent: Alignment.Center }) {
        // 背景网格
        Column() {
          ForEach([1, 2, 3, 4, 5], (i: number) => {
            Circle() {
              Text('')
            }
            .width((i * 40))
            .height((i * 40))
            .border({
              width: 1,
              color: Color.fromARGB(30, 0, 0, 0)
            })
            .borderRadius((i * 20))
            .margin({ top: (5 - i) * 20 })
          });
        }
        .align(Alignment.Center)

        // 雷达图数据点
        // 这里简化处理，用文字标签
        Column() {
          Row() {
            Text('学习')
              .fontSize(10)
              .fontColor(Color.fromARGB(150, 100, 100, 100))
          }
          .width('100%')
          .justifyContent(FlexAlign.Center)

          Row() {
            Text('协作')
              .fontSize(10)
              .fontColor(Color.fromARGB(150, 100, 100, 100))

            Blank()

            Text('抗压')
              .fontSize(10)
              .fontColor(Color.fromARGB(150, 100, 100, 100))
          }
          .width(160)
          .margin({ top: 80 })

          Row() {
            Text('沟通')
              .fontSize(10)
              .fontColor(Color.fromARGB(150, 100, 100, 100))
          }
          .width('100%')
          .justifyContent(FlexAlign.Center)
          .margin({ top: 60 })

          Text('规划')
            .fontSize(10)
            .fontColor(Color.fromARGB(150, 100, 100, 100))
            .margin({ top: 60 })
        }
      }
      .width('100%')
      .height(220)
      .backgroundColor(Color.White)
      .borderRadius(16)
    }
  }

  @Builder
  private buildDimensionList() {
    Column() {
      Text('各维度评分')
        .fontSize(14)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.fromARGB(200, 50, 50, 50))
        .alignSelf(HorizontalAlign.Start)
        .margin({ top: 20, bottom: 12 })

      ForEach(this.props.result.dimensions, (dimension: AssessmentDimension) => {
        Column() {
          Row() {
            Text(dimension.name)
              .fontSize(14)
              .fontColor(Color.fromARGB(200, 80, 80, 80))

            Blank()

            Text(this.getLevelText(dimension.level))
              .fontSize(12)
              .fontColor(this.getLevelColor(dimension.level))
              .backgroundColor(this.getLevelColor(dimension.level) + '20')
              .padding({ left: 8, right: 8, top: 2, bottom: 2 })
              .borderRadius(4)
          }
          .width('100%')

          // 进度条
          Row() {
            Rect()
              .width(`${(dimension.score / dimension.maxScore) * 100}%`)
              .height(6)
              .backgroundColor(this.getLevelColor(dimension.level))
              .borderRadius(3)
          }
          .width('100%')
          .backgroundColor(Color.fromARGB(30, 0, 0, 0))
          .borderRadius(3)
          .margin({ top: 6 })

          Text(`${dimension.score}分`)
            .fontSize(11)
            .fontColor(Color.fromARGB(150, 120, 120, 120))
            .alignSelf(HorizontalAlign.End)
            .margin({ top: 2 })
        }
        .padding(14)
        .backgroundColor(Color.White)
        .borderRadius(12)
        .margin({ bottom: 8 })
      });
    }
  }

  @Builder
  private buildSuggestionCard() {
    Column() {
      Row() {
        Text('💡')
          .fontSize(16)

        Text('改进建议')
          .fontSize(14)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 6 })
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 20, bottom: 12 })

      Text(this.props.result.suggestion)
        .fontSize(14)
        .fontColor(Color.fromARGB(160, 100, 100, 100))
        .lineHeight(22)
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
  }

  @Builder
  private buildActionButtons() {
    Row() {
      Button('重新测评')
        .fontSize(14)
        .fontColor(Color.fromARGB(255, 0, 173, 195))
        .backgroundColor(Color.Transparent)
        .border({
          width: 1.5,
          color: Color.fromARGB(255, 0, 173, 195)
        })
        .borderRadius(20)
        .height(44)
        .layoutWeight(1)
        .margin({ right: 8 })
        .onClick(() => this.props.onRetry?.())

      Button('返回首页')
        .fontSize(14)
        .fontColor(Color.White)
        .backgroundColor(Color.fromARGB(255, 0, 173, 195))
        .borderRadius(20)
        .height(44)
        .layoutWeight(1)
        .margin({ left: 8 })
        .onClick(() => this.props.onBack?.())
    }
    .margin({ top: 24 })
  }
}

// ==================== 导出组件别名 ====================

export { AssessmentHomeScreen as default };
