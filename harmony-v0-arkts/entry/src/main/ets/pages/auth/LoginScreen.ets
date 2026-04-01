/**
 * 登录页 - 手机号 + 验证码登录
 * 参考 Android LoginScreen.kt 实现
 */

import promptAction from '@ohos.promptAction';
import { getAuthService } from '../../services/AuthService';
import { showToast } from '../../utils/Toast';
import { LoadingOverlay } from '../../components/LoadingDialog';

interface LoginScreenProps {
  onLoginSuccess: (token: string, userJson: string) => void;
  onGoRegister: () => void;
  onBack?: () => void;
}

@Component
export struct LoginScreen {
  props: LoginScreenProps;
  @State private phone: string = '';
  @State private code: string = '';
  @State private loading: boolean = false;
  @State private sendingCode: boolean = false;
  @State private errorMsg: string | null = null;
  @State private infoMsg: string | null = null;
  @State private countdown: number = 0;
  @State private agreed: boolean = true;

  private authService = getAuthService();
  private countdownTimer: number = -1;

  aboutToDisappear() {
    if (this.countdownTimer !== -1) {
      clearInterval(this.countdownTimer);
    }
  }

  build() {
    Stack() {
      // 渐变背景
      Column() {
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 255, 214, 186))
      }
      .width('100%')
      .height('100%')

      Column() {
        // 顶部渐变 - 模拟从橙色到浅蓝
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 255, 214, 186))

        Column()
          .width('100%')
          .height('100%')
          .backgroundColor(Color.fromARGB(255, 227, 242, 253))
      }
      .width('100%')
      .height('100%')
      .position({ x: 0, y: 0 })

      // 白色卡片内容
      Column() {
        // 返回按钮（如有）
        if (this.props.onBack) {
          Row() {
            Button('← 返回', { type: ButtonType.Capsule })
              .fontSize(14)
              .fontColor(Color.fromARGB(255, 236, 124, 56))
              .backgroundColor(Color.Transparent)
              .onClick(() => {
                this.props.onBack?.();
              })
          }
          .width('100%')
          .justifyContent(FlexAlign.Start)
          .margin({ bottom: 16 })
        }

        // 标题
        Column({ space: 8 }) {
          Text('欢迎回来')
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.fromARGB(255, 44, 44, 44))

          Text('登录您的账户')
            .fontSize(16)
            .fontColor(Color.fromARGB(179, 102, 102, 102))
        }
        .margin({ top: 40, bottom: 40 })

        // 登录表单卡片
        Column() {
          // 手机号输入
          Column({ space: 4 }) {
            Text('手机号')
              .fontSize(12)
              .fontColor(Color.fromARGB(179, 90, 90, 90))
              .margin({ left: 4, bottom: 4 })

            TextInput({ placeholder: '请输入11位手机号', text: this.phone })
              .width('100%')
              .height(48)
              .fontSize(16)
              .backgroundColor(Color.fromARGB(255, 250, 250, 250))
              .border({
                width: 1,
                color: Color.fromARGB(77, 0, 0, 0),
                radius: 12
              })
              .inputFilter((value: string) => {
                return value.replace(/[^0-9]/g, '').substring(0, 11);
              })
              .onChange((value: string) => {
                this.phone = value;
                this.errorMsg = null;
              })
          }

          // 验证码输入 + 发送按钮
          Column({ space: 4 }) {
            Text('验证码')
              .fontSize(12)
              .fontColor(Color.fromARGB(179, 90, 90, 90))
              .margin({ left: 4, bottom: 4 })

            Row({ space: 12 }) {
              TextInput({ placeholder: '请输入验证码', text: this.code })
                .layoutWeight(1)
                .height(48)
                .fontSize(16)
                .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                .border({
                  width: 1,
                  color: Color.fromARGB(77, 0, 0, 0),
                  radius: 12
                })
                .inputFilter((value: string) => {
                  return value.replace(/[^0-9]/g, '').substring(0, 6);
                })
                .onChange((value: string) => {
                  this.code = value;
                  this.errorMsg = null;
                })

              Button(this.countdown > 0 ? `${this.countdown}s` : '发送验证码', {
                type: ButtonType.Capsule,
                stateEffect: !this.sendingCode && this.countdown === 0 && this.phone.length === 11
              })
                .height(48)
                .fontSize(14)
                .fontColor(Color.White)
                .backgroundColor(
                  this.phone.length === 11
                    ? Color.fromARGB(255, 255, 140, 66)
                    : Color.fromARGB(255, 255, 194, 159)
                )
                .width(120)
                .onClick(() => {
                  this.handleSendCode();
                })
            }
          }
          .margin({ top: 16 })

          // 错误提示
          if (this.errorMsg) {
            Text(this.errorMsg)
              .fontSize(12)
              .fontColor(Color.Red)
              .margin({ top: 12 })
          }

          // 信息提示
          if (this.infoMsg) {
            Text(this.infoMsg)
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 46, 125, 50))
              .margin({ top: 8 })
          }

          // 登录按钮
          Button('登录', { type: ButtonType.Capsule, stateEffect: !this.loading })
            .width('100%')
            .height(48)
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(Color.White)
            .backgroundColor(
              this.phone.length === 11 && this.code.length === 6
                ? Color.fromARGB(255, 255, 140, 66)
                : Color.fromARGB(255, 255, 194, 159)
            )
            .margin({ top: 24 })
            .onClick(() => {
              this.handleLogin();
            })

          // 注册链接
          Row() {
            Text('还没有账号？')
              .fontSize(14)
              .fontColor(Color.fromARGB(179, 102, 102, 102))

            Button('立即注册', { type: ButtonType.Text })
              .fontSize(14)
              .fontWeight(FontWeight.SemiBold)
              .fontColor(Color.fromARGB(255, 255, 140, 66))
              .onClick(() => {
                this.props.onGoRegister();
              })
          }
          .margin({ top: 16 })
        }
        .padding(24)
        .backgroundColor(Color.White)
        .borderRadius(16)
        .shadow({
          radius: 12,
          color: Color.fromARGB(32, 0, 0, 0),
          offsetY: 4,
        })
      }
      .width('100%')
      .height('100%')
      .padding({ left: 24, right: 24 })

      // Loading
      LoadingOverlay({
        visible: this.loading,
        message: '登录中...',
        dismissible: false
      })
    }
    .width('100%')
    .height('100%')
  }

  private async handleSendCode(): Promise<void> {
    if (this.phone.length !== 11) {
      this.errorMsg = '请输入11位手机号';
      return;
    }

    this.sendingCode = true;
    this.errorMsg = null;
    this.infoMsg = null;

    try {
      const response = await this.authService.sendCode(this.phone);
      this.sendingCode = false;

      if (response.success && response.data) {
        this.infoMsg = '验证码已发送，请注意查收短信';
        // 开始倒计时
        this.startCountdown(response.data.resendIn);
      } else {
        this.errorMsg = response.error ?? '验证码发送失败';
        this.infoMsg = null;
        this.countdown = 0;
      }
    } catch (e) {
      this.sendingCode = false;
      this.errorMsg = '验证码发送失败，请重试';
    }
  }

  private startCountdown(seconds: number): void {
    if (this.countdownTimer !== -1) {
      clearInterval(this.countdownTimer);
    }
    this.countdown = seconds;
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = -1;
      }
    }, 1000) as unknown as number;
  }

  private async handleLogin(): Promise<void> {
    if (this.phone.length !== 11) {
      this.errorMsg = '请输入11位手机号';
      return;
    }
    if (this.code.length !== 6) {
      this.errorMsg = '请输入收到的6位验证码';
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    try {
      const response = await this.authService.login(this.phone, this.code);
      this.loading = false;

      if (response.success && response.data) {
        const userJson = JSON.stringify(response.data.user.toJson());
        this.props.onLoginSuccess(response.data.token, userJson);
      } else {
        this.errorMsg = response.error ?? '登录失败，请检查验证码';
      }
    } catch (e) {
      this.loading = false;
      this.errorMsg = '登录失败，请检查网络后重试';
    }
  }
}
