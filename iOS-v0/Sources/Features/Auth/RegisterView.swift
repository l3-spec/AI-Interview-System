import SwiftUI

/// 注册页 - 对齐 Android `RegisterScreen`
/// 顶部橙粉 → 浅蓝渐变 + 白色卡片表单
struct RegisterView: View {
  @EnvironmentObject private var appState: AppState

  var onRegisterSuccess: (LoginData) -> Void
  var onGoLogin: () -> Void
  var onNavigatePrivacy: () -> Void = {}

  @State private var name: String = ""
  @State private var email: String = ""
  @State private var phone: String = ""
  @State private var password: String = ""
  @State private var passwordVisible: Bool = false
  @State private var loading: Bool = false
  @State private var error: String?
  @State private var agreed: Bool = false

  var body: some View {
    ZStack(alignment: .topLeading) {
      LinearGradient(
        colors: [Color(hex: 0xFFD6BA), Color(hex: 0xE3F2FD)],
        startPoint: .top,
        endPoint: .bottom
      )
      .ignoresSafeArea()

      ScrollView {
        VStack(spacing: 24) {
          Spacer().frame(height: 24)

          // 标题
          VStack(spacing: 8) {
            Text("创建账户")
              .font(.system(size: 28, weight: .bold))
              .foregroundStyle(Color(hex: 0x2C2C2C))
            Text("加入我们，开启职业之旅")
              .font(.system(size: 16))
              .foregroundStyle(Color(hex: 0x666666))
          }

          // 注册表单卡片
          VStack(spacing: 16) {
            registerField(title: "真实姓名", icon: "person.fill", text: $name)
            registerField(title: "邮箱地址", icon: "envelope.fill", text: $email, keyboard: .emailAddress)
            registerField(title: "手机号码（可选）", icon: "phone.fill", text: $phone, keyboard: .phonePad, digitsOnly: true, maxLength: 11)
            passwordField

            if let error {
              Text(error)
                .font(.system(size: 12))
                .foregroundStyle(Color.red)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: register) {
              ZStack {
                RoundedRectangle(cornerRadius: 12)
                  .fill(canSubmit ? Color(hex: 0xFF8C42) : Color(hex: 0xFFC29F))
                if loading {
                  ProgressView().tint(.white)
                } else {
                  Text("注册")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                }
              }
              .frame(maxWidth: .infinity)
              .frame(height: 48)
            }
            .buttonStyle(.plain)
            .disabled(!canSubmit || loading)

            HStack(spacing: 8) {
              AgreementCheckbox(checked: $agreed)
              AgreementText(
                onPrivacyTap: onNavigatePrivacy,
                onAgreementTap: onNavigatePrivacy
              )
            }

            HStack(spacing: 4) {
              Text("已有账号？")
                .font(.system(size: 14))
                .foregroundStyle(Color(hex: 0x666666))
              Button(action: onGoLogin) {
                Text("立即登录")
                  .font(.system(size: 14, weight: .semibold))
                  .foregroundStyle(Color(hex: 0xFF8C42))
              }
              .buttonStyle(.plain)
            }
          }
          .padding(24)
          .background(
            RoundedRectangle(cornerRadius: 16)
              .fill(Color.white)
              .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
          )
          .padding(.horizontal, 24)

          Spacer().frame(height: 24)
        }
      }

      // 返回按钮
      Button(action: onGoLogin) {
        Image(systemName: "chevron.left")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(Color(hex: 0x2C2C2C))
          .frame(width: 36, height: 36)
          .background(Circle().fill(Color.white.opacity(0.6)))
      }
      .buttonStyle(.plain)
      .padding(.leading, 16)
      .padding(.top, 8)
    }
  }

  private var canSubmit: Bool {
    !name.isEmpty && !email.isEmpty && password.count >= 6
  }

  // MARK: - 子组件

  @ViewBuilder
  private func registerField(
    title: String,
    icon: String,
    text: Binding<String>,
    keyboard: AuthKeyboardType = .default,
    digitsOnly: Bool = false,
    maxLength: Int? = nil
  ) -> some View {
    HStack(spacing: 12) {
      Image(systemName: icon)
        .foregroundStyle(AppColor.textSecondary)
      TextField(title, text: text)
        .font(.system(size: 14))
        .foregroundStyle(AppColor.textPrimary)
        #if os(iOS)
        .keyboardType(keyboard)
        .autocapitalization(.none)
        .disableAutocorrection(true)
        #endif
        .modifier(SanitizeTextModifier(text: text, digitsOnly: digitsOnly, maxLength: maxLength))
    }
    .padding(.horizontal, 12)
    .frame(height: 48)
    .background(
      RoundedRectangle(cornerRadius: 8)
        .stroke(AppColor.dividerGray, lineWidth: 1)
    )
  }

  private var passwordField: some View {
    HStack(spacing: 12) {
      Image(systemName: "lock.fill")
        .foregroundStyle(AppColor.textSecondary)
      Group {
        if passwordVisible {
          TextField("密码（至少 6 位）", text: $password)
        } else {
          SecureField("密码（至少 6 位）", text: $password)
        }
      }
      .font(.system(size: 14))
      .foregroundStyle(AppColor.textPrimary)
      #if os(iOS)
      .autocapitalization(.none)
      .disableAutocorrection(true)
      #endif

      Button(action: { passwordVisible.toggle() }) {
        Image(systemName: passwordVisible ? "eye.slash" : "eye")
          .foregroundStyle(AppColor.textSecondary)
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 12)
    .frame(height: 48)
    .background(
      RoundedRectangle(cornerRadius: 8)
        .stroke(AppColor.dividerGray, lineWidth: 1)
    )
  }

  // MARK: - 行为

  private func register() {
    if !agreed {
      error = "请阅读并同意隐私政策"
      return
    }
    error = nil
    loading = true
    Task {
      defer { loading = false }
      do {
        let request = RegisterRequest(
          email: email.trimmingCharacters(in: .whitespaces),
          password: password,
          name: name.trimmingCharacters(in: .whitespaces),
          phone: phone.isEmpty ? nil : phone
        )
        let data = try await appState.authService.register(request: request)
        // RegisterData 与 LoginData 结构一致，转换为 LoginData 复用回调
        let loginData = LoginData(user: data.user, token: data.token, isNewUser: true)
        onRegisterSuccess(loginData)
      } catch {
        self.error = error.localizedDescription
      }
    }
  }
}
