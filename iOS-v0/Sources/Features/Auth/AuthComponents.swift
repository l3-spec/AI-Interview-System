import SwiftUI
#if os(iOS)
import UIKit
#endif

// MARK: - 跨平台键盘类型（macOS 下使用占位枚举，避免编译失败）
#if os(iOS)
typealias AuthKeyboardType = UIKeyboardType
#else
enum AuthKeyboardType { case `default`, numberPad, phonePad, emailAddress, asciiCapable }
#endif

// MARK: - 顶部品牌 Logo（对齐 Android AuthBrandLockup）

/// 登录/注册页头部品牌区域
struct AuthBrandLockup: View {
  var body: some View {
    VStack(spacing: 12) {
      // 品牌图标占位（圆形 + 应用名缩写）
      ZStack {
        Circle()
          .fill(LinearGradient(
            colors: [Color.white.opacity(0.95), Color.white.opacity(0.65)],
            startPoint: .top,
            endPoint: .bottom
          ))
          .frame(width: 96, height: 96)
          .shadow(color: Color.black.opacity(0.12), radius: 18, x: 0, y: 8)
        Text("AI")
          .font(.system(size: 32, weight: .bold, design: .rounded))
          .foregroundStyle(AppColor.primaryBlue)
      }
      Text("AI 面试")
        .font(.system(size: 22, weight: .semibold))
        .foregroundStyle(.white)
      Text("AI 智能面试，从这里开始")
        .font(.system(size: 12, weight: .regular))
        .foregroundStyle(Color.white.opacity(0.85))
    }
  }
}

// MARK: - 顶部蓝色渐变背景（对齐 Android starLinkHeroGradient）

/// 登录页头部渐变：品牌蓝 → 浅灰 (#00ACC3 → #EBEBEB)
extension View {
  func authHeroBackground() -> some View {
    background(
      LinearGradient(
        colors: [
          Color(hex: 0x00ACC3),
          Color(hex: 0x6FCBD5),
          Color(hex: 0xEBEBEB)
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .ignoresSafeArea()
    )
  }
}

// MARK: - 协议复选框（对齐 Android FigmaAgreementCheckbox）

struct AgreementCheckbox: View {
  @Binding var checked: Bool

  var body: some View {
    Button {
      checked.toggle()
    } label: {
      ZStack {
        RoundedRectangle(cornerRadius: 3)
          .stroke(checked ? AppColor.primaryOrange : Color.white.opacity(0.7), lineWidth: 1.5)
          .background(
            RoundedRectangle(cornerRadius: 3)
              .fill(checked ? AppColor.primaryOrange : Color.clear)
          )
          .frame(width: 14, height: 14)
        if checked {
          Image(systemName: "checkmark")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(.white)
        }
      }
    }
    .buttonStyle(.plain)
  }
}

// MARK: - 协议文字（对齐 Android FigmaAgreementText）

struct AgreementText: View {
  var onPrivacyTap: () -> Void = {}
  var onAgreementTap: () -> Void = {}

  var body: some View {
    HStack(spacing: 0) {
      Text("已阅读并同意")
        .foregroundStyle(Color(hex: 0x666666))
      Button(action: onAgreementTap) {
        Text("《用户协议》")
          .foregroundStyle(Color(hex: 0x169BD5))
      }
      .buttonStyle(.plain)
      Text("和")
        .foregroundStyle(Color(hex: 0x666666))
      Button(action: onPrivacyTap) {
        Text("《隐私政策》")
          .foregroundStyle(Color(hex: 0x169BD5))
      }
      .buttonStyle(.plain)
    }
    .font(.system(size: 12, weight: .light))
  }
}

// MARK: - 通用橙色主按钮（48 高，24 圆角）

struct AuthPrimaryButton: View {
  let title: String
  var loading: Bool = false
  var enabled: Bool = true
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      ZStack {
        RoundedRectangle(cornerRadius: 24)
          .fill(enabled ? AppColor.primaryOrange : AppColor.primaryOrange.opacity(0.4))
        if loading {
          ProgressView()
            .tint(.white)
            .scaleEffect(0.8)
        } else {
          Text(title)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.white)
        }
      }
      .frame(maxWidth: .infinity)
      .frame(height: 48)
    }
    .buttonStyle(.plain)
    .disabled(!enabled || loading)
  }
}

// MARK: - 透明描边按钮（白色边框，浅色文字 - 用于头部背景）

struct AuthOutlineButton: View {
  let title: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 14, weight: .medium))
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .frame(height: 48)
        .background(
          RoundedRectangle(cornerRadius: 24)
            .stroke(Color.white.opacity(0.5), lineWidth: 1)
        )
    }
    .buttonStyle(.plain)
  }
}

// MARK: - 认证输入框（带描边圆角）

struct AuthInputField: View {
  let placeholder: String
  @Binding var text: String
  var keyboardType: AuthKeyboardType = .default
  var isSecure: Bool = false
  var maxLength: Int? = nil
  var digitsOnly: Bool = false

  var body: some View {
    Group {
      if isSecure {
        SecureField(placeholder, text: $text)
      } else {
        TextField(placeholder, text: $text)
      }
    }
    .font(.system(size: 14, weight: .medium))
    .foregroundStyle(AppColor.textPrimary)
    #if os(iOS)
    .keyboardType(keyboardType)
    .autocapitalization(.none)
    .disableAutocorrection(true)
    #endif
    .padding(.horizontal, 16)
    .frame(height: 37)
    .background(
      RoundedRectangle(cornerRadius: 19)
        .stroke(AppColor.textTertiary, lineWidth: 1)
    )
    .modifier(SanitizeTextModifier(text: $text, digitsOnly: digitsOnly, maxLength: maxLength))
  }
}

/// 文本输入清洗 modifier（兼容 iOS 17 / macOS 13）
struct SanitizeTextModifier: ViewModifier {
  @Binding var text: String
  var digitsOnly: Bool = false
  var maxLength: Int? = nil

  func body(content: Content) -> some View {
    if #available(iOS 17.0, macOS 14.0, *) {
      content.onChange(of: text) { _, newValue in apply(newValue) }
    } else {
      content.onChange(of: text) { newValue in apply(newValue) }
    }
  }

  private func apply(_ newValue: String) {
    var sanitized = newValue
    if digitsOnly { sanitized = sanitized.filter { $0.isNumber } }
    if let max = maxLength, sanitized.count > max { sanitized = String(sanitized.prefix(max)) }
    if sanitized != newValue { text = sanitized }
  }
}
