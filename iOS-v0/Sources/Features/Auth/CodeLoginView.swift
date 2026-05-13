import SwiftUI

/// 验证码登录页 - 对齐 Android `CodeLoginScreen`
/// 顶部蓝色渐变 + Logo + 底部白色卡片（输入手机号 / 验证码）
struct CodeLoginView: View {
  @EnvironmentObject private var appState: AppState

  var initialPhone: String? = nil
  var onLoginSuccess: (LoginData) -> Void
  var onBack: () -> Void
  var onNavigatePrivacy: () -> Void = {}

  @State private var phone: String = ""
  @State private var code: String = ""
  @State private var loading = false
  @State private var sendingCode = false
  @State private var countdown: Int = 0
  @State private var error: String?
  @State private var info: String?
  @State private var agreed = false
  @State private var countdownTask: Task<Void, Never>?

  var body: some View {
    ZStack(alignment: .top) {
      // 顶部渐变 + Logo
      VStack {
        Spacer().frame(height: 90)
        AuthBrandLockup()
        Spacer()
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)

      // 底部白色卡片
      VStack {
        Spacer()
        cardContent
      }

      // 返回按钮
      HStack {
        Button(action: {
          countdownTask?.cancel()
          onBack()
        }) {
          Image(systemName: "chevron.left")
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 36, height: 36)
            .background(Circle().fill(Color.black.opacity(0.15)))
        }
        .buttonStyle(.plain)
        Spacer()
      }
      .padding(.leading, 16)
      .padding(.top, 8)
    }
    .authHeroBackground()
    .onAppear {
      if let initialPhone, phone.isEmpty {
        phone = String(initialPhone.filter { $0.isNumber }.prefix(11))
      }
    }
    .onDisappear { countdownTask?.cancel() }
  }

  // MARK: - 卡片内容

  private var cardContent: some View {
    VStack(spacing: 0) {
      // 标题
      Text("验证码登录")
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(AppColor.textPrimary)
        .padding(.top, 32)

      Spacer().frame(height: 48)

      VStack(spacing: 16) {
        AuthInputField(
          placeholder: "请输入手机号",
          text: $phone,
          keyboardType: .numberPad,
          maxLength: 11,
          digitsOnly: true
        )

        HStack(spacing: 8) {
          AuthInputField(
            placeholder: "请输入验证码",
            text: $code,
            keyboardType: .numberPad,
            maxLength: 6,
            digitsOnly: true
          )

          codeChip
        }
      }
      .padding(.horizontal, 48)

      Spacer().frame(height: 32)

      VStack(spacing: 16) {
        AuthPrimaryButton(
          title: "注册 / 登录",
          loading: loading,
          enabled: !loading && agreed && phone.count == 11 && code.count == 6,
          action: performLogin
        )

        HStack(spacing: 8) {
          AgreementCheckbox(checked: $agreed)
          AgreementText(
            onPrivacyTap: onNavigatePrivacy,
            onAgreementTap: onNavigatePrivacy
          )
        }
      }
      .padding(.horizontal, 48)

      if let error {
        Text(error)
          .font(.system(size: 12))
          .foregroundStyle(Color.red)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 48)
          .padding(.top, 8)
      }
      if let info {
        Text(info)
          .font(.system(size: 12))
          .foregroundStyle(Color(hex: 0x2E7D32))
          .multilineTextAlignment(.center)
          .padding(.horizontal, 48)
          .padding(.top, 8)
      }

      Spacer().frame(height: 48)
    }
    .frame(maxWidth: .infinity)
    .background(
      UnevenRoundedRectangle(
        topLeadingRadius: 16,
        bottomLeadingRadius: 0,
        bottomTrailingRadius: 0,
        topTrailingRadius: 16
      )
      .fill(Color.white)
      .shadow(color: Color.black.opacity(0.16), radius: 16, x: 0, y: -4)
    )
    .ignoresSafeArea(edges: .bottom)
  }

  // MARK: - 验证码按钮

  private var codeChip: some View {
    Button(action: requestCode) {
      ZStack {
        RoundedRectangle(cornerRadius: 19)
          .stroke(AppColor.textTertiary, lineWidth: 1)
        Group {
          if sendingCode {
            ProgressView().scaleEffect(0.6).tint(AppColor.textPrimary)
          } else if countdown > 0 {
            Text("\(countdown)s")
          } else {
            Text("获取验证码")
          }
        }
        .font(.system(size: 12, weight: .light))
        .foregroundStyle(AppColor.textPrimary)
      }
    }
    .buttonStyle(.plain)
    .frame(width: 88, height: 37)
    .disabled(sendingCode || countdown > 0 || phone.count != 11)
  }

  // MARK: - 行为

  private func requestCode() {
    guard phone.count == 11 else {
      error = "请输入 11 位手机号"
      return
    }
    error = nil
    info = nil
    sendingCode = true
    Task {
      defer { sendingCode = false }
      do {
        let data = try await appState.authService.requestLoginCode(phone: phone)
        info = "验证码已发送，请注意查收短信"
        startCountdown(seconds: data.resendIn)
      } catch {
        self.error = error.localizedDescription
      }
    }
  }

  private func performLogin() {
    guard phone.count == 11 else { error = "请输入 11 位手机号"; return }
    guard code.count == 6 else { error = "请输入收到的 6 位验证码"; return }
    error = nil
    loading = true
    Task {
      defer { loading = false }
      do {
        let data = try await appState.authService.login(phone: phone, code: code)
        onLoginSuccess(data)
      } catch {
        self.error = error.localizedDescription
      }
    }
  }

  private func startCountdown(seconds: Int) {
    countdownTask?.cancel()
    countdown = seconds
    countdownTask = Task {
      var remaining = seconds
      while remaining > 0 && !Task.isCancelled {
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        remaining -= 1
        await MainActor.run { countdown = remaining }
      }
    }
  }
}
