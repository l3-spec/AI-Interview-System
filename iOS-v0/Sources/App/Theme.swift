import SwiftUI

enum AppColor {
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
  static let accent = Color(red: 1.00, green: 0.55, blue: 0.26) // #FF8C42
  static let accentSoft = Color(red: 1.00, green: 0.83, blue: 0.78)
  static let outline = Color.white.opacity(0.08)
  static let textPrimary = Color.white
  static let textSecondary = Color.white.opacity(0.76)
}

enum AppFont {
  static func title(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .rounded) }
  static func body(_ size: CGFloat) -> Font { .system(size: size, weight: .regular, design: .rounded) }
  static func caption(_ size: CGFloat) -> Font { .system(size: size, weight: .medium, design: .rounded) }
}
