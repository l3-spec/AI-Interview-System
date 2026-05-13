import SwiftUI

/// 主登录页 - 对齐 Android `LoginMainScreen`
/// 顶部蓝色渐变背景 + 品牌 Logo + 两个登录入口 + 协议勾选
struct LoginMainView: View {
  @EnvironmentObject private var appState: AppState

  /// 切换到验证码登录页（携带可选预填手机号）
  var onRequestCodeLogin: (String?) -> Void
  /// 跳转到注册页
  var onRequestRegister: () -> Void
  /// 跳转到隐私 / 协议页（暂时占位）
  var onNavigatePrivacy: () -> Void = {}
  /// 设备一键登录成功回调
  var onLoginSuccess: (LoginData) -> Void

  @State private var loading = false
  @State private var error: String?
  @State private var info: String?
  @State private var agreed = false

  var body: some View {
    GeometryReader { geo in
      VStack(spacing: 0) {
        Spacer().frame(height: max(geo.safeAreaInsets.top + 90, 100))

        AuthBrandLockup()

        Spacer().frame(height: 120)

        VStack(spacing: 16) {
          AuthPrimaryButton(
            title: "授权手机号登录",
            loading: loading,
            enabled: !loading,
            action: handleAuthorizedLogin
          )

          AuthOutlineButton(title: "验证码登录") {
            onRequestCodeLogin(nil)
          }

          HStack(spacing: 8) {
            AgreementCheckbox(checked: $agreed)
            AgreementText(
              onPrivacyTap: onNavigatePrivacy,
              onAgreementTap: onNavigatePrivacy
            )
          }
          .padding(.horizontal, 4)
          .padding(.top, 4)

          if let error {
            Text(error)
              .font(.system(size: 12))
              .foregroundStyle(Color.red)
              .frame(maxWidth: .infinity)
              .multilineTextAlignment(.center)
          }
          if let info {
            Text(info)
              .font(.system(size: 12))
              .foregroundStyle(Color(hex: 0x2E7D32))
              .frame(maxWidth: .infinity)
              .multilineTextAlignment(.center)
          }

          Spacer().frame(height: 24)

          // 注册入口
          HStack(spacing: 4) {
            Text("还没有账号？")
              .font(.system(size: 12))
              .foregroundStyle(Color.white.opacity(0.85))
            Button(action: onRequestRegister) {
              Text("立即注册")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .underline()
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, 48)

        Spacer()
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .authHeroBackground()
  }

  /// iOS 平台无法直接读取手机号，这里降级为提示走验证码登录
  private func handleAuthorizedLogin() {
    if !agreed {
      error = "请阅读并同意用户协议和隐私政策"
      info = nil
      return
    }
    // iOS 不允许应用直接读取本机号码，引导走验证码登录
    error = nil
    info = "iOS 暂不支持自动获取手机号，请使用验证码登录"
    onRequestCodeLogin(nil)
  }
}
