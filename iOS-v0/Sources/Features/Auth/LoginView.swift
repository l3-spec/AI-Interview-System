import SwiftUI

@MainActor
final class LoginViewModel: ObservableObject {
  @Published var phone: String = ""
  @Published var code: String = ""
  @Published var isRequestingCode = false
  @Published var isLoggingIn = false
  @Published var message: String?

  func requestCode(using appState: AppState) async {
    guard !phone.isEmpty else {
      message = "请输入手机号"
      return
    }
    isRequestingCode = true
    defer { isRequestingCode = false }
    do {
      let data = try await appState.authService.requestLoginCode(phone: phone)
      message = "验证码已发送，有效期 \(data.expiresIn) 秒"
    } catch {
      message = error.localizedDescription
    }
  }

  func login(using appState: AppState) async -> LoginData? {
    guard !phone.isEmpty, !code.isEmpty else {
      message = "请输入手机号与验证码"
      return nil
    }
    isLoggingIn = true
    defer { isLoggingIn = false }
    do {
      let data = try await appState.authService.login(phone: phone, code: code)
      message = nil
      return data
    } catch {
      message = error.localizedDescription
      return nil
    }
  }
}

struct LoginView: View {
  @EnvironmentObject private var appState: AppState
  @Environment(\.dismiss) private var dismiss
  @StateObject private var viewModel = LoginViewModel()

  var onSuccess: ((LoginData) -> Void)?

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 16) {
        Text("手机号登录")
          .font(AppFont.title(22))
        Text("输入手机号并获取验证码登录系统。")
          .font(AppFont.body(14))
          .foregroundStyle(AppColor.textSecondary)

        VStack(alignment: .leading, spacing: 12) {
          TextField("手机号", text: $viewModel.phone)
#if os(iOS)
            .keyboardType(.phonePad)
            .textFieldStyle(.roundedBorder)
#endif
          HStack(spacing: 12) {
            TextField("验证码", text: $viewModel.code)
#if os(iOS)
              .textFieldStyle(.roundedBorder)
#endif
            Button(action: {
              Task { await viewModel.requestCode(using: appState) }
            }) {
              Text(viewModel.isRequestingCode ? "发送中..." : "获取验证码")
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isRequestingCode)
          }
        }

        PrimaryButton(title: "登录", isLoading: viewModel.isLoggingIn) {
          Task {
            if let data = await viewModel.login(using: appState) {
              onSuccess?(data)
              dismiss()
            }
          }
        }

        if let message = viewModel.message {
          Text(message)
            .foregroundStyle(.red)
            .font(AppFont.caption(12))
        }

        Spacer()
      }
      .padding(16)
      .navigationTitle("登录")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") { dismiss() }
        }
      }
    }
  }
}
