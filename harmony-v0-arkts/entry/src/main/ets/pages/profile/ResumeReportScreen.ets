/**
 * 简历报告页 - 展示简历分析报告
 * 参考 Android ResumeReportScreen.kt
 */

import { getInterviewService } from '../../services/InterviewService';
import { AiInterviewSessionSummary } from '../../models/Interview';
import { LoadingOverlay } from '../../components/LoadingDialog';
import { EmptyReportState } from '../../components/EmptyState';

interface ResumeReportScreenProps {
  onBack: () => void;
  onStartInterview: () => void;
}

// 简历报告项（列表展示用）
interface ResumeReportListItem {
  id: string;
  jobTitle: string;
  jobCategory: string | null;
  jobSubCategory: string | null;
  resumeType: string | null;
  status: string;
  analysisStatus: string | null;
  reportUrl: string | null;
  isReady: boolean;
  testedAt: string | null;
}

@Component
export struct ResumeReportScreen {
  props: ResumeReportScreenProps;
  @State private reports: ResumeReportListItem[] = [];
  @State private selectedReport: ResumeReportListItem | null = null;
  @State private loading: boolean = false;
  @State private errorMsg: string | null = null;
  @State private refreshing: boolean = false;

  private interviewService = getInterviewService();

  aboutToAppear() {
    this.loadReports();
  }

  build() {
    Stack() {
      // 背景
      Column() {
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 235, 235, 235))
      }
      .width('100%')
      .height('100%')

      Column() {
        // 顶部栏
        this.buildTopBar();

        // 内容区
        if (this.loading && !this.refreshing) {
          // 加载中
          Column() {
            LoadingOverlay({
              visible: true,
              message: '加载中...'
            })
          }
          .width('100%')
          .layoutWeight(1)
        } else if (this.errorMsg && this.reports.length === 0) {
          // 错误
          Column() {
            this.buildErrorContent();
          }
          .width('100%')
          .layoutWeight(1)
        } else if (this.reports.length === 0) {
          // 空状态
          Column() {
            EmptyReportState({
              onStartInterview: () => {
                this.props.onStartInterview();
              }
            })
          }
          .width('100%')
          .layoutWeight(1)
        } else if (this.selectedReport) {
          // 报告详情
          Column() {
            this.buildReportDetail(this.selectedReport);
          }
          .width('100%')
          .layoutWeight(1)
        } else {
          // 报告列表
          Column() {
            this.buildReportList();
          }
          .width('100%')
          .layoutWeight(1)
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  private buildTopBar() {
    Column() {
      Row() {
        Button('← 返回', { type: ButtonType.Capsule })
          .fontSize(14)
          .fontColor(Color.Black)
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            if (this.selectedReport) {
              this.selectedReport = null;
            } else {
              this.props.onBack();
            }
          })

        Blank()

        Text(this.selectedReport ? '简历报告' : '简历报告')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.Black)

        Blank()

        Button('🔄', { type: ButtonType.Capsule })
          .fontSize(16)
          .backgroundColor(Color.Transparent)
          .onClick(() => {
            this.loadReports();
          })
      }
      .width('100%')
      .padding({ left: 12, right: 12, top: 16, bottom: 8 })
    }
    .width('100%')
    .backgroundColor(Color.fromARGB(255, 0, 172, 195))
  }

  @Builder
  private buildReportList() {
    List() {
      ForEach(this.reports, (report: ResumeReportListItem) => {
        ListItem() {
          this.buildReportListItem(report);
        }
        .onClick(() => {
          this.selectedReport = report;
        })
      }, (report: ResumeReportListItem) => report.id)
    }
    .scrollBarBarEnable(false)
    .padding({ left: 12, right: 12, top: 12 })
    .lanes(1)
    .layoutWeight(1)
  }

  @Builder
  private buildReportListItem(report: ResumeReportListItem) {
    Column({ space: 8 }) {
      Text(report.jobTitle)
        .fontSize(16)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.Black)

      if (report.jobCategory || report.jobSubCategory) {
        const subtitle = [report.jobCategory, report.jobSubCategory]
          .filter(Boolean)
          .join(' / ');
        Text(subtitle)
          .fontSize(13)
          .fontColor(Color.fromARGB(179, 181, 183, 184))
      }

      if (report.testedAt) {
        Text(report.testedAt)
          .fontSize(12)
          .fontColor(Color.fromARGB(179, 181, 183, 184))
      }

      Row({ space: 8 }) {
        // 状态标签
        Column() {
          Text(report.isReady ? '报告已生成' : '生成中')
            .fontSize(12)
            .fontColor(report.isReady ? Color.fromARGB(255, 0, 200, 83) : Color.fromARGB(255, 236, 124, 56))
            .padding({ left: 10, right: 10, top: 4, bottom: 4 })
            .backgroundColor(
              report.isReady
                ? Color.fromARGB(31, 0, 200, 83)
                : Color.fromARGB(31, 236, 124, 56)
            )
            .borderRadius(12)
        }

        if (report.resumeType) {
          Column() {
            Text(report.resumeType)
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 0, 91, 153))
              .padding({ left: 10, right: 10, top: 4, bottom: 4 })
              .backgroundColor(Color.fromARGB(26, 0, 91, 153))
              .borderRadius(12)
          }
        }
      }
      .margin({ top: 4 })
    }
    .width('100%')
    .padding(14)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .margin({ bottom: 12 })
  }

  @Builder
  private buildReportDetail(report: ResumeReportListItem) {
    Column() {
      if (report.reportUrl && report.isReady) {
        // 报告 WebView（需要实现 Web 组件）
        // TODO: 使用 @ohos.web.webview.Component 实现
        Column() {
          Column() {
            Text('📄 报告内容')
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.fromARGB(255, 44, 44, 44))
            Text(report.reportUrl)
              .fontSize(12)
              .fontColor(Color.fromARGB(179, 90, 90, 90))
              .margin({ top: 8 })
          }
          .padding(24)
          .width('100%')
          .alignItems(HorizontalAlign.Center)
        }
        .width('100%')
        .layoutWeight(1)
      } else {
        // 报告生成中
        Column() {
          Column() {
            Text('报告生成中')
              .fontSize(16)
              .fontWeight(FontWeight.SemiBold)
              .fontColor(Color.Black)

            Text('分析完成后会自动出现在这里，请稍后再试。')
              .fontSize(13)
              .fontColor(Color.fromARGB(179, 181, 183, 184))
              .margin({ top: 8 })
          }
          .width('100%')
          .padding(24)
          .alignItems(HorizontalAlign.Center)
        }
        .width('100%')
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
        .justifyContent(FlexAlign.Center)
      }
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 12 })
  }

  @Builder
  private buildErrorContent() {
    Column() {
      Text('加载失败')
        .fontSize(16)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.Black)

      Text(this.errorMsg ?? '未知错误')
        .fontSize(13)
        .fontColor(Color.fromARGB(179, 181, 183, 184))
        .margin({ top: 8 })

      Button('重试', { type: ButtonType.Capsule })
        .fontSize(13)
        .fontColor(Color.White)
        .backgroundColor(Color.fromARGB(255, 236, 124, 56))
        .padding({ left: 24, right: 24, top: 8, bottom: 8 })
        .margin({ top: 12 })
        .onClick(() => {
          this.loadReports();
        })
    }
    .width('100%')
    .padding(24)
    .alignItems(HorizontalAlign.Center)
  }

  private async loadReports(): Promise<void> {
    if (!this.refreshing) {
      this.loading = true;
    }
    this.errorMsg = null;

    try {
      const response = await this.interviewService.getResumeReports();
      this.loading = false;

      if (response.success && response.data) {
        this.reports = response.data.map((s: AiInterviewSessionSummary) => ({
          id: s.displayId,
          jobTitle: s.jobTarget ?? 'AI 面试',
          jobCategory: s.jobCategory,
          jobSubCategory: s.jobSubCategory,
          resumeType: s.resumeType,
          status: s.status ?? '',
          analysisStatus: s.analysisStatus,
          reportUrl: s.reportUrl,
          isReady: s.isReportReady,
          testedAt: s.startedAt ?? s.createdAt,
        }));
      } else {
        this.errorMsg = response.error ?? '加载失败';
      }
    } catch (e) {
      this.loading = false;
      this.errorMsg = '网络错误，请检查网络连接';
    }
  }
}
