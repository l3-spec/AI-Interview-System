/**
 * 设置页 - 账号安全、隐私设置、通知设置、关于我们
 * 参考 Android ProfileSettingsScreen.kt
 */

import { getAuthService } from '../../services/AuthService';
import { LoadingOverlay } from '../../components/LoadingDialog';

interface SettingOption {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

interface SettingSection {
  title: string;
  subtitle: string;
  options: SettingOption[];
}

interface ProfileSettingsScreenProps {
  onBack: () => void;
  onLogoutSuccess: () => void;
  onNavigatePersonalInfo: () => void;
  onNavigatePrivacy: () => void;
  onNavigateContact: () => void;
}

@Component
export struct ProfileSettingsScreen {
  props: ProfileSettingsScreenProps;
  @State private loading: boolean = false;
  @State private showLogoutConfirm: boolean = false;

  private authService = getAuthService();

  private get sections(): SettingSection[] {
    return [
      {
        title: '账号与安全',
        subtitle: '个人资料、隐私控制',
        options: [
          {
            icon: '👤',
            label: '个人资料',
            description: '头像、昵称、基础信息',
            onClick: () => this.props.onNavigatePersonalInfo()
          },
          {
            icon: '🔒',
            label: '隐私与权限',
            description: '登录设备、通知、数据授权',
            onClick: () => this.props.onNavigatePrivacy()
          }
        ]
      },
      {
        title: '帮助与支持',
        subtitle: '服务与反馈',
        options: [
          {
            icon: '📞',
            label: '客服支持',
            description: '遇到问题？联系人工客服',
            onClick: () => this.props.onNavigateContact()
          }
        ]
      }
    ];
  }

  build() {
    Stack() {
      // 渐变背景
      Column() {
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 0, 172, 195))
      }
      .width('100%')
      .height('100%')

      Column() {
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 233, 247, 249))
      }
      .width('100%')
      .height('100%')

      Column() {
        // 顶部导航栏
        this.buildTopBar();

        // 设置列表
        Scroll() {
          Column({ space: 14 }) {
            ForEach(this.sections, (section: SettingSection) => {
              this.buildSection(section);
            }, (section: SettingSection) => section.title)

            // 退出登录卡片
            this.buildLogoutCard();
          }
          .padding({ left: 16, right: 16, top: 6, bottom: 40 })
          .width('100%')
        }
        .scrollBarBarEnable(false)
        .edgeEffect(EdgeEffect.Spring)
        .layoutWeight(1)
      }
      .width('100%')
      .height('100%')

      // 退出确认弹窗
      if (this.showLogoutConfirm) {
        this.buildLogoutConfirmDialog()
      }

      LoadingOverlay({
        visible: this.loading,
        message: '处理中...',
        dismissible: false
      })
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  private buildTopBar() {
    Row() {
      Button('← 返回', { type: ButtonType.Capsule })
        .fontSize(14)
        .fontColor(Color.White)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.props.onBack();
        })

      Blank()

      Text('通用设置')
        .fontSize(16)
        .fontWeight(FontWeight.SemiBold)
        .fontColor(Color.White)

      Blank()

      // 占位保持标题居中
      Text('')
        .width(60)
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 16, bottom: 12 })
    .backgroundColor(Color.Transparent)
  }

  @Builder
  private buildSection(section: SettingSection) {
    Column({ space: 10 }) {
      // 标题行
      Row({ space: 8 }) {
        // 橙色圆点
        Column()
          .width(7)
          .height(7)
          .backgroundColor(Color.fromARGB(255, 255, 196, 138))
          .borderRadius(3.5)

        Column({ space: 2 }) {
          Text(section.title)
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(Color.fromARGB(255, 29, 31, 36))

          Text(section.subtitle)
            .fontSize(12)
            .fontColor(Color.fromARGB(179, 124, 129, 138))
        }
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)

      // 选项卡片
      Column() {
        ForEach(section.options, (option: SettingOption, index: number) => {
          this.buildOptionRow(option);

          if (index < section.options.length - 1) {
            Divider()
              .color(Color.fromARGB(230, 230, 231, 235))
              .margin({ left: 16, right: 16 })
          }
        }, (option: SettingOption) => option.label)
      }
      .backgroundColor(Color.White)
      .borderRadius(12)
      .shadow({
        radius: 4,
        color: Color.fromARGB(64, 0, 0, 0),
        offsetY: 2,
      })
    }
  }

  @Builder
  private buildOptionRow(option: SettingOption) {
    Row() {
      // 图标圆圈
      Column() {
        Text(option.icon)
          .fontSize(18)
          .width(18)
          .height(18)
          .textAlign(TextAlign.Center)
      }
      .width(40)
      .height(40)
      .backgroundColor(Color.fromARGB(255, 255, 196, 138))
      .borderRadius(20)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)

      Column({ space: 4 }) {
        Text(option.label)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(Color.fromARGB(255, 29, 31, 36))

        Text(option.description)
          .fontSize(12)
          .fontColor(Color.fromARGB(179, 124, 129, 138))
      }
      .layoutWeight(1)
      .margin({ left: 12 })

      Text('›')
        .fontSize(16)
        .fontColor(Color.fromARGB(179, 182, 186, 193))
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 14, bottom: 14 })
    .alignItems(VerticalAlign.Center)
    .onClick(() => {
      option.onClick();
    })
  }

  @Builder
  private buildLogoutCard() {
    Column() {
      Row() {
        // 图标圆圈（橙色渐变）
        Column() {
          Text('🚪')
            .fontSize(18)
            .width(18)
            .height(18)
            .textAlign(TextAlign.Center)
        }
        .width(42)
        .height(42)
        .backgroundColor(Color.fromARGB(255, 255, 196, 138))
        .borderRadius(21)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)

        Column({ space: 4 }) {
          Text('退出登录')
            .fontSize(15)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(Color.fromARGB(255, 29, 31, 36))

          Text('退出后需要重新登录才能接收消息通知并使用AI面试')
            .fontSize(12)
            .fontColor(Color.fromARGB(179, 124, 129, 138))
        }
        .layoutWeight(1)
        .margin({ left: 12 })

        Button('退出', { type: ButtonType.Capsule })
          .fontSize(13)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.White)
          .backgroundColor(Color.fromARGB(255, 236, 124, 56))
          .height(36)
          .padding({ left: 14, right: 14 })
          .onClick(() => {
            this.showLogoutConfirm = true;
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 18, bottom: 18 })
      .alignItems(VerticalAlign.Center)
    }
    .backgroundColor(Color.White)
    .borderRadius(12)
    .border({
      width: 1,
      color: Color.fromARGB(51, 236, 124, 56),
      radius: 12
    })
  }

  @Builder
  private buildLogoutConfirmDialog() {
    Stack() {
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor(Color.fromARGB(128, 0, 0, 0))
        .onClick(() => {
          this.showLogoutConfirm = false;
        })

      Column() {
        Text('确认退出登录？')
          .fontSize(16)
          .fontWeight(FontWeight.SemiBold)
          .fontColor(Color.fromARGB(255, 44, 44, 44))

        Text('退出后需要重新登录才能访问个人信息和消息。')
          .fontSize(13)
          .fontColor(Color.fromARGB(179, 90, 90, 90))
          .margin({ top: 8 })

        Row({ space: 12 }) {
          Button('取消', { type: ButtonType.Capsule })
            .fontSize(14)
            .fontColor(Color.fromARGB(255, 44, 44, 44))
            .backgroundColor(Color.fromARGB(255, 240, 240, 240))
            .width('50%')
            .height(40)
            .onClick(() => {
              this.showLogoutConfirm = false;
            })

          Button('退出', { type: ButtonType.Capsule })
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor(Color.fromARGB(255, 236, 124, 56))
            .width('50%')
            .height(40)
            .onClick(() => {
              this.showLogoutConfirm = false;
              this.handleLogout();
            })
        }
        .margin({ top: 24 })
      }
      .padding(24)
      .backgroundColor(Color.White)
      .borderRadius(16)
      .width(300)
      .align(Alignment.Center)
    }
    .width('100%')
    .height('100%')
  }

  private showToast(message: string): void {
    import('@ohos.promptAction').then((promptAction) => {
      promptAction.showToast({ message: message });
    });
  }

  private async handleLogout(): Promise<void> {
    this.loading = true;
    try {
      await this.authService.logout();
    } catch (_) {
      // ignore
    } finally {
      this.loading = false;
      this.props.onLogoutSuccess();
    }
  }
}
