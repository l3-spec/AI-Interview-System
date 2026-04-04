/**
 * LoginScreen - 手机号+验证码登录
 * 品牌：STARLINK FUTURE（柚汀科技）
 */

import { getAuthService } from '../../services/AuthService';

const AccentTeal = Color.fromARGB(255, 0, 172, 195);
const AccentOrange = Color.fromARGB(255, 236, 124, 56);
const TextDark = Color.fromARGB(255, 36, 37, 39);
const TextGray = Color.fromARGB(255, 181, 183, 184);
const BgLight = Color.fromARGB(255, 250, 250, 250);
const BorderGray = Color.fromARGB(255, 220, 220, 220);
const WhiteColor = Color.White;

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
  @State agreed: boolean = true;

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
      // 渐变背景：顶部青色 → 底部浅蓝白
      Column() {
        Column()
          .width('100%')
          .height('100%')
          .linearGradient({
            direction: GradientDirection.Top,
            colors: [[AccentTeal, 0.0], [Color.fromARGB(255, 227, 244, 251), 1.0]]
          })
      }
      .width('100%')
      .height('100%')

      Column() {
        // Logo 区域
        Column() {
          // Logo 占位图标（橙色圆形曲线）
          Column()
            .width(100)
            .height(100)
            .backgroundColor(AccentOrange)
            .borderRadius(50)
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center) {
              Text('🤖')
                .fontSize(48)
            }

          // 品牌文字
          Row() {
            Text('STARLINK')
              .fontSize(24)
              .fontWeight(FontWeight.Bold)
              .fontColor(AccentTeal)
            Text(' FUTURE')
              .fontSize(24)
              .fontWeight(FontWeight.Bold)
              .fontColor(AccentOrange)
          }
          .margin({ top: 16 })
        }
        .margin({ top: 80 })

        Blank()

        // 登录表单卡片
        Column() {
          // 手机号
          Column({ space: 6 }) {
            Text('手机号')
              .fontSize(12)
              .fontColor(TextGray)
              .margin({ left: 4 })
            TextInput({ placeholder: '请输入11位手机号', text: this.phone })
              .width('100%')
              .height(48)
              .fontSize(16)
              .backgroundColor(BgLight)
              .border({ width: 1, color: BorderGray, radius: 12 })
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
              .fontColor(TextGray)
              .margin({ left: 4, top: 16 })
            Row({ space: 12 }) {
              TextInput({ placeholder: '请输入验证码', text: this.code })
                .layoutWeight(1)
                .height(48)
                .fontSize(16)
                .backgroundColor(BgLight)
                .border({ width: 1, color: BorderGray, radius: 12 })
                .type(InputType.Number)
                .onChange((v: string) => {
                  this.code = v.replace(/[^0-9]/g, '').substring(0, 6);
                  this.errorMsg = null;
                })
              Button(this.countdown > 0 ? `${this.countdown}s` : '发送验证码')
                .height(48)
                .fontSize(14)
                .fontColor(WhiteColor)
                .backgroundColor(
                  this.phone.length === 11 && this.countdown === 0
                    ? AccentOrange
                    : Color.fromARGB(255, 255, 194, 159)
                )
                .width(120)
                .borderRadius(12)
                .onClick(() => {
                  this.handleSendCode();
                })
            }
          }

          // 错误/提示
          if (this.errorMsg) {
            Text(this.errorMsg)
              .fontSize(12)
              .fontColor(Color.Red)
              .margin({ top: 12 })
          }
          if (this.infoMsg) {
            Text(this.infoMsg)
              .fontSize(12)
              .fontColor(Color.Green)
              .margin({ top: 8 })
          }

          // 主按钮
          Button('授权手机号登陆', { type: ButtonType.Capsule })
            .width('100%')
            .height(52)
            .fontSize(16)
            .fontWeight(FontWeight.SemiBold)
            .fontColor(WhiteColor)
            .backgroundColor(
              this.phone.length === 11 && this.code.length === 6
                ? AccentOrange
                : Color.fromARGB(255, 255, 194, 159)
            )
            .margin({ top: 24 })
            .onClick(() => {
              this.handleLogin();
            })

          // 次按钮
          Button('验证码登陆', { type: ButtonType.Capsule })
            .width('100%')
            .height(52)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor(TextGray)
            .backgroundColor(WhiteColor)
            .border({
              width: 1,
              color: BorderGray,
              radius: 26
            })
            .margin({ top: 14 })
            .onClick(() => {
              this.handleCodeLogin();
            })

          // 协议
          Row() {
            Checkbox({
              isChecked: this.agreed,
              onChange: (v: boolean) => {
                this.agreed = v;
              },
              selectedColor: AccentOrange,
              shape: CheckboxShape.ROUNDED_SQUARE
            })
              .width(20)
              .height(20)
            Text('我已阅读并同意')
              .fontSize(12)
              .fontColor(TextGray)
            Text('《用户须知》')
              .fontSize(12)
              .fontColor(AccentTeal)
            Text('和')
              .fontSize(12)
              .fontColor(TextGray)
            Text('《隐私条款》')
              .fontSize(12)
              .fontColor(AccentTeal)
          }
          .margin({ top: 20 })
        }
        .padding(24)
        .backgroundColor(WhiteColor)
        .borderRadius(16)
        .shadow({
          radius: 12,
          color: Color.fromARGB(32, 0, 0, 0),
          offsetY: 4
        })
      }
      .width('100%')
      .height('100%')
      .padding({ left: 24, right: 24, bottom: 40 })

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
              .color(AccentOrange)
            Text('登录中...')
              .fontSize(14)
              .fontColor(WhiteColor)
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

  private async handleCodeLogin(): Promise<void> {
    // 验证码登录逻辑
    this.props?.onGoRegister?.();
  }
}
