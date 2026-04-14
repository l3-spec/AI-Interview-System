/**
 * 注册页 - 邮箱 + 密码 + 昵称 + 手机号（可选）
 * 参考 Android RegisterScreen.kt 实现
 */

import { getAuthService } from '../../services/AuthService';
import { LoadingOverlay } from '../../components/LoadingDialog';

interface RegisterScreenProps {
  onRegisterSuccess: (token: string, userJson: string) => void;
  onGoLogin: () => void;
  onBack?: () => void;
}

@Component
export struct RegisterScreen {
  props: RegisterScreenProps;
  @State private name: string = '';
  @State private email: string = '';
  @State private phone: string = '';
  @State private password: string = '';
  @State private confirmPassword: string = '';
  @State private passwordVisible: boolean = false;
  @State private loading: boolean = false;
  @State private errorMsg: string | null = null;

  private authService = getAuthService();

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

      // 白色卡片内容
      Column() {
        // 返回按钮
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
          Text('创建账户')
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.fromARGB(255, 44, 44, 44))

          Text('加入我们，开启职业之旅')
            .fontSize(16)
            .fontColor(Color.fromARGB(179, 102, 102, 102))
        }
        .margin({ top: 24, bottom: 40 })

        // 注册表单卡片
        Scroll() {
          Column() {
            // 姓名输入
            Column({ space: 4 }) {
              Text('真实姓名')
                .fontSize(12)
                .fontColor(Color.fromARGB(179, 90, 90, 90))
                .margin({ left: 4, bottom: 4 })

              TextInput({ placeholder: '请输入真实姓名', text: this.name })
                .width('100%')
                .height(48)
                .fontSize(16)
                .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                .border({
                  width: 1,
                  color: Color.fromARGB(77, 0, 0, 0),
                  radius: 12
                })
                .onChange((value: string) => {
                  this.name = value;
                  this.errorMsg = null;
                })
            }

            // 邮箱输入
            Column({ space: 4 }) {
              Text('邮箱地址')
                .fontSize(12)
                .fontColor(Color.fromARGB(179, 90, 90, 90))
                .margin({ left: 4, bottom: 4 })

              TextInput({ placeholder: '请输入邮箱', text: this.email })
                .width('100%')
                .height(48)
                .fontSize(16)
                .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                .border({
                  width: 1,
                  color: Color.fromARGB(77, 0, 0, 0),
                  radius: 12
                })
                .onChange((value: string) => {
                  this.email = value;
                  this.errorMsg = null;
                })
            }
            .margin({ top: 16 })

            // 手机号输入（可选）
            Column({ space: 4 }) {
              Text('手机号码（可选）')
                .fontSize(12)
                .fontColor(Color.fromARGB(179, 90, 90, 90))
                .margin({ left: 4, bottom: 4 })

              TextInput({ placeholder: '请输入手机号（可选）', text: this.phone })
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
                })
            }
            .margin({ top: 16 })

            // 密码输入
            Column({ space: 4 }) {
              Text('密码（至少6位）')
                .fontSize(12)
                .fontColor(Color.fromARGB(179, 90, 90, 90))
                .margin({ left: 4, bottom: 4 })

              Row() {
                if (this.passwordVisible) {
                  TextInput({ placeholder: '请输入密码', text: this.password })
                    .layoutWeight(1)
                    .height(48)
                    .fontSize(16)
                    .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                    .border({
                      width: 1,
                      color: Color.fromARGB(77, 0, 0, 0),
                      radius: 12
                    })
                    .onChange((value: string) => {
                      this.password = value;
                      this.errorMsg = null;
                    })
                } else {
                  TextInput({ placeholder: '请输入密码', text: this.password })
                    .layoutWeight(1)
                    .height(48)
                    .fontSize(16)
                    .type(InputType.Password)
                    .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                    .border({
                      width: 1,
                      color: Color.fromARGB(77, 0, 0, 0),
                      radius: 12
                    })
                    .onChange((value: string) => {
                      this.password = value;
                      this.errorMsg = null;
                    })
                }

                Button(this.passwordVisible ? '🙈' : '👁️', {
                  type: ButtonType.Capsule
                })
                  .width(48)
                  .height(48)
                  .fontSize(18)
                  .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                  .border({
                    width: 1,
                    color: Color.fromARGB(77, 0, 0, 0),
                    radius: 12
                  })
                  .onClick(() => {
                    this.passwordVisible = !this.passwordVisible;
                  })
              }
            }
            .margin({ top: 16 })

            // 确认密码
            Column({ space: 4 }) {
              Text('确认密码')
                .fontSize(12)
                .fontColor(Color.fromARGB(179, 90, 90, 90))
                .margin({ left: 4, bottom: 4 })

              TextInput({ placeholder: '请再次输入密码', text: this.confirmPassword })
                .width('100%')
                .height(48)
                .fontSize(16)
                .type(InputType.Password)
                .backgroundColor(Color.fromARGB(255, 250, 250, 250))
                .border({
                  width: 1,
                  color: Color.fromARGB(77, 0, 0, 0),
                  radius: 12
                })
                .onChange((value: string) => {
                  this.confirmPassword = value;
                  this.errorMsg = null;
                })
            }
            .margin({ top: 16 })

            // 错误提示
            if (this.errorMsg) {
              Text(this.errorMsg)
                .fontSize(12)
                .fontColor(Color.Red)
                .margin({ top: 12 })
            }

            // 注册按钮
            Button('注册', { type: ButtonType.Capsule, stateEffect: !this.loading })
              .width('100%')
              .height(48)
              .fontSize(16)
              .fontWeight(FontWeight.SemiBold)
              .fontColor(Color.White)
              .backgroundColor(
                this.canRegister
                  ? Color.fromARGB(255, 255, 140, 66)
                  : Color.fromARGB(255, 255, 194, 159)
              )
              .margin({ top: 24 })
              .onClick(() => {
                this.handleRegister();
              })

            // 登录链接
            Row() {
              Text('已有账号？')
                .fontSize(14)
                .fontColor(Color.fromARGB(179, 102, 102, 102))

              Button('立即登录', { type: ButtonType.Text })
                .fontSize(14)
                .fontWeight(FontWeight.SemiBold)
                .fontColor(Color.fromARGB(255, 255, 140, 66))
                .onClick(() => {
                  this.props.onGoLogin();
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
        .scrollBarBarEnable(false)
        .edgeEffect(EdgeEffect.Spring)
      }
      .width('100%')
      .height('100%')
      .padding({ left: 24, right: 24 })

      // Loading
      LoadingOverlay({
        visible: this.loading,
        message: '注册中...',
        dismissible: false
      })
    }
    .width('100%')
    .height('100%')
  }

  private get canRegister(): boolean {
    return this.name.trim().length > 0
      && this.email.trim().length > 0
      && this.password.length >= 6
      && this.confirmPassword === this.password;
  }

  private async handleRegister(): Promise<void> {
    if (!this.canRegister) {
      if (this.name.trim().length === 0) {
        this.errorMsg = '请输入姓名';
        return;
      }
      if (this.email.trim().length === 0) {
        this.errorMsg = '请输入邮箱';
        return;
      }
      if (this.password.length < 6) {
        this.errorMsg = '密码至少6位';
        return;
      }
      if (this.confirmPassword !== this.password) {
        this.errorMsg = '两次密码输入不一致';
        return;
      }
    }

    this.loading = true;
    this.errorMsg = null;

    try {
      const phoneValue = this.phone.trim().length > 0 ? this.phone.trim() : undefined;
      const response = await this.authService.register(
        this.email.trim(),
        this.password,
        this.name.trim(),
        phoneValue
      );
      this.loading = false;

      if (response.success && response.data) {
        const userJson = JSON.stringify(response.data.user.toJson());
        this.props.onRegisterSuccess(response.data.token, userJson);
      } else {
        this.errorMsg = response.error ?? '注册失败，请重试';
      }
    } catch (e) {
      this.loading = false;
      this.errorMsg = '注册失败，请检查网络后重试';
    }
  }
}
