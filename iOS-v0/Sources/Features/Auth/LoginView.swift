import SwiftUI

/// 登录流程入口 - 对齐 Android `LoginFlowScreen`
/// 内部维护一个三态机：主登录 / 验证码登录 / 注册
struct LoginView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss

  /// 登录或注册成功回调（外部可保存 token / user 并关闭 sheet）
  var onSuccess: ((LoginData) -> Void)?

  @State private var screen: AuthScreen = .main
  @State private var prefillPhone: String? = nil

  var body: some View {
    ZStack {
      switch screen {
      case .main:
        LoginMainView(
          onRequestCodeLogin: { phone in
            prefillPhone = phone
            withAnimation(.easeInOut(duration: 0.2)) { screen = .code }
          },
          onRequestRegister: {
            withAnimation(.easeInOut(duration: 0.2)) { screen = .register }
          },
          onLoginSuccess: handleSuccess
        )
        .transition(.opacity)

      case .code:
        CodeLoginView(
          initialPhone: prefillPhone,
          onLoginSuccess: handleSuccess,
          onBack: {
            prefillPhone = nil
            withAnimation(.easeInOut(duration: 0.2)) { screen = .main }
          }
        )
        .transition(.opacity)

      case .register:
        RegisterView(
          onRegisterSuccess: handleSuccess,
          onGoLogin: {
            withAnimation(.easeInOut(duration: 0.2)) { screen = .main }
          }
        )
        .transition(.opacity)
      }
    }
  }

  private func handleSuccess(_ data: LoginData) {
    onSuccess?(data)
    dismiss()
  }
}

/// 登录流程页面枚举
private enum AuthScreen {
  case main
  case code
  case register
}
