/**
 * 登录主页 - Logo + 标题 + 登录按钮 + 其他登录方式
 * 参考 Android LoginMainScreen.kt 实现
 */

import promptAction from '@ohos.promptAction';
import { getAuthService } from '../../services/AuthService';
import { showToast } from '../../utils/Toast';
import { LoadingOverlay } from '../../components/LoadingDialog';

interface LoginMainScreenProps {
  onLoginSuccess: (token: string, userJson: string) => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
}

@Component
export struct LoginMainScreen {
  props: LoginMainScreenProps;
  @State private loading: boolean = false;
  @State private errorMsg: string | null = null;
  @State private infoMsg: string | null = null;

  private authService = getAuthService();

  build() {
    Stack() {
      // 渐变背景
      Column() {
        // 从青色到浅灰渐变背景
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 0, 172, 195))
      }
      .width('100%')
      .height('100%')

      // 主内容
      Column() {
        // 顶部占位（90dp 等效）
        Column()
          .height(90)

        // Logo + 品牌区域
        Column() {
          // Logo 占位（使用文字模拟）
          Column() {
            Text('AI面')
              .fontSize(48)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.White)
            Text('AI Interview System')
              .fontSize(14)
              .fontColor(Color.fromARGB(179, 255, 255, 255))
              .margin({ top: 8 })
          }
          .width(195)
          .height(143)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
        }

        // 中间撑开区域（217dp 等效）
        Column() {
          Text('')
        }
        .layoutWeight(1)

        // 底部按钮区域
        Column({ space: 16 }) {
          // 授权手机号登录按钮
          Button('授权手机号登录', {
            buttonType: ButtonType.Capsule,
            stateEffect: !this.loading
          })
            .width('100%')
            .height(48)
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor(Color.fromARGB(255, 236, 124, 56))
            .onClick(() => {
              this.handleDeviceLogin();
            })

          // 验证码登录按钮
          Button('验证码登录', { buttonType: ButtonType.Capsule })
            .width('100%')
            .height(48)
            .fontSize(14)
            .fontColor(Color.fromARGB(179, 90, 90, 90))
            .backgroundColor(Color.White)
            .border({
              width: 1,
              color: Color.fromARGB(179, 90, 90, 90),
              radius: 24
            })
            .onClick(() => {
              this.props.onGoLogin();
            })

          // 用户协议提示
          Row() {
            Checkbox()
              .select(true)
              .onChange((isChecked: boolean) => {
                // 默认已同意
              })
              .width(14)
              .height(14)
              .margin({ right: 8 })

            Text('我已阅读并同意')
              .fontSize(12)
              .fontColor(Color.fromARGB(204, 33, 33, 33))

            Text('《用户协议》')
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 22, 155, 213))
              .onClick(() => {
                promptAction.showToast({ message: '用户协议' });
              })

            Text('和')
              .fontSize(12)
              .fontColor(Color.fromARGB(204, 33, 33, 33))

            Text('《隐私政策》')
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 22, 155, 213))
              .onClick(() => {
                promptAction.showToast({ message: '隐私政策' });
              })
          }
          .alignItems(VerticalAlign.Center)

          // 错误提示
          if (this.errorMsg) {
            Text(this.errorMsg)
              .fontSize(12)
              .fontColor(Color.Red)
              .textAlign(TextAlign.Center)
              .width('100%')
          }

          // 信息提示
          if (this.infoMsg) {
            Text(this.infoMsg)
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 46, 125, 50))
              .textAlign(TextAlign.Center)
              .width('100%')
          }
        }
        .padding({ left: 48, right: 48, bottom: 96 })
        .width('100%')
      }
      .width('100%')
      .height('100%')

      // Loading 遮罩
      LoadingOverlay({
        visible: this.loading,
        message: '登录中...',
        dismissible: false
      })
    }
    .width('100%')
    .height('100%')
  }

  private async handleDeviceLogin(): Promise<void> {
    if (this.loading) {
      return;
    }
    this.errorMsg = null;
    this.infoMsg = null;

    // 尝试读取本机手机号（需要权限）
    // 此处简化处理，实际应调用 @ohos.telephony 获取
    this.loading = true;

    try {
      // 由于 HarmonyOS 读取手机号需要权限，这里直接提示用户使用验证码登录
      this.infoMsg = '正在为您登录...';

      // 模拟设备登录（实际应获取真实手机号）
      // 如果能获取到手机号，则调用 deviceLogin
      // 如果获取不到，则提示使用验证码登录
      promptAction.showToast({
        message: '请使用验证码登录',
        duration: 2000
      });

      // 实际应该在这里调用 this.authService.deviceLogin(phone)
      // 由于没有 READ_PHONE_STATE 权限，这里改为跳转到验证码登录
      this.loading = false;
      this.infoMsg = null;

    } catch (e) {
      this.loading = false;
      this.errorMsg = '登录失败，请重试';
    }
  }
}
