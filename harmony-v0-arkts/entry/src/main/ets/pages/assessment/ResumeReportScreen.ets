/**
 * 简历报告页面
 * 显示简历完整度评分、各维度分析、改进建议
 */

interface ResumeReportScreenProps {
  onBack: () => void;
  onExport: () => void;
  onShare: () => void;
}

// 简历完整度项
interface ResumeCompletenessItem {
  name: string;
  score: number;
  maxScore: number;
  status: 'complete' | 'incomplete' | 'missing';
  tip: string;
}

// 工作经历项
interface WorkExperienceItem {
  company: string;
  position: string;
  duration: string;
  description: string;
  matchScore: number;
}

// 简历报告数据
interface ResumeReportData {
  completenessScore: number;
  completenessItems: ResumeCompletenessItem[];
  workExperience: WorkExperienceItem[];
  skills: string[];
  education: string;
  totalExperience: string;
  recommendedJobs: RecommendedJob[];
  overallTip: string;
}

interface RecommendedJob {
  title: string;
  company: string;
  salary: string;
  location: string;
  tags: string[];
}

// 示例数据
const SAMPLE_RESUME_REPORT: ResumeReportData = {
  completenessScore: 75,
  completenessItems: [
    { name: '基本信息', score: 15, maxScore: 15, status: 'complete', tip: '基本信息完整' },
    { name: '求职意向', score: 15, maxScore: 15, status: 'complete', tip: '求职目标明确' },
    { name: '教育背景', score: 15, maxScore: 15, status: 'complete', tip: '学历信息完整' },
    { name: '工作经历', score: 10, maxScore: 20, status: 'incomplete', tip: '建议补充更多工作细节' },
    { name: '项目经验', score: 0, maxScore: 15, status: 'missing', tip: '缺少项目经验描述' },
    { name: '技能证书', score: 10, maxScore: 10, status: 'complete', tip: '技能描述清晰' },
    { name: '自我评价', score: 10, maxScore: 10, status: 'complete', tip: '自我评价中肯' }
  ],
  workExperience: [
    {
      company: '某知名互联网公司',
      position: '高级前端开发工程师',
      duration: '2020.06 - 至今',
      description: '负责前端架构设计与团队管理，主导多个项目开发',
      matchScore: 88
    },
    {
      company: '某创业公司',
      position: '前端开发工程师',
      duration: '2017.09 - 2020.05',
      description: '参与公司核心产品前端开发',
      matchScore: 75
    }
  ],
  skills: ['React', 'Vue', 'TypeScript', 'Node.js', 'Webpack', 'Git'],
  education: '本科 - 计算机科学 - 某重点大学',
  totalExperience: '6年',
  recommendedJobs: [
    {
      title: '前端架构师',
      company: '某大型科技公司',
      salary: '35K-50K',
      location: '北京',
      tags: ['技术管理', '架构设计']
    },
    {
      title: '前端技术专家',
      company: '某知名互联网公司',
      salary: '40K-60K',
      location: '上海',
      tags: ['技术专家', '前端方向']
    }
  ],
  overallTip: '您的简历整体结构清晰，技术栈描述详细。建议补充更多项目经验来突出您的实战能力，同时完善工作经历的量化成果。'
};

@Component
export default struct ResumeReportScreen {
  props: ResumeReportScreenProps = {
    onBack: () => {},
    onExport: () => {},
    onShare: () => {}
  };

  @State private reportData: ResumeReportData = SAMPLE_RESUME_REPORT;
  @State private showContent: boolean = false;

  aboutToAppear(): void {
    setTimeout(() => {
      this.showContent = true;
    }, 300);
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'complete':
        return '✓';
      case 'incomplete':
        return '○';
      case 'missing':
        return '×';
      default:
        return '?';
    }
  }

  private getStatusColor(status: string): Color {
    switch (status) {
      case 'complete':
        return Color.fromARGB(255, 52, 199, 89);
      case 'incomplete':
        return Color.fromARGB(255, 255, 162, 71);
      case 'missing':
        return Color.fromARGB(255, 255, 59, 48);
      default:
        return Color.fromARGB(150, 150, 150);
    }
  }

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

          Text('简历报告')
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

      // 报告内容
      if (this.showContent) {
        Scroll() {
          Column() {
            // 完整度评分卡片
            this.buildCompletenessCard()

            // 各维度分析
            this.buildDimensionsCard()

            // 工作经历
            this.buildExperienceCard()

            // 技能标签
            this.buildSkillsCard()

            // 改进建议
            this.buildTipsCard()

            // 推荐职位
            this.buildRecommendedJobsCard()

            // 操作按钮
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
  private buildCompletenessCard() {
    Column() {
      Row() {
        Text('📋')
          .fontSize(20)

        Text('简历完整度')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 8 })
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 16, bottom: 16 })

      Row() {
        // 圆形进度
        Stack({ alignContent: Alignment.Center }) {
          // 背景圆
          Circle() {
            Column() {
              Text(`${this.reportData.completenessScore}%`)
                .fontSize(24)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.fromARGB(255, 0, 173, 195))

              Text('完整度')
                .fontSize(12)
                .fontColor(Color.fromARGB(150, 120, 120, 120))
            }
          }
          .width(100)
          .height(100)
          .backgroundColor(Color.fromARGB(30, 0, 173, 195))
          .borderRadius(50)

          // 进度弧形（简化处理，用占位）
          Circle() {
            Text('')
          }
          .width(100)
          .height(100)
          .border({
            width: 8,
            color: Color.fromARGB(255, 0, 173, 195)
          })
          .borderRadius(50)
        }
        .width(100)
        .height(100)

        Column() {
          Text('简历质量评分')
            .fontSize(14)
            .fontColor(Color.fromARGB(150, 100, 100, 100))

          Text('75/100')
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.fromARGB(255, 255, 162, 71))
            .margin({ top: 4 })

          Text('中等偏上，建议继续完善')
            .fontSize(12)
            .fontColor(Color.fromARGB(180, 0, 173, 195))
            .margin({ top: 4 })
        }
        .margin({ left: 20 })
      }
      .width('100%')
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 16 })
  }

  @Builder
  private buildDimensionsCard() {
    Column() {
      Row() {
        Text('📊')
          .fontSize(20)

        Text('各维度分析')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 8 })
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 20, bottom: 16 })

      ForEach(this.reportData.completenessItems, (item: ResumeCompletenessItem) => {
        Row() {
          Text(this.getStatusIcon(item.status))
            .fontSize(16)
            .fontColor(this.getStatusColor(item.status))

          Column() {
            Row() {
              Text(item.name)
                .fontSize(14)
                .fontColor(Color.fromARGB(200, 80, 80, 80))

              Blank()

              Text(`${item.score}/${item.maxScore}分`)
                .fontSize(12)
                .fontColor(Color.fromARGB(150, 120, 120, 120))
            }
            .width('100%')

            Text(item.tip)
              .fontSize(12)
              .fontColor(Color.fromARGB(150, 120, 120, 120))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .margin({ left: 12 })
        }
        .width('100%')
        .padding({ top: 10, bottom: 10 })
      });
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 12 })
  }

  @Builder
  private buildExperienceCard() {
    Column() {
      Row() {
        Text('💼')
          .fontSize(20)

        Text('工作经历')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 8 })

        Blank()

        Text(this.reportData.totalExperience)
          .fontSize(12)
          .fontColor(Color.fromARGB(180, 0, 173, 195))
          .backgroundColor(Color.fromARGB(30, 0, 173, 195))
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 20, bottom: 16 })

      ForEach(this.reportData.workExperience, (exp: WorkExperienceItem) => {
        Column() {
          Row() {
            Column() {
              Text(exp.position)
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor(Color.fromARGB(200, 50, 50, 50))

              Text(exp.company)
                .fontSize(12)
                .fontColor(Color.fromARGB(150, 100, 100, 100))
                .margin({ top: 2 })

              Text(exp.duration)
                .fontSize(11)
                .fontColor(Color.fromARGB(150, 130, 130, 130))
                .margin({ top: 2 })
            }

            Blank()

            Column() {
              Text('匹配度')
                .fontSize(10)
                .fontColor(Color.fromARGB(150, 120, 120, 120))

              Text(`${exp.matchScore}%`)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.getStatusColor(exp.matchScore >= 80 ? 'complete' : exp.matchScore >= 60 ? 'incomplete' : 'missing'))
            }
          }

          Text(exp.description)
            .fontSize(12)
            .fontColor(Color.fromARGB(150, 100, 100, 100))
            .margin({ top: 8 })
        }
        .width('100%')
        .padding(14)
        .backgroundColor(Color.fromARGB(20, 0, 173, 195))
        .borderRadius(12)
        .margin({ bottom: 10 })
      });
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 12 })
  }

  @Builder
  private buildSkillsCard() {
    Column() {
      Row() {
        Text('🛠')
          .fontSize(20)

        Text('技能特长')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 8 })
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 20, bottom: 16 })

      Row() {
        ForEach(this.reportData.skills, (skill: string) => {
          Text(skill)
            .fontSize(13)
            .fontColor(Color.fromARGB(255, 0, 173, 195))
            .backgroundColor(Color.fromARGB(30, 0, 173, 195))
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .borderRadius(16)
        })
      }
      .width('100%')
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 12 })
  }

  @Builder
  private buildTipsCard() {
    Column() {
      Row() {
        Text('💡')
          .fontSize(20)

        Text('改进建议')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 8 })
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 20, bottom: 12 })

      Text(this.reportData.overallTip)
        .fontSize(14)
        .fontColor(Color.fromARGB(160, 100, 100, 100))
        .lineHeight(22)

      // 具体建议列表
      Column() {
        this.buildTipItem('1', '补充项目经验描述，使用STAR法则'),
        this.buildTipItem('2', '量化工作成果，如提升效率X%'),
        this.buildTipItem('3', '突出技术亮点和解决的问题')
      }
      .margin({ top: 12 })
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 12 })
  }

  @Builder
  private buildTipItem(number: string, text: string) {
    Row() {
      Text(number)
        .fontSize(12)
        .fontColor(Color.White)
        .backgroundColor(Color.fromARGB(255, 0, 173, 195))
        .borderRadius(10)
        .width(20)
        .height(20)
        .textAlign(TextAlign.Center)

      Text(text)
        .fontSize(13)
        .fontColor(Color.fromARGB(160, 100, 100, 100))
        .margin({ left: 10 })
    }
    .width('100%')
    .margin({ bottom: 8 })
  }

  @Builder
  private buildRecommendedJobsCard() {
    Column() {
      Row() {
        Text('🎯')
          .fontSize(20)

        Text('推荐职位')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(200, 50, 50, 50))
          .margin({ left: 8 })
      }
      .alignSelf(HorizontalAlign.Start)
      .margin({ top: 20, bottom: 16 })

      ForEach(this.reportData.recommendedJobs, (job: RecommendedJob) => {
        Column() {
          Row() {
            Column() {
              Text(job.title)
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor(Color.fromARGB(200, 50, 50, 50))

              Text(job.company)
                .fontSize(12)
                .fontColor(Color.fromARGB(150, 100, 100, 100))
                .margin({ top: 2 })
            }

            Blank()

            Column() {
              Text(job.salary)
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.fromARGB(255, 255, 162, 71))

              Text(job.location)
                .fontSize(11)
                .fontColor(Color.fromARGB(150, 120, 120, 120))
                .margin({ top: 2 })
            }
          }

          Row() {
            ForEach(job.tags, (tag: string) => {
              Text(tag)
                .fontSize(11)
                .fontColor(Color.fromARGB(180, 0, 173, 195))
                .backgroundColor(Color.fromARGB(20, 0, 173, 195))
                .padding({ left: 8, right: 8, top: 3, bottom: 3 })
                .borderRadius(4)
                .margin({ right: 8 })
            })
          }
          .margin({ top: 10 })
        }
        .width('100%')
        .padding(14)
        .backgroundColor(Color.fromARGB(255, 250, 250, 250))
        .borderRadius(12)
        .margin({ bottom: 10 })
      });
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(16)
    .margin({ top: 12 })
  }

  @Builder
  private buildActionButtons() {
    Row() {
      Button('📤 导出报告')
        .fontSize(14)
        .fontColor(Color.fromARGB(255, 0, 173, 195))
        .backgroundColor(Color.Transparent)
        .border({
          width: 1.5,
          color: Color.fromARGB(255, 0, 173, 195)
        })
        .borderRadius(22)
        .height(44)
        .layoutWeight(1)
        .margin({ right: 8 })
        .onClick(() => this.props.onExport?.())

      Button('📤 分享')
        .fontSize(14)
        .fontColor(Color.White)
        .backgroundColor(Color.fromARGB(255, 0, 173, 195))
        .borderRadius(22)
        .height(44)
        .layoutWeight(1)
        .margin({ left: 8 })
        .onClick(() => this.props.onShare?.())
    }
    .margin({ top: 24 })
  }
}
