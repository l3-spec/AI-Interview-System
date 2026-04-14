import SwiftUI

/// 主题颜色 - 对齐 Android V0Theme
enum AppColor {
  /// 橙色主色调 - 对齐 Android OrangeAccent (#FF8C42)
  static let orangeAccent = Color(red: 1.00, green: 0.55, blue: 0.26) // #FF8C42
  
  /// 背景渐变
  static let backgroundGradient = LinearGradient(
    colors: [
      Color(red: 0.05, green: 0.07, blue: 0.11),
      Color(red: 0.09, green: 0.11, blue: 0.18)
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
  )

  static let surface = Color(red: 0.11, green: 0.12, blue: 0.17)
  static let card = Color(red: 0.14, green: 0.16, blue: 0.22)
  static let accent = orangeAccent
  static let accentSoft = Color(red: 1.00, green: 0.83, blue: 0.78)
  
  /// 底栏背景色（深色半透明，对齐 Android FrostedGlassBottomBar）
  static let bottomBarBackground = Color(red: 0.24, green: 0.24, blue: 0.24).opacity(0.7)
  static let bottomBarBorder = Color.white.opacity(0.08)
  
  /// 底栏选中/未选中文字颜色
  static let bottomBarSelected = Color(red: 0.93, green: 0.49, blue: 0.22) // #EC7C38
  static let bottomBarUnselected = Color(red: 0.71, green: 0.72, blue: 0.73) // #B5B7B8
  
  static let outline = Color.white.opacity(0.08)
  static let textPrimary = Color.white
  static let textSecondary = Color.white.opacity(0.76)
}

enum AppFont {
  static func title(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .rounded) }
  static func body(_ size: CGFloat) -> Font { .system(size: size, weight: .regular, design: .rounded) }
  static func caption(_ size: CGFloat) -> Font { .system(size: size, weight: .medium, design: .rounded) }
}
