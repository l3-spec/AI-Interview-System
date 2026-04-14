/**
 * 个人中心（增强版）- 参考 Android ProfileScreen.kt
 * 包含：用户头像+昵称+简介、编辑入口、简历管理、我的收藏、投递记录、设置、联系客服
 */

import { getAuthService } from '../../services/AuthService';
import { User } from '../../models/User';
import { LoadingOverlay } from '../../components/LoadingDialog';

interface ProfileScreenProps {
  onNavigate: (route: string) => void;
  onLogoutSuccess: () => void;
}

// 投递快捷入口
interface ProfileShortcut {
  title: string;
  icon: string;  // emoji 模拟
  route: string | null;
  filled?: boolean;
  iconColor?: string;
}

// 统计数据项
interface ProfileStat {
  label: string;
  value: string;
  route: string | null;
}

@Component
export struct ProfileScreen {
  props: ProfileScreenProps;
  @State private user: User | null = null;
  @State private loading: boolean = false;
  @State private showLogoutConfirm: boolean = false;

  private authService = getAuthService();

  aboutToAppear() {
    this.loadUser();
  }

  private loadUser(): void {
    const cached = this.authService.getCachedUser();
    if (cached) {
      this.user = cached;
    }
    // 异步刷新用户信息
    this.fetchUserProfile();
  }

  private async fetchUserProfile(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      return;
    }
    try {
      const response = await this.authService.getUserProfile();
      if (response.success && response.data) {
        this.user = new User(
          response.data.id,
          response.data.email,
          response.data.name ?? '',
          response.data.avatar ?? null,
          response.data.phone ?? null
        );
      }
    } catch (_) {
      // ignore
    }
  }

  private readonly deliveryShortcuts: ProfileShortcut[] = [
    { title: '简历报告', icon: '📄', route: 'RESUME_REPORT', filled: true, iconColor: '#EC7C38' },
    { title: 'AI 面试', icon: '🤖', route: 'AI', filled: true, iconColor: '#EC7C38' },
    { title: '职业测评', icon: '📝', route: null, filled: true, iconColor: '#EC7C38' },
    { title: '职位收藏', icon: '⭐', route: 'JOB_FAVORITES', filled: true, iconColor: '#EC7C38' },
  ];

  private readonly deliveryStats: ProfileStat[] = [
    { label: '已投递', value: '0', route: 'DELIVERIES/submitted' },
    { label: '被查看', value: '0', route: 'DELIVERIES/viewed' },
    { label: '通过初筛', value: '0', route: 'DELIVERIES/passed' },
    { label: '不合适', value: '0', route: 'DELIVERIES/rejected' },
  ];

  private readonly communityShortcuts: ProfileShortcut[] = [
    { title: '我的发布', icon: '📝', route: 'MY_POSTS', filled: false },
    { title: '帖子收藏', icon: '🔖', route: 'POST_FAVORITES', filled: false },
    { title: '消息中心', icon: '💬', route: 'MESSAGES', filled: false },
  ];

  private readonly generalFunctions: ProfileShortcut[] = [
    { title: '通用设置', icon: '⚙️', route: 'SETTINGS', filled: false },
    { title: '个人资料', icon: '👤', route: 'PERSONAL_INFO', filled: false },
    { title: '隐私权限', icon: '🔒', route: 'PRIVACY', filled: false },
    { title: '联系我们', icon: '📞', route: 'CONTACT', filled: false },
  ];

  build() {
    Stack() {
      // 渐变背景：从浅蓝到白色
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

      // 内容区域
      Scroll() {
        Column({ space: 12 }) {
          // 头部 + 投递卡片
          this.buildHeaderSection();

          // 我的社区卡片
          this.buildCommunityCard();

          // 通用功能卡片
          this.buildGeneralFunctionsCard();
        }
        .padding({ left: 12, right: 12, bottom: 80 })
        .width('100%')
      }
      .scrollBarBarEnable(false)
      .edgeEffect(EdgeEffect.Spring)
      .width('100%')
      .height('100%')

      // 退出确认弹窗
      if (this.showLogoutConfirm) {
        this.buildLogoutConfirmDialog()
      }

      // Loading
      LoadingOverlay({
        visible: this.loading,
        message: '加载中...',
        dismissible: false
      })
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  private buildHeaderSection() {
    // 头部高度 200dp，Card offset 120dp
    Column() {
      // 顶部用户信息行
      Row() {
        // 头像 + 昵称
        Row({ space: 12 }) {
          // 头像
          Column() {
            if (this.user?.avatar) {
              // TODO: 使用 Image + 网络图片
              Text(this.getAvatarInitial())
                .fontSize(24)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .width(48)
                .height(48)
                .backgroundColor(Color.fromARGB(255, 96, 165, 250))
                .borderRadius(24)
                .textAlign(TextAlign.Center)
            } else {
              Text(this.getAvatarInitial())
                .fontSize(24)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .width(48)
                .height(48)
                .backgroundColor(Color.fromARGB(255, 96, 165, 250))
                .borderRadius(24)
                .textAlign(TextAlign.Center)
            }
          }
          .onClick(() => {
            if (!this.user) {
              // 未登录，跳转登录
              this.props.onNavigate('LOGIN_MAIN');
            }
          })

          Column({ space: 4 }) {
            Text(this.user?.name ?? '星链候选人')
              .fontSize(16)
              .fontWeight(FontWeight.SemiBold)
              .fontColor(Color.Black)

            Row({ space: 4 }) {
              Text('实名认证')
                .fontSize(12)
                .fontColor(Color.fromARGB(128, 0, 0, 0))
              Text('›')
                .fontSize(12)
                .fontColor(Color.fromARGB(128, 0, 0, 0))
            }
            .onClick(() => {
              this.showToast('实名认证');
            })
          }
        }

        Blank()

        // 箭头图标（跳转到个人资料）
        Text('›')
          .fontSize(20)
          .fontColor(Color.fromARGB(153, 0, 0, 0))
          .onClick(() => {
            if (this.user) {
              this.props.onNavigate('PERSONAL_INFO');
            } else {
              this.props.onNavigate('LOGIN_MAIN');
            }
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 40 })
      .alignItems(VerticalAlign.Center)

      // "我的投递"卡片
      Column() {
        // 卡片标题
        Row() {
          Text('我的投递')
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor(Color.fromARGB(255, 36, 37, 37))
        }
        .width('100%')
        .margin({ bottom: 16 })

        // 快捷图标行
        Row() {
          ForEach(this.deliveryShortcuts, (shortcut: ProfileShortcut) => {
            Column({ space: 8 }) {
              Text(shortcut.icon)
                .fontSize(24)
                .width(24)
                .height(24)
                .textAlign(TextAlign.Center)
                .onClick(() => {
                  if (shortcut.route) {
                    this.props.onNavigate(shortcut.route);
                  } else {
                    this.showToast(shortcut.title + ' 敬请期待');
                  }
                })
              Text(shortcut.title)
                .fontSize(11)
                .fontColor(Color.fromARGB(255, 36, 37, 37))
            }
            .width(48)
            .alignItems(HorizontalAlign.Center)
          }, (shortcut: ProfileShortcut) => shortcut.title)
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)

        // 分隔线
        Divider()
          .color(Color.fromARGB(230, 230, 231, 235))
          .margin({ top: 16, bottom: 16 })

        // 统计数据行
        Row() {
          ForEach(this.deliveryStats, (stat: ProfileStat) => {
            Column({ space: 4 }) {
              Text(stat.value)
                .fontSize(24)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.Black)
              Text(stat.label)
                .fontSize(11)
                .fontColor(Color.fromARGB(179, 36, 37, 37))
            }
            .width(48)
            .alignItems(HorizontalAlign.Center)
            .onClick(() => {
              if (stat.route) {
                this.props.onNavigate('DELIVERIES');
              } else {
                this.showToast(stat.label);
              }
            })
          }, (stat: ProfileStat) => stat.label)
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
      }
      .width('100%')
      .padding(16)
      .backgroundColor(Color.White)
      .borderRadius(8)
      .shadow({
        radius: 4,
        color: Color.fromARGB(64, 0, 0, 0),
        offsetY: 2,
      })
      .margin({ top: 120 })
    }
    .width('100%')
  }

  @Builder
  private buildCommunityCard() {
    Column() {
      Row() {
        Text('我的社区')
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor(Color.fromARGB(255, 36, 37, 37))
      }
      .width('100%')
      .margin({ bottom: 16 })

      Row() {
        ForEach(this.communityShortcuts, (shortcut: ProfileShortcut) => {
          Column({ space: 8 }) {
            Text(shortcut.icon)
              .fontSize(24)
              .width(24)
              .height(24)
              .textAlign(TextAlign.Center)
              .onClick(() => {
                if (shortcut.route) {
                  this.props.onNavigate(shortcut.route);
                } else {
                  this.showToast(shortcut.title + ' 敬请期待');
                }
              })
            Text(shortcut.title)
              .fontSize(11)
              .fontColor(Color.fromARGB(255, 36, 37, 37))
          }
          .width(48)
          .alignItems(HorizontalAlign.Center)
        }, (shortcut: ProfileShortcut) => shortcut.title)
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(8)
    .shadow({
      radius: 4,
      color: Color.fromARGB(64, 0, 0, 0),
      offsetY: 2,
    })
  }

  @Builder
  private buildGeneralFunctionsCard() {
    Column() {
      Row() {
        Text('通用功能')
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor(Color.fromARGB(255, 36, 37, 37))
      }
      .width('100%')
      .margin({ bottom: 16 })

      Row() {
        ForEach(this.generalFunctions, (shortcut: ProfileShortcut) => {
          Column({ space: 8 }) {
            Text(shortcut.icon)
              .fontSize(24)
              .width(24)
              .height(24)
              .textAlign(TextAlign.Center)
              .onClick(() => {
                if (shortcut.route === 'SETTINGS') {
                  this.props.onNavigate('SETTINGS');
                } else if (shortcut.route === 'CONTACT') {
                  this.showToast('联系我们 敬请期待');
                } else if (shortcut.route) {
                  this.props.onNavigate(shortcut.route);
                } else {
                  this.showToast(shortcut.title + ' 敬请期待');
                }
              })
            Text(shortcut.title)
              .fontSize(11)
              .fontColor(Color.fromARGB(255, 36, 37, 37))
          }
          .width(48)
          .alignItems(HorizontalAlign.Center)
        }, (shortcut: ProfileShortcut) => shortcut.title)
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%')
    .padding(16)
    .backgroundColor(Color.White)
    .borderRadius(8)
    .shadow({
      radius: 4,
      color: Color.fromARGB(64, 0, 0, 0),
      offsetY: 2,
    })
    .margin({ bottom: 12 })
  }

  @Builder
  private buildLogoutConfirmDialog() {
    Stack() {
      // 遮罩
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

  private getAvatarInitial(): string {
    const name = this.user?.name;
    if (!name || name.length === 0) {
      return '星';
    }
    return name.charAt(0).toUpperCase();
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
      this.user = null;
      this.props.onLogoutSuccess();
    }
  }
}
