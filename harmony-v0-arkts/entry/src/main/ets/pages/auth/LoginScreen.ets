/**
 * LoginScreen - 手机号+验证码登录
 */

import { getAuthService } from '../../services/AuthService';

interface LoginScreenProps {
  onLoginSuccess: (token: string, userJson: string) => void;
  onGoRegister: () => void;
  onBack?: () => void;
}

@Component
export struct LoginScreen {
  @State phone: string = '';
  @State code: string = '';
  @State loading: boolean = false;
  @State sendingCode: boolean = false;
  @State errorMsg: string | null = null;
  @State infoMsg: string | null = null;
  @State countdown: number = 0;

  private authService = getAuthService();
  private countdownTimer: number = -1;
  private props?: LoginScreenProps;

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
        // 标题
        Column({ space: 8 }) {
          Text('欢迎回来')
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.fromARGB(255, 44, 44, 44))
          Text('登录您的账户')
            .fontSize(16)
            .fontColor(Color.fromARGB(255, 179, 102, 102))
        }
        .margin({ top: 60, bottom: 40 })

        // 表单卡片
        Column() {
          // 手机号
          Column({ space: 6 }) {
            Text('手机号')
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 179, 102, 102))
              .margin({ left: 4 })
            TextInput({ placeholder: '请输入11位手机号', text: this.phone })
              .width('100%')
              .height(48)
              .fontSize(16)
              .backgroundColor(Color.fromARGB(255, 250, 250, 250))
              .border({ width: 1, color: Color.fromARGB(255, 220, 220, 220), radius: 12 })
              .type(InputType.PhoneNumber)
              .onChange((v: string) => {
                this.phone = v.replace(/[^0-9]/g, '').substring(0, 11);
                this.errorMsg = null;
              })
          }

          // 验证码行
          Column({ space: 6 }) {
            Text('验证码')
              .fontSize(12)
              .fontColor(Color.fromARGB(255, 179, 102, 102))
              .margin({ left: 4, top: 16 })
            Row({ space: 12 }) {
              TextInput({ placeholder: '请输入验证码', text: this.code })
                .layoutWeight(1)
                .height(48)
                .fontSize(16)
                .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                .border({ width: 1, color: Color.fromARGB(255, 220, 220, 220), radius: 12 })
                .type(InputType.Number)
                .onChange((v: string) => {
                  this.code = v.replace(/[^0-9]/g, '').substring(0, 6);
                  this.errorMsg = null;
                })
              Button(this.countdown > 0 ? `${this.countdown}s` : '发送验证码')
                .height(48)
                .fontSize(14)
                .fontColor(Color.White)
                .backgroundColor(
                  this.phone.length === 11 && this.countdown === 0
                    ? Color.fromARGB(255, 255, 140, 66)
                    : Color.fromARGB(255, 255, 194, 159)
                )
                .width(120)
                .borderRadius(12)
                .onClick(() => {
                  this.handleSendCode();
                })
            }
          }

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
              .fontColor(Color.Green)
              .margin({ top: 8 })
          }

          // 登录按钮
          Button('登录', { type: ButtonType.Capsule })
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
              .fontColor(Color.fromARGB(255, 179, 102, 102))
            Button('立即注册')
              .fontSize(14)
              .fontWeight(FontWeight.SemiBold)
              .fontColor(Color.fromARGB(255, 255, 140, 66))
              .backgroundColor(Color.Transparent)
              .onClick(() => {
                this.props?.onGoRegister?.();
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
          offsetY: 4
        })
      }
      .width('100%')
      .height('100%')
      .padding({ left: 24, right: 24 })

      // Loading 遮罩
      if (this.loading) {
        Column() {
          Column()
            .width('100%')
            .height('100%')
            .backgroundColor(Color.fromARGB(128, 0, 0, 0))
          Column() {
            LoadingProgress()
              .width(40)
              .height(40)
              .color(Color.fromARGB(255, 255, 140, 66))
            Text('登录中...')
              .fontSize(14)
              .fontColor(Color.White)
              .margin({ top: 12 })
          }
          .width(120)
          .height(120)
          .backgroundColor(Color.fromARGB(200, 0, 0, 0))
          .borderRadius(12)
          .justifyContent(FlexAlign.Center)
        }
        .width('100%')
        .height('100%')
        .position({ x: 0, y: 0 })
      }
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
      const res = await this.authService.sendCode(this.phone);
      this.sendingCode = false;
      if (res.success) {
        this.infoMsg = '验证码已发送，请注意查收';
        this.startCountdown(60);
      } else {
        this.errorMsg = res.error ?? '发送失败，请重试';
      }
    } catch (e) {
      this.sendingCode = false;
      this.errorMsg = '验证码发送失败';
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
      this.errorMsg = '请输入6位验证码';
      return;
    }
    this.loading = true;
    this.errorMsg = null;
    try {
      const res = await this.authService.login(this.phone, this.code);
      this.loading = false;
      if (res.success && res.data) {
        const userJson = JSON.stringify(res.data.user.toJson());
        this.props?.onLoginSuccess?.(res.data.token, userJson);
      } else {
        this.errorMsg = res.error ?? '登录失败';
      }
    } catch (e) {
      this.loading = false;
      this.errorMsg = '登录失败，请检查网络';
    }
  }
}
